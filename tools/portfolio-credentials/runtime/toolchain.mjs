import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdtemp,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

import { fail } from "./errors.mjs";
import { snapshotToolchain } from "./integrity.mjs";
import { NODE_EXECUTABLE, NPM_CLI } from "./platform.mjs";
import { runBounded, sanitizedLocalEnvironment } from "./process.mjs";
import { decodeUtf8 } from "./text.mjs";

const WRANGLER_VERSION = "4.128.0";
const RUNNER_PACKAGE_RELATIVE = "runtime/wrangler-package.json";
const RUNNER_LOCK_RELATIVE = "runtime/wrangler-package-lock.json";
const RUNNER_PACKAGE_SHA256 = "ae96eaefe821804e4d3c047efd6a4d3ba3563b185e5f50e893b80544e560d736";
const RUNNER_LOCK_SHA256 = "e8242a41961d4711fddc5fd6dfb4dbdb7e6b3db9844fcf67e18bdcb5c46286a5";
const PROCESS_UID = process.getuid?.();

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readTrustedInput(path, expectedDigest, label, maximumBytes) {
  let before;
  let bytes;
  let after;
  try {
    before = await lstat(path, { bigint: true });
    if (
      !before.isFile() || before.isSymbolicLink() || (Number(before.mode) & 0o022) !== 0 ||
      (PROCESS_UID !== undefined && Number(before.uid) !== PROCESS_UID)
    ) {
      fail("TOOLCHAIN_INPUT_INVALID", `${label} is not a safely owned regular file.`);
    }
    if (before.size > BigInt(maximumBytes)) {
      fail("TOOLCHAIN_INPUT_INVALID", `${label} exceeds its reviewed byte bound.`);
    }
    bytes = await readFile(path);
    after = await lstat(path, { bigint: true });
  } catch (error) {
    if (error?.code === "TOOLCHAIN_INPUT_INVALID") throw error;
    fail("TOOLCHAIN_INPUT_INVALID", `${label} could not be read.`, { cause: error });
  }
  if (
    before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size ||
    before.mode !== after.mode || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs ||
    BigInt(bytes.length) !== before.size || digest(bytes) !== expectedDigest
  ) {
    bytes.fill(0);
    fail("TOOLCHAIN_INPUT_INVALID", `${label} differs from the reviewed V1 runner input.`);
  }
  return bytes;
}

function parseJson(bytes, label) {
  let value;
  try {
    value = JSON.parse(decodeUtf8(bytes, label, bytes.length));
  } catch (error) {
    fail("TOOLCHAIN_INPUT_INVALID", `${label} is not valid JSON.`, { cause: error });
  }
  return value;
}

function validatePackage(packageJson) {
  if (
    !exactKeys(packageJson, ["name", "private", "type", "engines", "dependencies"]) ||
    packageJson.name !== "portfolio-cloudflare-pages-runner-v1" || packageJson.private !== true ||
    packageJson.type !== "module" || !exactKeys(packageJson.engines, ["node"]) ||
    packageJson.engines.node !== "24.20.0" || !exactKeys(packageJson.dependencies, ["wrangler"]) ||
    packageJson.dependencies.wrangler !== WRANGLER_VERSION
  ) {
    fail("TOOLCHAIN_INPUT_INVALID", "The runner-owned package manifest differs from the reviewed V1 shape.");
  }
}

function validIntegrity(value) {
  if (typeof value !== "string" || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(value)) return false;
  const encoded = value.slice("sha512-".length);
  const bytes = Buffer.from(encoded, "base64");
  return bytes.length === 64 && bytes.toString("base64") === encoded;
}

function validRegistryTarball(value) {
  if (typeof value !== "string") return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" && url.hostname === "registry.npmjs.org" && url.port === "" &&
    url.username === "" && url.password === "" && url.search === "" && url.hash === "" &&
    url.pathname.startsWith("/") && url.pathname.endsWith(".tgz");
}

