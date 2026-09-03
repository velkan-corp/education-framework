import { constants } from "node:fs";
import { open, readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";

import { fail } from "./errors.mjs";
import { snapshotNpmRuntime } from "./integrity.mjs";

export const NODE_EXECUTABLE = "/opt/homebrew/opt/node@24/bin/node";
export const NPM_CLI = "/opt/homebrew/Cellar/node@24/24.20.0/lib/node_modules/npm/bin/npm-cli.js";
export const NPM_ROOT = "/opt/homebrew/Cellar/node@24/24.20.0/lib/node_modules/npm";
const NODE_REALPATH = "/opt/homebrew/Cellar/node@24/24.20.0/bin/node";
const NODE_VERSION = "24.20.0";
const NODE_SHA256 = "c8eedc7651a438fb7d2ceb36fd70032676c855586a36c950ba5a662f0b7853bd";
const NPM_VERSION = "11.19.0";
const PROCESS_UID = process.getuid?.();

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size &&
    left.mode === right.mode && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

async function hashReviewedNode(path, dependencies) {
  const openFile = dependencies.open ?? open;
  let handle;
  const buffer = Buffer.alloc(64 * 1024);
  try {
    handle = await openFile(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat({ bigint: true });
    if (
      !before.isFile() || (Number(before.mode) & 0o022) !== 0 ||
      (PROCESS_UID !== undefined && Number(before.uid) !== PROCESS_UID)
    ) {
      fail("RUNTIME_UNSUPPORTED", "The reviewed Node.js executable has unsafe metadata.");
    }
    const hash = createHash("sha256");
    let position = 0n;
    while (position < before.size) {
      const remaining = before.size - position;
      const requested = Number(remaining > BigInt(buffer.length) ? BigInt(buffer.length) : remaining);
      const { bytesRead } = await handle.read(buffer, 0, requested, Number(position));
      if (bytesRead <= 0) fail("RUNTIME_UNSUPPORTED", "The reviewed Node.js executable ended unexpectedly.");
      hash.update(buffer.subarray(0, bytesRead));
      buffer.fill(0, 0, bytesRead);
      position += BigInt(bytesRead);
    }
    const after = await handle.stat({ bigint: true });
    if (!sameIdentity(before, after) || hash.digest("hex") !== NODE_SHA256) {
      fail("RUNTIME_UNSUPPORTED", "The reviewed Node.js executable identity or bytes changed.");
    }
  } catch (error) {
    if (error?.code === "RUNTIME_UNSUPPORTED") throw error;
    fail("RUNTIME_UNSUPPORTED", "The reviewed Node.js runtime could not be read safely.", { cause: error });
  } finally {
    buffer.fill(0);
    await handle?.close();
  }
}

export async function verifyRuntime(dependencies = {}) {
  const runtimeProcess = dependencies.process ?? process;
  const resolveRealpath = dependencies.realpath ?? realpath;
  let invoked;
  let reviewed;
  let npmCli;
  try {
    invoked = await resolveRealpath(runtimeProcess.execPath);
    reviewed = await resolveRealpath(NODE_EXECUTABLE);
    npmCli = await resolveRealpath(NPM_CLI);
  } catch (error) {
    fail("RUNTIME_UNSUPPORTED", "The reviewed Node.js and npm runtime paths could not be resolved.", { cause: error });
  }
  if (
    runtimeProcess.platform !== "darwin" || runtimeProcess.arch !== "arm64" ||
    runtimeProcess.versions?.node !== NODE_VERSION || invoked !== NODE_REALPATH ||
    reviewed !== NODE_REALPATH || npmCli !== NPM_CLI
  ) {
    fail("RUNTIME_UNSUPPORTED", "V1 requires its exact supported macOS arm64 Node.js 24.20.0 runtime.");
  }
  await hashReviewedNode(reviewed, dependencies);
}

function sameSnapshot(left, right) {
  return left.root === right.root && left.digest === right.digest &&
    left.fileCount === right.fileCount && left.totalBytes === right.totalBytes;
}

export async function snapshotBuildPlatform(dependencies = {}) {
  const verifyNode = dependencies.verifyRuntime ?? verifyRuntime;
  const snapshotNpm = dependencies.snapshotNpmRuntime ?? snapshotNpmRuntime;
  const npmRoot = dependencies.npmRoot ?? NPM_ROOT;
  const read = dependencies.readFile ?? readFile;
  await verifyNode(dependencies);
  let packageJson;
  try {
    packageJson = JSON.parse(await read(`${npmRoot}/package.json`, "utf8"));
  } catch (error) {
    fail("RUNTIME_UNSUPPORTED", "The reviewed npm package manifest could not be read.", { cause: error });
  }
  if (packageJson?.version !== NPM_VERSION) {
    fail("RUNTIME_UNSUPPORTED", "V1 requires exact npm 11.19.0 from its reviewed Node.js keg.");
  }
  return Object.freeze({ npm: await snapshotNpm(npmRoot) });
}

export async function verifyBuildPlatform(expected, dependencies = {}) {
  const verifyNode = dependencies.verifyRuntime ?? verifyRuntime;
  const snapshotNpm = dependencies.snapshotNpmRuntime ?? snapshotNpmRuntime;
  await verifyNode(dependencies);
  const npm = await snapshotNpm(dependencies.npmRoot ?? NPM_ROOT);
  if (!expected || !sameSnapshot(expected.npm, npm)) {
    fail("RUNTIME_UNSUPPORTED", "The reviewed npm runtime changed while application code executed.");
  }
}
