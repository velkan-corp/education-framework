import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, rmdir, unlink, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join } from "node:path";
import { userInfo } from "node:os";

import { fail } from "./errors.mjs";

const LOCK_PARENT = "Library/Application Support/portfolio-credential-locks-v1";
const WORKSPACE_MARKER = "retained-workspace";

async function ensurePrivateDirectory(path) {
  try {
    let stats;
    try {
      stats = await lstat(path);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await mkdir(path, { mode: 0o700 });
      stats = await lstat(path);
    }
    if (!stats.isDirectory() || stats.isSymbolicLink() || (stats.mode & 0o077) !== 0) {
      fail("LOCK_INVALID", "The deployment lock parent is not a private real directory.");
    }
    await chmod(path, 0o700);
  } catch (error) {
    if (error?.code === "LOCK_INVALID") throw error;
    fail("LOCK_INVALID", "The deployment lock parent could not be secured.", { cause: error });
  }
}

export async function acquireDeploymentLock(manifest, dependencies = {}) {
  const home = dependencies.homeDirectory ?? userInfo().homedir;
  const makeDirectory = dependencies.mkdir ?? mkdir;
  const parent = join(home, LOCK_PARENT);
  if (makeDirectory === mkdir) await ensurePrivateDirectory(parent);
  else await dependencies.ensureParent?.(parent);
  const identity = `${manifest.provider}\0${manifest.cloudflare.accountId}\0${manifest.cloudflare.pagesProject}\0${manifest.cloudflare.pagesProjectId}\0production\0${manifest.capability}`;
  const digest = createHash("sha256").update(identity).digest("hex");
  const path = join(parent, `${digest}.lock`);
  try {
    await makeDirectory(path, { mode: 0o700 });
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail("DEPLOYMENT_LOCKED", "Another deployment for this exact capability is active or unresolved.");
    }
    fail("LOCK_INVALID", "The deployment lock could not be acquired.", { cause: error });
  }
  return Object.freeze({ path });
}

export async function releaseDeploymentLock(lock, dependencies = {}) {
  const removeDirectory = dependencies.rmdir ?? rmdir;
  if (!lock || typeof lock.path !== "string" || !lock.path.endsWith(".lock")) {
    fail("LOCK_INVALID", "Refusing to release an unrecognized deployment lock.");
  }
  try {
    const marker = join(lock.path, WORKSPACE_MARKER);
    try {
      const stats = await lstat(marker);
      if (!stats.isFile() || stats.isSymbolicLink() || (stats.mode & 0o022) !== 0) {
        fail("LOCK_RELEASE_FAILED", "The retained-workspace marker is not a safe regular file.", {
          preserveLock: true,
        });
      }
      await unlink(marker);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await removeDirectory(lock.path);
  } catch (error) {
    if (error?.code === "LOCK_RELEASE_FAILED") throw error;
    fail("LOCK_RELEASE_FAILED", "The completed deployment lock could not be removed.", {
      cause: error,
      preserveLock: true,
    });
  }
}

export async function recordDeploymentWorkspace(lock, workspacePath, dependencies = {}) {
  const write = dependencies.writeFile ?? writeFile;
  if (
    !lock || typeof lock.path !== "string" || !lock.path.endsWith(".lock") ||
    typeof workspacePath !== "string" || !isAbsolute(workspacePath) ||
    /[\0\r\n]/u.test(workspacePath) || !basename(workspacePath).startsWith("portfolio-pages-v1-")
  ) {
    fail("LOCK_INVALID", "Refusing to record an unrecognized deployment workspace.");
  }
  try {
    await write(join(lock.path, WORKSPACE_MARKER), `${workspacePath}\n`, { flag: "wx", mode: 0o600 });
  } catch (error) {
    fail("LOCK_INVALID", "The deployment workspace recovery marker could not be recorded.", {
      cause: error,
    });
  }
}
