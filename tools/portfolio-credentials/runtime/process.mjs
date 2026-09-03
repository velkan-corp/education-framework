import { spawn } from "node:child_process";

import { RunnerError, fail } from "./errors.mjs";

const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024;
const TERMINATION_GRACE_MS = 2_000;

function assertInvocation(executable, args) {
  if (typeof executable !== "string" || !executable.startsWith("/")) {
    fail("PROCESS_CONFIGURATION", "A fixed absolute executable is required.");
  }
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== "string" || argument.includes("\0"))) {
    fail("PROCESS_CONFIGURATION", "The fixed process arguments are invalid.");
  }
}

function signalProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function processGroupExists(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    return true;
  }
}

export async function runBounded(invocation, dependencies = {}) {
  const spawnProcess = dependencies.spawn ?? spawn;
  const setTimer = dependencies.setTimeout ?? setTimeout;
  const clearTimer = dependencies.clearTimeout ?? clearTimeout;
  const signalGroup = dependencies.signalProcessGroup ?? signalProcessGroup;
  const groupExists = dependencies.processGroupExists ?? processGroupExists;
  const timeoutMs = invocation.timeoutMs;
  const maxOutputBytes = invocation.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const acceptedExitCodes = invocation.acceptedExitCodes ?? [0];
  assertInvocation(invocation.executable, invocation.args);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3_600_000) {
    fail("PROCESS_CONFIGURATION", "The process timeout is invalid.");
  }
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 4 * 1024 * 1024) {
    fail("PROCESS_CONFIGURATION", "The process output bound is invalid.");
  }
  if (invocation.signal?.aborted === true) {
    fail("PROCESS_CANCELLED", "The fixed local process was cancelled before it started.");
  }

  return await new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnProcess(invocation.executable, invocation.args, {
        cwd: invocation.cwd,
        env: invocation.env,
        shell: false,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      reject(new RunnerError("PROCESS_START_FAILED", "A fixed local process could not start.", { cause: error }));
      return;
    }

    const stdout = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let timedOut = false;
    let outputExceeded = false;
    let cancelled = false;
    let descendantRemained = false;
    let startFailed = false;
    let terminationStarted = false;
    let killTimer;
    let terminationProofTimer;
    let abortHandler;
    const childPid = child.pid;

    const wipeOutput = () => {
      for (const chunk of stdout) chunk.fill(0);
      stdout.length = 0;
      stdoutBytes = 0;
    };

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimer(timeoutTimer);
      if (killTimer !== undefined) clearTimer(killTimer);
      if (terminationProofTimer !== undefined) clearTimer(terminationProofTimer);
      if (abortHandler !== undefined) {
        invocation.signal?.removeEventListener?.("abort", abortHandler);
      }
      callback();
    };

    const terminationFailure = () => {
      if (cancelled) {
        return ["PROCESS_CANCELLED", "A fixed local process was cancelled after its process group was terminated."];
      }
      if (timedOut) return ["PROCESS_TIMEOUT", "A fixed local process exceeded its time bound."];
      if (outputExceeded) return ["PROCESS_OUTPUT_LIMIT", "A fixed local process exceeded its output bound."];
      if (descendantRemained) {
        return ["PROCESS_DESCENDANT_REMAINED", "A fixed local process left a descendant; its process group was terminated."];
      }
      if (startFailed) {
        return ["PROCESS_START_FAILED", "A fixed local process failed after starting; its process group was terminated."];
      }
      return ["PROCESS_REJECTED", "A fixed local process required forced termination."];
    };

    const rejectAfterProvenTermination = () => {
      finish(() => {
        wipeOutput();
        const [code, message] = terminationFailure();
        reject(new RunnerError(code, message));
      });
    };

    const rejectUncertainTermination = (cause) => {
      finish(() => {
        wipeOutput();
        reject(new RunnerError(
          "PROCESS_TERMINATION_UNCERTAIN",
          "A deployment subprocess group could not be proven terminated; the lock was retained.",
          { preserveLock: true, cause },
        ));
      });
    };

    const groupIsAbsent = () => {
      if (!Number.isInteger(childPid) || childPid <= 0) return false;
      try {
        return groupExists(childPid) === false;
      } catch {
        return false;
      }
    };

    const forceTermination = (reason) => {
      if (terminationStarted || settled) return;
      terminationStarted = true;
      if (reason === "timeout") timedOut = true;
      if (reason === "output") outputExceeded = true;
      if (reason === "cancel") cancelled = true;
      if (reason === "descendant") descendantRemained = true;
      if (reason === "start") startFailed = true;
      wipeOutput();
      if (!Number.isInteger(childPid) || childPid <= 0) {
        rejectUncertainTermination();
        return;
      }
      try {
        signalGroup(childPid, "SIGTERM");
      } catch (error) {
        rejectUncertainTermination(error);
        return;
      }
      killTimer = setTimer(() => {
        if (groupIsAbsent()) {
          rejectAfterProvenTermination();
          return;
        }
        try {
          signalGroup(childPid, "SIGKILL");
        } catch (error) {
          rejectUncertainTermination(error);
          return;
        }
        terminationProofTimer = setTimer(() => {
          if (groupIsAbsent()) rejectAfterProvenTermination();
          else rejectUncertainTermination();
        }, TERMINATION_GRACE_MS);
      }, TERMINATION_GRACE_MS);
    };

    const timeoutTimer = setTimer(() => forceTermination("timeout"), timeoutMs);

    if (invocation.signal?.addEventListener !== undefined) {
      abortHandler = () => forceTermination("cancel");
      invocation.signal.addEventListener("abort", abortHandler, { once: true });
      if (invocation.signal.aborted) abortHandler();
    }

    child.stdout?.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (settled || terminationStarted) {
        buffer.fill(0);
        return;
      }
      stdoutBytes += buffer.length;
      if (stdoutBytes + stderrBytes > maxOutputBytes) {
        buffer.fill(0);
        forceTermination("output");
        return;
      }
      stdout.push(buffer);
    });
    child.stderr?.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (settled) {
        buffer.fill(0);
        return;
      }
      stderrBytes += buffer.length;
      buffer.fill(0);
      if (stdoutBytes + stderrBytes > maxOutputBytes) forceTermination("output");
    });
    child.once("error", (error) => {
      if (terminationStarted) return;
      if (Number.isInteger(childPid) && childPid > 0 && !groupIsAbsent()) {
        forceTermination("start");
        return;
      }
      finish(() => {
        wipeOutput();
        reject(new RunnerError(
          "PROCESS_START_FAILED",
          "A fixed local process failed before completion.",
          { cause: error },
        ));
      });
    });
    child.once("close", (code, signal) => {
      if (terminationStarted) {
        if (groupIsAbsent()) rejectAfterProvenTermination();
        return;
      }
      if (!groupIsAbsent()) {
        forceTermination("descendant");
        return;
      }
      finish(() => {
        if (!Number.isInteger(code) || !acceptedExitCodes.includes(code)) {
          wipeOutput();
          reject(new RunnerError(
            "PROCESS_REJECTED",
            signal === null
              ? "A fixed local process returned a rejected status."
              : "A fixed local process was interrupted.",
          ));
          return;
        }
        let combined;
        try {
          combined = Buffer.concat(stdout, stdoutBytes);
        } catch (error) {
          wipeOutput();
          reject(new RunnerError(
            "PROCESS_OUTPUT_INVALID",
            "A fixed local process returned output that could not be bounded.",
            { cause: error },
          ));
          return;
        }
        wipeOutput();
        resolve({ code, stdout: combined });
      });
    });
  });
}