function validateLock(lock) {
  if (
    !exactKeys(lock, ["name", "lockfileVersion", "requires", "packages"]) ||
    lock.name !== "portfolio-cloudflare-pages-runner-v1" || lock.lockfileVersion !== 3 ||
    lock.requires !== true || !isRecord(lock.packages)
  ) {
    fail("TOOLCHAIN_INPUT_INVALID", "The runner-owned package lock has an unsupported top-level shape.");
  }
  const root = lock.packages[""];
  if (
    !exactKeys(root, ["name", "dependencies", "engines"]) ||
    root.name !== lock.name || !exactKeys(root.dependencies, ["wrangler"]) ||
    root.dependencies.wrangler !== WRANGLER_VERSION || !exactKeys(root.engines, ["node"]) ||
    root.engines.node !== "24.20.0"
  ) {
    fail("TOOLCHAIN_INPUT_INVALID", "The runner-owned package lock root differs from its package manifest.");
  }
  const entries = Object.entries(lock.packages);
  if (entries.length < 2 || entries.length > 500) {
    fail("TOOLCHAIN_INPUT_INVALID", "The runner-owned package lock has an invalid package count.");
  }
  for (const [path, metadata] of entries) {
    if (path === "") continue;
    const parts = path.split("/");
    if (
      !path.startsWith("node_modules/") || path.includes("\\") || /[\0\r\n]/u.test(path) ||
      parts.some((part) => part === "" || part === "." || part === "..") || !isRecord(metadata) ||
      metadata.link === true || typeof metadata.version !== "string" ||
      !validRegistryTarball(metadata.resolved) || !validIntegrity(metadata.integrity)
    ) {
      fail(
        "TOOLCHAIN_INPUT_INVALID",
        "Every runner dependency must be an integrity-pinned HTTPS npm registry tarball.",
      );
    }
  }
}

async function assertPrivateContainedDirectory(root, path, label) {
  const rootPhysical = await realpath(root);
  const physical = await realpath(path);
  const stats = await lstat(path);
  const rel = relative(rootPhysical, physical);
  if (
    !stats.isDirectory() || stats.isSymbolicLink() || (stats.mode & 0o077) !== 0 ||
    rel === ".." || rel.startsWith(`..${sep}`)
  ) {
    fail("PRIVATE_WORKSPACE_INVALID", `${label} is not a private directory inside the deployment workspace.`);
  }
  return physical;
}

async function assertRegularBytes(path, expected, label) {
  let stats;
  let bytes;
  try {
    stats = await lstat(path);
    bytes = await readFile(path);
  } catch (error) {
    fail("TOOLCHAIN_INVALID", `${label} could not be re-read after installation.`, { cause: error });
  }
  if (!stats.isFile() || stats.isSymbolicLink() || !bytes.equals(expected)) {
    bytes?.fill(0);
    fail("TOOLCHAIN_INVALID", `${label} changed during runner-owned installation.`);
  }
  bytes.fill(0);
}

export async function readRunnerToolchain(runnerRoot, dependencies = {}) {
  const root = await realpath(runnerRoot);
  if (root !== resolve(runnerRoot)) {
    fail("TOOLCHAIN_INPUT_INVALID", "The project-owned runner root must be one exact real directory.");
  }
  const packageBytes = await readTrustedInput(
    join(root, RUNNER_PACKAGE_RELATIVE),
    dependencies.expectedPackageDigest ?? RUNNER_PACKAGE_SHA256,
    "Runner-owned Wrangler package manifest",
    8 * 1024,
  );
  let lockBytes;
  try {
    lockBytes = await readTrustedInput(
      join(root, RUNNER_LOCK_RELATIVE),
      dependencies.expectedLockDigest ?? RUNNER_LOCK_SHA256,
      "Runner-owned Wrangler package lock",
      256 * 1024,
    );
    validatePackage(parseJson(packageBytes, "Runner-owned Wrangler package manifest"));
    validateLock(parseJson(lockBytes, "Runner-owned Wrangler package lock"));
    return { packageBytes, lockBytes };
  } catch (error) {
    packageBytes.fill(0);
    lockBytes?.fill(0);
    throw error;
  }
}

