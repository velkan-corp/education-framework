import { constants, lstat, open, readlink, readdir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { relative, resolve, sep } from "node:path";

import { fail } from "./errors.mjs";

const HASH_ALGORITHM = "sha256";
const READ_CHUNK_BYTES = 64 * 1024;
const TOOLCHAIN_MAX_FILES = 10_000;
const TOOLCHAIN_MAX_FILE_BYTES = 256 * 1024 * 1024;
const TOOLCHAIN_MAX_TOTAL_BYTES = 1024 * 1024 * 1024;
const FORBIDDEN_ARTIFACT_PARTS = new Set([".git", ".wrangler", "functions", "node_modules"]);
const PROCESS_UID = process.getuid?.();

function forbiddenArtifactName(name) {
  const normalized = name.toLowerCase();
  return FORBIDDEN_ARTIFACT_PARTS.has(normalized) || normalized === "_worker.js" ||
    normalized === "wrangler.toml" || normalized === "wrangler.json" ||
    normalized === "wrangler.jsonc" ||
    normalized === ".env" || normalized.startsWith(".env.") ||
    normalized === ".dev.vars" || normalized.startsWith(".dev.vars.");
}

function hashField(hash, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  const length = Buffer.alloc(8);
  length.writeBigUInt64BE(BigInt(bytes.length));
  hash.update(length);
  hash.update(bytes);
  length.fill(0);
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size &&
    left.mode === right.mode && left.uid === right.uid && left.gid === right.gid &&
    left.nlink === right.nlink && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

function assertContained(root, candidate, code, message) {
  const rel = relative(root, candidate);
  if (rel === ".." || rel.startsWith(`..${sep}`) || rel.includes("\0")) fail(code, message);
  return rel;
}

async function hashStableFile(path, firstStats, hash, code) {
  let handle;
  const buffer = Buffer.alloc(READ_CHUNK_BYTES);
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || !sameIdentity(firstStats, opened)) {
      fail(code, "A snapshotted file changed identity while it was being opened.");
    }
    let position = 0;
    while (position < Number(opened.size)) {
      const requested = Math.min(buffer.length, Number(opened.size) - position);
      const { bytesRead } = await handle.read(buffer, 0, requested, position);
      if (bytesRead <= 0) fail(code, "A snapshotted file ended before its declared size.");
      hash.update(buffer.subarray(0, bytesRead));
      buffer.fill(0, 0, bytesRead);
      position += bytesRead;
    }
    const final = await handle.stat({ bigint: true });
    if (!sameIdentity(opened, final)) {
      fail(code, "A snapshotted file changed while its bytes were being read.");
    }
  } catch (error) {
    if (error?.code === code) throw error;
    fail(code, "A snapshotted file could not be read through a stable real-file handle.", { cause: error });
  } finally {
    buffer.fill(0);
    await handle?.close();
  }
}

async function snapshotTree(root, options) {
  const code = options.code;
  let rootPath;
  let rootStats;
  try {
    rootPath = await realpath(root);
    rootStats = await lstat(root, { bigint: true });
  } catch (error) {
    fail(code, `${options.label} root is unavailable.`, { cause: error });
  }
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    fail(code, `${options.label} root must be one exact real directory.`);
  }
  if (
    options.safeMetadata && (
      (Number(rootStats.mode) & 0o022) !== 0 ||
      (PROCESS_UID !== undefined && Number(rootStats.uid) !== PROCESS_UID)
    )
  ) {
    fail(code, `${options.label} root has unsafe ownership or write metadata.`);
  }

  const hash = createHash(HASH_ALGORITHM);
  hashField(hash, `portfolio-tree-v1:${options.kind}`);
  hashField(hash, Number(rootStats.mode) & 0o7777);
  let fileCount = 0;
  let totalBytes = 0;
  const regularRealpaths = new Set();
  const symlinkTargets = [];

  const walk = async (directory) => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      fail(code, `${options.label} could not be enumerated.`, { cause: error });
    }
    entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const path = `${directory}${sep}${entry.name}`;
      const rel = relative(rootPath, path);
      if (!rel || /[\0\r\n]/u.test(rel)) fail(code, `${options.label} contains an unsafe path.`);
      const parts = rel.split(sep);
      options.validateParts?.(parts);
      let stats;
      try {
        stats = await lstat(path, { bigint: true });
      } catch (error) {
        fail(code, `${options.label} changed while it was being enumerated.`, { cause: error });
      }
      if (stats.isDirectory()) {
        if (
          options.safeMetadata && (
            (Number(stats.mode) & 0o022) !== 0 ||
            (PROCESS_UID !== undefined && Number(stats.uid) !== PROCESS_UID)
          )
        ) {
          fail(code, `${options.label} contains a directory with unsafe ownership or write metadata.`);
        }
        hashField(hash, "directory");
        hashField(hash, rel);
        hashField(hash, Number(stats.mode) & 0o7777);
        await walk(path);
        continue;
      }
      if (stats.isSymbolicLink()) {
        if (!options.allowFileSymlinks) fail(code, `${options.label} contains a symbolic link.`);
        let link;
        let target;
        let targetStats;
        try {
          link = await readlink(path);
          target = await realpath(path);
          targetStats = await lstat(target, { bigint: true });
        } catch (error) {
          fail(code, `${options.label} contains an invalid symbolic link.`, { cause: error });
        }
        assertContained(rootPath, target, code, `${options.label} contains a symbolic link outside its root.`);
        if (!targetStats.isFile() || targetStats.isSymbolicLink()) {
          fail(code, `${options.label} symbolic links may target only contained regular files.`);
        }
        hashField(hash, "symlink");
        hashField(hash, rel);
        hashField(hash, link);
        symlinkTargets.push(target);
        continue;
      }
      if (!stats.isFile()) fail(code, `${options.label} contains a non-regular entry.`);
      if (stats.nlink !== 1n) fail(code, `${options.label} contains a multiply linked file.`);
      if (
        options.safeMetadata && (
          (Number(stats.mode) & 0o022) !== 0 ||
          (PROCESS_UID !== undefined && Number(stats.uid) !== PROCESS_UID)
        )
      ) {
        fail(code, `${options.label} contains a file with unsafe ownership or write metadata.`);
      }
      const size = Number(stats.size);
      if (!Number.isSafeInteger(size) || size < 0 || size > options.maxFileBytes) {
        fail(code, `${options.label} contains a file outside its size bound.`);
      }
      fileCount += 1;
      totalBytes += size;
      if (fileCount > options.maxFiles || totalBytes > options.maxTotalBytes) {
        fail(code, `${options.label} exceeds its aggregate bounds.`);
      }
      hashField(hash, "file");
      hashField(hash, rel);
      hashField(hash, Number(stats.mode) & 0o7777);
      hashField(hash, size);
      await hashStableFile(path, stats, hash, code);
      regularRealpaths.add(await realpath(path));
    }
  };

  await walk(rootPath);
  if (fileCount === 0) fail(code, `${options.label} is empty.`);
  if (symlinkTargets.some((target) => !regularRealpaths.has(target))) {
    fail(code, `${options.label} contains a symbolic link to an unenumerated file.`);
  }
  return Object.freeze({
    root: rootPath,
    digest: hash.digest("hex"),
    fileCount,
    totalBytes,
  });
}

