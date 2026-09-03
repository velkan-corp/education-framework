import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { RunnerError, fail } from "./errors.mjs";
import { snapshotArtifact, snapshotControlHome } from "./integrity.mjs";
import {
  NODE_EXECUTABLE,
  NPM_CLI,
  snapshotBuildPlatform,
  verifyBuildPlatform,
} from "./platform.mjs";
import { runBounded, sanitizedLocalEnvironment } from "./process.mjs";
import { installRunnerToolchain, readRunnerToolchain } from "./toolchain.mjs";

const GIT = "/usr/bin/git";
const TAR = "/usr/bin/tar";
const PRIVATE_PREFIX = "portfolio-pages-v1-";
const INSTALL_DIRECTORY = "tools/portfolio-credentials";
const RUNNER_ROOT = fileURLToPath(new URL("../", import.meta.url));

function contained(root, candidate, label) {
  const absolute = resolve(root, candidate);
  const rel = relative(root, absolute);
  if (rel === ".." || rel.startsWith(`..${sep}`) || rel.includes("\0")) {
    fail("ARCHIVE_INVALID", `${label} escapes the private archived repository.`);
  }
  return absolute;
}

function forbiddenSelectedRoot(relativePath) {
  const parts = relativePath.split(sep).filter(Boolean).map((part) => part.toLowerCase());
  const runnerParts = INSTALL_DIRECTORY.split("/");
  return parts.some((part) =>
    part === ".git" || part === ".wrangler" || part === "functions" ||
    part === "node_modules" || part === "_worker.js" || part === ".env" ||
    part.startsWith(".env.") || part === ".dev.vars" || part.startsWith(".dev.vars.")) ||
    parts.some((part, index) =>
      part === runnerParts[0] && parts[index + 1] === runnerParts[1]);
}

async function verifyPackageLock(sourceRoot) {
  try {
    const stats = await lstat(join(sourceRoot, "package-lock.json"));
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("not a regular lockfile");
  } catch (error) {
    fail("DEPENDENCY_INVALID", "The committed npm package-lock.json is missing or invalid.", {
      cause: error,
    });
  }
}

async function extractArchive(archivePath, destination, run, context) {
  await mkdir(destination, { mode: 0o700 });
  await run({
    executable: TAR,
    args: ["-xf", archivePath, "-C", destination],
    cwd: context.repoRoot,
    env: context.env,
    timeoutMs: context.timeoutMs,
    maxOutputBytes: 64 * 1024,
    signal: context.signal,
  });
}

function throwIfCancelled(signal) {
  if (signal?.aborted === true) fail("PROCESS_CANCELLED", "Artifact preparation was cancelled.");
}

async function assertStaticSourceBoundary(sourceRoot) {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    if (
      name === "functions" || name === "wrangler.toml" ||
      name === "wrangler.json" || name === "wrangler.jsonc" ||
      name === ".env" || name.startsWith(".env.") ||
      name === ".dev.vars" || name.startsWith(".dev.vars.")
    ) {
      fail(
        "ARTIFACT_INVALID",
        "The archived source contains configuration or code outside static Pages Direct Upload V1.",
      );
    }
  }
}

async function assertArchivedSourceSafe(root) {
  const walk = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) fail("ARCHIVE_INVALID", "The committed source archive contains a symbolic link.");
      if (stats.isDirectory()) await walk(path);
      else if (!stats.isFile()) fail("ARCHIVE_INVALID", "The committed source archive contains a non-regular entry.");
    }
  };
  await walk(root);
}

async function existingContainedDirectory(root, candidate, label) {
  const lexical = contained(root, candidate, label);
  let physical;
  let stats;
  try {
    physical = await realpath(lexical);
    stats = await lstat(lexical);
  } catch (error) {
    fail("ARCHIVE_INVALID", `${label} is unavailable.`, { cause: error });
  }
  const rel = relative(root, physical);
  if (!stats.isDirectory() || stats.isSymbolicLink() || rel === ".." || rel.startsWith(`..${sep}`)) {
    fail("ARCHIVE_INVALID", `${label} resolves outside the private archived repository.`);
  }
  return physical;
}

async function assertPrivateDirectory(path) {
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink() || (stats.mode & 0o077) !== 0) {
    fail("PRIVATE_WORKSPACE_INVALID", "The deployment workspace is not a private real directory.");
  }
}

async function assertExactPrivateDirectory(path, expectedRealpath) {
  await assertPrivateDirectory(path);
  if (await realpath(path) !== expectedRealpath) {
    fail("PRIVATE_WORKSPACE_INVALID", "The deployment workspace identity changed during preparation.");
  }
}

function sameSnapshot(left, right) {
  return left.root === right.root && left.digest === right.digest &&
    left.fileCount === right.fileCount && left.totalBytes === right.totalBytes;
}