export async function installRunnerToolchain(toolchain, workspaceRoot, context, dependencies = {}) {
  const run = dependencies.run ?? runBounded;
  const makeTemporary = dependencies.mkdtemp ?? mkdtemp;
  const nodeExecutable = dependencies.nodeExecutable ?? NODE_EXECUTABLE;
  const npmCli = dependencies.npmCli ?? NPM_CLI;
  let packageBytes = toolchain.packageBytes;
  let lockBytes = toolchain.lockBytes;
  try {
    const toolingRoot = await makeTemporary(join(workspaceRoot, "runner-tool-"));
    const installHome = await makeTemporary(join(workspaceRoot, "runner-install-home-"));
    await chmod(toolingRoot, 0o700);
    await chmod(installHome, 0o700);
    const toolingRootRealpath = await assertPrivateContainedDirectory(workspaceRoot, toolingRoot, "Runner tooling root");
    const installHomeRealpath = await assertPrivateContainedDirectory(workspaceRoot, installHome, "Runner install home");
    const packagePath = join(toolingRootRealpath, "package.json");
    const lockPath = join(toolingRootRealpath, "package-lock.json");
    const userConfig = join(installHomeRealpath, "user.npmrc");
    const globalConfig = join(installHomeRealpath, "global.npmrc");
    await writeFile(packagePath, packageBytes, { flag: "wx", mode: 0o600 });
    await writeFile(lockPath, lockBytes, { flag: "wx", mode: 0o600 });
    await writeFile(userConfig, "", { flag: "wx", mode: 0o600 });
    await writeFile(globalConfig, "", { flag: "wx", mode: 0o600 });

    const environment = {
      ...sanitizedLocalEnvironment(context.homeDirectory, installHomeRealpath),
      NPM_CONFIG_AUDIT: "false",
      NPM_CONFIG_FUND: "false",
      NPM_CONFIG_GLOBALCONFIG: globalConfig,
      NPM_CONFIG_IGNORE_SCRIPTS: "true",
      NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/",
      NPM_CONFIG_UPDATE_NOTIFIER: "false",
      NPM_CONFIG_USERCONFIG: userConfig,
      NPM_CONFIG_WORKSPACES: "false",
    };
    await run({
      executable: nodeExecutable,
      args: [
        npmCli,
        "ci",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--workspaces=false",
        "--registry=https://registry.npmjs.org/",
        `--userconfig=${userConfig}`,
        `--globalconfig=${globalConfig}`,
      ],
      cwd: toolingRootRealpath,
      env: environment,
      timeoutMs: context.timeoutMs,
      maxOutputBytes: 1024 * 1024,
      signal: context.signal,
    });
    await assertRegularBytes(packagePath, packageBytes, "Runner-owned package manifest");
    await assertRegularBytes(lockPath, lockBytes, "Runner-owned package lock");

    let packageRoot;
    let cli;
    try {
      packageRoot = await realpath(join(toolingRootRealpath, "node_modules/wrangler"));
      cli = await realpath(join(packageRoot, "wrangler-dist/cli.js"));
      const packageStats = await lstat(packageRoot);
      const cliStats = await lstat(cli);
      if (
        !packageStats.isDirectory() || packageStats.isSymbolicLink() || !cliStats.isFile() ||
        cliStats.isSymbolicLink()
      ) throw new Error("invalid package or CLI entry type");
    } catch (error) {
      fail("TOOLCHAIN_INVALID", "The exact runner-owned Wrangler CLI could not be resolved.", { cause: error });
    }
    const packageRel = relative(toolingRootRealpath, packageRoot);
    const cliRel = relative(packageRoot, cli);
    if (
      packageRel === ".." || packageRel.startsWith(`..${sep}`) ||
      cliRel === ".." || cliRel.startsWith(`..${sep}`)
    ) {
      fail("TOOLCHAIN_INVALID", "The runner-owned Wrangler executable resolves outside its tooling root.");
    }
    const installedBytes = await readFile(join(packageRoot, "package.json"));
    let installed;
    try {
      installed = JSON.parse(decodeUtf8(installedBytes, "Installed Wrangler package manifest", 256 * 1024));
    } catch (error) {
      fail("TOOLCHAIN_INVALID", "The installed Wrangler package manifest is invalid.", { cause: error });
    } finally {
      installedBytes.fill(0);
    }
    if (!isRecord(installed) || installed.version !== WRANGLER_VERSION) {
      fail("TOOLCHAIN_INVALID", "The installed Wrangler version differs from the reviewed V1 version.");
    }
    const integrity = await snapshotToolchain(toolingRootRealpath);
    return Object.freeze({
      toolingRoot: toolingRootRealpath,
      installHome: installHomeRealpath,
      wranglerCli: cli,
      integrity,
    });
  } finally {
    packageBytes?.fill(0);
    lockBytes?.fill(0);
    packageBytes = undefined;
    lockBytes = undefined;
  }
}
