import { realpath } from "node:fs/promises";

import { RunnerError, fail } from "./errors.mjs";
import { runBounded, sanitizedLocalEnvironment } from "./process.mjs";
import { decodeUtf8 } from "./text.mjs";

const GIT = "/usr/bin/git";
const GIT_OUTPUT_LIMIT = 256 * 1024;
const COMMIT = /^[a-f0-9]{40}$/u;

function oneLine(output, label) {
  if (!Buffer.isBuffer(output) || output.length === 0) {
    fail("SOURCE_STATE_INVALID", `${label} returned no bounded result.`);
  }
  const text = decodeUtf8(output, label, GIT_OUTPUT_LIMIT).trim();
  if (!text || /[\0\r\n]/u.test(text)) {
    fail("SOURCE_STATE_INVALID", `${label} returned an ambiguous result.`);
  }
  return text;
}

function command(run, repoRoot, env, timeoutMs, args, signal, acceptedExitCodes) {
  return run({
    executable: GIT,
    args,
    cwd: repoRoot,
    env,
    timeoutMs,
    maxOutputBytes: GIT_OUTPUT_LIMIT,
    signal,
    ...(acceptedExitCodes === undefined ? {} : { acceptedExitCodes }),
  });
}

function rethrowProcessControl(error) {
  if (error instanceof RunnerError && (error.preserveLock || error.code === "PROCESS_CANCELLED")) {
    throw error;
  }
}

export async function verifyRepository(manifest, repoRoot, dependencies = {}) {
  const run = dependencies.run ?? runBounded;
  const resolveRealpath = dependencies.realpath ?? realpath;
  const timeoutMs = manifest.limits.commandTimeoutSeconds * 1000;
  const signal = dependencies.signal;
  const env = sanitizedLocalEnvironment(dependencies.homeDirectory ?? process.env.HOME ?? "/");
  let canonicalRoot;
  try {
    canonicalRoot = await resolveRealpath(repoRoot);
  } catch (error) {
    fail("SOURCE_STATE_INVALID", "The repository root could not be resolved.", { cause: error });
  }

  let topLevel;
  let remoteUrl;
  let branch;
  let status;
  let head;
  let trackingHead;
  let remoteHead;
  try {
    topLevel = oneLine((await command(run, canonicalRoot, env, timeoutMs, ["rev-parse", "--show-toplevel"], signal)).stdout, "git root");
    remoteUrl = oneLine((await command(run, canonicalRoot, env, timeoutMs, ["remote", "get-url", "origin"], signal)).stdout, "git remote");
    branch = oneLine((await command(run, canonicalRoot, env, timeoutMs, ["branch", "--show-current"], signal)).stdout, "git branch");
    status = (await command(run, canonicalRoot, env, timeoutMs, ["status", "--porcelain=v1", "--untracked-files=all"], signal)).stdout;
    head = oneLine((await command(run, canonicalRoot, env, timeoutMs, ["rev-parse", "--verify", "HEAD"], signal)).stdout, "git HEAD");
    trackingHead = oneLine((await command(
      run,
      canonicalRoot,
      env,
      timeoutMs,
      ["rev-parse", "--verify", "refs/remotes/origin/main"],
      signal,
    )).stdout, "git origin/main");
    remoteHead = oneLine((await command(
      run,
      canonicalRoot,
      env,
      timeoutMs,
      ["ls-remote", "--exit-code", "origin", "refs/heads/main"],
      signal,
    )).stdout, "remote main").split(/\s+/u)[0];
  } catch (error) {
    rethrowProcessControl(error);
    fail("SOURCE_STATE_INVALID", "The repository or its live main branch could not be verified.", { cause: error });
  }

  if (await resolveRealpath(topLevel) !== canonicalRoot) {
    fail("SOURCE_TARGET_MISMATCH", "The runner is not executing from its owning repository.");
  }
  if (remoteUrl !== manifest.repository.remoteUrl) {
    fail("SOURCE_TARGET_MISMATCH", "The repository remote differs from the reviewed manifest.");
  }
  if (branch !== "main") fail("SOURCE_STATE_INVALID", "Deployment requires branch main.");
  if (status.length !== 0) fail("SOURCE_STATE_INVALID", "Deployment requires a clean working tree.");
  if (![head, trackingHead, remoteHead].every((value) => COMMIT.test(value))) {
    fail("SOURCE_STATE_INVALID", "Repository commit evidence is malformed.");
  }
  if (head !== trackingHead || head !== remoteHead) {
    fail("SOURCE_STATE_INVALID", "HEAD, origin/main, and the live remote main branch must be identical.");
  }
  return Object.freeze({ repoRoot: canonicalRoot, head, remoteUrl });
}

export async function verifyRepositoryUnchanged(manifest, snapshot, dependencies = {}) {
  const run = dependencies.run ?? runBounded;
  const env = sanitizedLocalEnvironment(dependencies.homeDirectory ?? process.env.HOME ?? "/");
  const timeoutMs = manifest.limits.commandTimeoutSeconds * 1000;
  const signal = dependencies.signal;
  try {
    const status = (await command(
      run,
      snapshot.repoRoot,
      env,
      timeoutMs,
      ["status", "--porcelain=v1", "--untracked-files=all"],
      signal,
    )).stdout;
    const branch = oneLine((await command(run, snapshot.repoRoot, env, timeoutMs, ["branch", "--show-current"], signal)).stdout, "git branch");
    const head = oneLine((await command(run, snapshot.repoRoot, env, timeoutMs, ["rev-parse", "--verify", "HEAD"], signal)).stdout, "git HEAD");
    const tracking = oneLine((await command(
      run,
      snapshot.repoRoot,
      env,
      timeoutMs,
      ["rev-parse", "--verify", "refs/remotes/origin/main"],
      signal,
    )).stdout, "git origin/main");
    const remoteUrl = oneLine((await command(run, snapshot.repoRoot, env, timeoutMs, ["remote", "get-url", "origin"], signal)).stdout, "git remote");
    const remoteHead = oneLine((await command(
      run,
      snapshot.repoRoot,
      env,
      timeoutMs,
      ["ls-remote", "--exit-code", "origin", "refs/heads/main"],
      signal,
    )).stdout, "remote main").split(/\s+/u)[0];
    if (
      status.length !== 0 || branch !== "main" || head !== snapshot.head || tracking !== snapshot.head ||
      remoteHead !== snapshot.head || remoteUrl !== snapshot.remoteUrl || !COMMIT.test(remoteHead)
    ) {
      fail("SOURCE_CHANGED", "Repository state changed after credential-safe preflight.");
    }
  } catch (error) {
    if (error?.code === "SOURCE_CHANGED") throw error;
    rethrowProcessControl(error);
    fail("SOURCE_CHANGED", "Repository state could not be rebound after credential-safe preflight.", { cause: error });
  }
}