export async function runInherited(invocation, dependencies = {}) {
  const spawnProcess = dependencies.spawn ?? spawn;
  const setTimer = dependencies.setTimeout ?? setTimeout;
  const clearTimer = dependencies.clearTimeout ?? clearTimeout;
  assertInvocation(invocation.executable, invocation.args);
  if (invocation.signal?.aborted === true) {
    fail("PROCESS_CANCELLED", "The inherited process was cancelled before it started.");
  }
  return await new Promise((resolve, reject) => {
    let child;
    let settled = false;
    let cancelled = false;
    let killTimer;
    let failureTimer;
    let abortHandler;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      if (killTimer !== undefined) clearTimer(killTimer);
      if (failureTimer !== undefined) clearTimer(failureTimer);
      if (abortHandler !== undefined) invocation.signal?.removeEventListener?.("abort", abortHandler);
      callback();
    };
    try {
      child = spawnProcess(invocation.executable, invocation.args, {
        cwd: invocation.cwd,
        env: invocation.env,
        shell: false,
        detached: false,
        stdio: "inherit",
      });
    } catch (error) {
      finish(() => reject(new RunnerError("ENROLLMENT_FAILED", "The Keychain enrollment prompt could not start.", { cause: error })));
      return;
    }
    if (invocation.signal?.addEventListener !== undefined) {
      abortHandler = () => {
        if (settled || cancelled) return;
        cancelled = true;
        try {
          child.kill("SIGTERM");
        } catch (error) {
          finish(() => reject(new RunnerError(
            "PROCESS_TERMINATION_UNCERTAIN",
            "The inherited process could not be proven terminated after cancellation.",
            { cause: error, preserveLock: true },
          )));
          return;
        }
        killTimer = setTimer(() => {
          if (settled) return;
          try {
            child.kill("SIGKILL");
          } catch (error) {
            finish(() => reject(new RunnerError(
              "PROCESS_TERMINATION_UNCERTAIN",
              "The inherited process could not be proven terminated after cancellation.",
              { cause: error, preserveLock: true },
            )));
            return;
          }
          failureTimer = setTimer(() => finish(() => reject(new RunnerError(
            "PROCESS_TERMINATION_UNCERTAIN",
            "The inherited process could not be proven terminated after cancellation.",
            { preserveLock: true },
          ))), TERMINATION_GRACE_MS);
        }, TERMINATION_GRACE_MS);
      };
      invocation.signal.addEventListener("abort", abortHandler, { once: true });
      if (invocation.signal.aborted) abortHandler();
    }
    child.once("error", (error) => finish(() => reject(new RunnerError(
      cancelled ? "PROCESS_TERMINATION_UNCERTAIN" : "ENROLLMENT_FAILED",
      cancelled
        ? "The inherited process could not be proven terminated after cancellation."
        : "The Keychain enrollment prompt failed.",
      { cause: error, preserveLock: cancelled },
    ))));
    child.once("close", (code, signal) => {
      finish(() => {
        if (cancelled) reject(new RunnerError("PROCESS_CANCELLED", "The inherited process was cancelled."));
        else if (code === 0 && signal === null) resolve();
        else reject(new RunnerError("ENROLLMENT_FAILED", "Keychain enrollment did not complete."));
      });
    });
  });
}

export function sanitizedLocalEnvironment(home, temporaryHome) {
  const environment = {
    HOME: temporaryHome ?? home,
    PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    CI: "1",
    NO_COLOR: "1",
  };
  if (temporaryHome !== undefined) {
    environment.TMPDIR = temporaryHome;
    environment.XDG_CACHE_HOME = `${temporaryHome}/cache`;
    environment.XDG_CONFIG_HOME = `${temporaryHome}/config`;
    environment.WRANGLER_SEND_METRICS = "false";
  }
  return environment;
}