function wipeToolchainInput(toolchain) {
  toolchain?.packageBytes?.fill(0);
  toolchain?.lockBytes?.fill(0);
}

export async function prepareArtifact(manifest, snapshot, dependencies = {}) {
  const run = dependencies.run ?? runBounded;
  const makeTemporary = dependencies.mkdtemp ?? mkdtemp;
  const systemTemporaryDirectory = dependencies.tmpdir ?? tmpdir;
  const home = dependencies.homeDirectory ?? userInfo().homedir;
  const cleanup = dependencies.cleanupArtifact ?? cleanupArtifact;
  const setMode = dependencies.chmod ?? chmod;
  const readToolchain = dependencies.readRunnerToolchain ?? readRunnerToolchain;
  const installToolchain = dependencies.installRunnerToolchain ?? installRunnerToolchain;
  const snapshotPlatform = dependencies.snapshotBuildPlatform ?? snapshotBuildPlatform;
  const verifyPlatform = dependencies.verifyBuildPlatform ?? verifyBuildPlatform;
  let root;
  let temporaryParent;
  let toolchainInput;
  try {
    // Capture committed runner inputs and the package-manager runtime before any application
    // lifecycle or build code executes.
    const platform = await snapshotPlatform(dependencies);
    toolchainInput = await readToolchain(dependencies.runnerRoot ?? RUNNER_ROOT);
    root = await makeTemporary(join(systemTemporaryDirectory(), PRIVATE_PREFIX));
    temporaryParent = resolve(root, "..");
    await setMode(root, 0o700);
    await assertPrivateDirectory(root);
    root = await realpath(root);
    temporaryParent = resolve(root, "..");
    await dependencies.recordWorkspace?.(root);

    const buildHome = join(root, "build-home");
    const sourceRoot = join(root, "source");
    const committedArtifact = join(root, "committed-artifact");
    const archivePath = join(root, "source.tar");
    const buildEnvironment = sanitizedLocalEnvironment(home, buildHome);
    const timeoutMs = manifest.limits.commandTimeoutSeconds * 1000;
    const context = { repoRoot: snapshot.repoRoot, env: buildEnvironment, timeoutMs, signal: dependencies.signal };
    await mkdir(buildHome, { mode: 0o700 });
    throwIfCancelled(dependencies.signal);

    let artifactRoot;
    if (manifest.build.mode === "command") {
      await mkdir(sourceRoot, { mode: 0o700 });
      await run({
        executable: GIT,
        args: ["checkout-index", "--all", `--prefix=${sourceRoot}/`],
        cwd: snapshot.repoRoot,
        env: buildEnvironment,
        timeoutMs,
        maxOutputBytes: 64 * 1024,
        signal: dependencies.signal,
      });
      await assertArchivedSourceSafe(sourceRoot);
      const sourceRootIdentity = await realpath(sourceRoot);
      await assertStaticSourceBoundary(sourceRoot);
      await verifyPackageLock(sourceRoot);
      const buildCwd = await existingContainedDirectory(sourceRoot, ".", "Application build working directory");
      await run({
        executable: NODE_EXECUTABLE,
        args: [NPM_CLI, "ci", "--no-audit", "--no-fund"],
        cwd: buildCwd,
        env: buildEnvironment,
        timeoutMs,
        maxOutputBytes: 1024 * 1024,
        signal: dependencies.signal,
      });
      await assertStaticSourceBoundary(sourceRoot);
      await run({
        executable: NODE_EXECUTABLE,
        args: [NPM_CLI, "run", "build:cloudflare"],
        cwd: buildCwd,
        env: buildEnvironment,
        timeoutMs,
        maxOutputBytes: 1024 * 1024,
        signal: dependencies.signal,
      });
      await assertExactPrivateDirectory(sourceRoot, sourceRootIdentity);
      await assertStaticSourceBoundary(sourceRoot);
      artifactRoot = contained(sourceRoot, manifest.build.outputDirectory, "Build output directory");
    } else {
      await run({
        executable: GIT,
        args: ["archive", "--format=tar", `--output=${archivePath}`, snapshot.head],
        cwd: snapshot.repoRoot,
        env: buildEnvironment,
        timeoutMs,
        maxOutputBytes: 64 * 1024,
        signal: dependencies.signal,
      });
      await extractArchive(archivePath, committedArtifact, run, context);
      await unlink(archivePath);
      artifactRoot = committedArtifact;
    }
    throwIfCancelled(dependencies.signal);

    let selectedStats;
    let artifactRealpath;
    try {
      selectedStats = await lstat(artifactRoot);
      artifactRealpath = await realpath(artifactRoot);
    } catch (error) {
      fail("ARTIFACT_INVALID", "The selected build artifact is unavailable.", { cause: error });
    }
    if (!selectedStats.isDirectory() || selectedStats.isSymbolicLink()) {
      fail("ARTIFACT_INVALID", "The selected build artifact must be a real directory, not a link.");
    }
    const allowedRoot = await realpath(manifest.build.mode === "command" ? sourceRoot : committedArtifact);
    const artifactRelative = relative(allowedRoot, artifactRealpath);
    if (artifactRelative === ".." || artifactRelative.startsWith(`..${sep}`)) {
      fail("ARTIFACT_INVALID", "The build output resolves outside its exact archived source boundary.");
    }
    if (forbiddenSelectedRoot(artifactRelative)) {
      fail("ARTIFACT_INVALID", "The build output selects a forbidden physical source path.");
    }
    const beforeInstallArtifact = await snapshotArtifact(artifactRealpath, manifest);
    await verifyPlatform(platform, dependencies);

    // This root is created after application code exits. Scripts are disabled and only the
    // runner-captured lock controls the credential-bearing Wrangler installation.
    const installedToolchain = await installToolchain(
      toolchainInput,
      root,
      { homeDirectory: home, timeoutMs, signal: dependencies.signal },
      { ...dependencies, run, mkdtemp: makeTemporary },
    );
    toolchainInput = undefined;
    const artifact = await snapshotArtifact(artifactRealpath, manifest);
    if (!sameSnapshot(beforeInstallArtifact, artifact)) {
      fail("WORKSPACE_INTEGRITY_DRIFT", "The deployment artifact changed during runner tool installation.");
    }

    await assertExactPrivateDirectory(root, root);
    const wranglerHome = await makeTemporary(join(root, "wrangler-home-"));
    await setMode(wranglerHome, 0o700);
    await assertPrivateDirectory(wranglerHome);
    const wranglerHomeRealpath = await realpath(wranglerHome);
    const homeRelative = relative(root, wranglerHomeRealpath);
    if (homeRelative === ".." || homeRelative.startsWith(`..${sep}`)) {
      fail("PRIVATE_WORKSPACE_INVALID", "The Wrangler home resolves outside the private workspace.");
    }
    if ((await readdir(wranglerHomeRealpath)).length !== 0) {
      fail("PRIVATE_WORKSPACE_INVALID", "The freshly created Wrangler home is not empty.");
    }
    const emptyEnvironmentFile = join(wranglerHomeRealpath, "wrangler.empty.env");
    const configurationSentinel = join(wranglerHomeRealpath, "wrangler.json");
    await writeFile(configurationSentinel, "{}\n", { mode: 0o600, flag: "wx" });
    await setMode(configurationSentinel, 0o600);
    await writeFile(emptyEnvironmentFile, "", { mode: 0o600, flag: "wx" });
    await setMode(emptyEnvironmentFile, 0o600);
    const controlHome = await snapshotControlHome(wranglerHomeRealpath);
    throwIfCancelled(dependencies.signal);
    return {
      root,
      temporaryParent,
      buildHome,
      sourceRoot: manifest.build.mode === "command" ? sourceRoot : undefined,
      toolingRoot: installedToolchain.toolingRoot,
      toolingHome: installedToolchain.installHome,
      temporaryHome: wranglerHomeRealpath,
      emptyEnvironmentFile,
      configurationSentinel,
      artifactRoot: artifactRealpath,
      wranglerCli: installedToolchain.wranglerCli,
      environment: sanitizedLocalEnvironment(home, wranglerHomeRealpath),
      inventory: Object.freeze({ fileCount: artifact.fileCount, totalBytes: artifact.totalBytes }),
      integrity: Object.freeze({ artifact, toolchain: installedToolchain.integrity, controlHome }),
    };
  } catch (error) {
    wipeToolchainInput(toolchainInput);
    if (error instanceof RunnerError && error.preserveLock) throw error;
    try {
      await cleanup({ root, temporaryParent });
    } catch (cleanupError) {
      fail(
        "CLEANUP_UNCERTAIN",
        "The private deployment workspace could not be proven removed; the lock was retained.",
        { cause: cleanupError, preserveLock: true },
      );
    }
    throw error;
  }
}

export async function cleanupArtifact(workspace) {
  if (!workspace || typeof workspace.root !== "string") return;
  const parent = resolve(workspace.temporaryParent ?? tmpdir());
  const candidate = resolve(workspace.root);
  if (
    relative(parent, candidate).startsWith(`..${sep}`) ||
    !candidate.startsWith(join(parent, PRIVATE_PREFIX))
  ) {
    fail("PRIVATE_WORKSPACE_INVALID", "Refusing to remove an unrecognized deployment workspace.");
  }
  await rm(candidate, { recursive: true, force: true, maxRetries: 2 });
}