export async function snapshotArtifact(root, manifest) {
  return await snapshotTree(root, {
    kind: "artifact",
    label: "The static deployment artifact",
    code: "ARTIFACT_INVALID",
    allowFileSymlinks: false,
    safeMetadata: false,
    maxFiles: manifest.limits.maxArtifactFiles,
    maxFileBytes: manifest.limits.maxArtifactFileBytes,
    maxTotalBytes: manifest.limits.maxArtifactTotalBytes,
    validateParts(parts) {
      const normalized = parts.map((part) => part.toLowerCase());
      const runnerIndex = normalized.findIndex(
        (part, index) => part === "tools" && normalized[index + 1] === "portfolio-credentials",
      );
      if (parts.some((part) => forbiddenArtifactName(part)) || runnerIndex !== -1) {
        fail("ARTIFACT_INVALID", "The build artifact contains a forbidden private, executable, or dependency path.");
      }
    },
  });
}

export async function snapshotToolchain(root) {
  return await snapshotTree(root, {
    kind: "toolchain",
    label: "The runner-owned Wrangler toolchain",
    code: "TOOLCHAIN_INVALID",
    allowFileSymlinks: true,
    safeMetadata: true,
    maxFiles: TOOLCHAIN_MAX_FILES,
    maxFileBytes: TOOLCHAIN_MAX_FILE_BYTES,
    maxTotalBytes: TOOLCHAIN_MAX_TOTAL_BYTES,
  });
}

export async function snapshotNpmRuntime(root) {
  return await snapshotTree(root, {
    kind: "npm-runtime",
    label: "The reviewed npm runtime",
    code: "RUNTIME_UNSUPPORTED",
    allowFileSymlinks: true,
    safeMetadata: true,
    maxFiles: TOOLCHAIN_MAX_FILES,
    maxFileBytes: TOOLCHAIN_MAX_FILE_BYTES,
    maxTotalBytes: TOOLCHAIN_MAX_TOTAL_BYTES,
  });
}

export async function snapshotControlHome(root) {
  return await snapshotTree(root, {
    kind: "control-home",
    label: "The credential subprocess control home",
    code: "PRIVATE_WORKSPACE_INVALID",
    allowFileSymlinks: false,
    safeMetadata: true,
    maxFiles: 2,
    maxFileBytes: 1024,
    maxTotalBytes: 2048,
  });
}

function sameSnapshot(expected, actual) {
  return expected.root === actual.root && expected.digest === actual.digest &&
    expected.fileCount === actual.fileCount && expected.totalBytes === actual.totalBytes;
}

export async function verifyWorkspaceIntegrity(workspace, manifest) {
  const artifact = await snapshotArtifact(workspace.artifactRoot, manifest);
  const toolchain = await snapshotToolchain(workspace.toolingRoot);
  const controlHome = await snapshotControlHome(workspace.temporaryHome);
  if (
    !sameSnapshot(workspace.integrity.artifact, artifact) ||
    !sameSnapshot(workspace.integrity.toolchain, toolchain) ||
    !sameSnapshot(workspace.integrity.controlHome, controlHome)
  ) {
    fail("WORKSPACE_INTEGRITY_DRIFT", "Prepared artifact or credential tooling bytes changed before deployment.");
  }
}
