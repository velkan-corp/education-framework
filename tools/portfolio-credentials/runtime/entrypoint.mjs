import { fileURLToPath } from "node:url";

import { fail, renderFailure } from "./errors.mjs";
import { loadManifest } from "./manifest.mjs";
import { verifyRuntime } from "./platform.mjs";

const FORBIDDEN_PARENT_ENVIRONMENT = new Set([
  "ALL_PROXY",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NODE_DEBUG",
  "NODE_DEBUG_NATIVE",
  "NODE_EXTRA_CA_CERTS",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "NODE_USE_ENV_PROXY",
  "NO_PROXY",
  "OPENSSL_CONF",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
  "SSLKEYLOGFILE",
]);

export const INSTALL_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const MANIFEST_PATH = fileURLToPath(new URL("../capability.json", import.meta.url));
export const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export function requireNoArguments(argv) {
  if (argv.length !== 0) {
    fail("CLI_USAGE", "This fixed runner accepts no flags or target arguments.");
  }
}

export function verifyParentLaunch(runtimeProcess = process) {
  if (!Array.isArray(runtimeProcess.execArgv) || runtimeProcess.execArgv.length !== 0) {
    fail(
      "UNSAFE_LAUNCH_ENVIRONMENT",
      "The credential runner must start without Node.js execution flags.",
    );
  }
  const environment = runtimeProcess.env;
  if (environment === null || typeof environment !== "object" || Array.isArray(environment)) {
    fail("UNSAFE_LAUNCH_ENVIRONMENT", "The credential runner could not inspect its launch environment.");
  }
  if (Object.keys(environment).some((name) => FORBIDDEN_PARENT_ENVIRONMENT.has(name.toUpperCase()))) {
    fail(
      "UNSAFE_LAUNCH_ENVIRONMENT",
      "Unset inherited Node.js diagnostic, loader, proxy, and TLS authority variables before using the credential runner.",
    );
  }
}

export async function runEntrypoint(operation, dependencies = {}) {
  const runtimeProcess = dependencies.process ?? process;
  const Controller = dependencies.AbortController ?? AbortController;
  const readManifest = dependencies.loadManifest ?? loadManifest;
  const verifyNode = dependencies.verifyRuntime ?? verifyRuntime;
  const controller = new Controller();
  const cancel = () => controller.abort();
  runtimeProcess.on("SIGINT", cancel);
  runtimeProcess.on("SIGTERM", cancel);
  try {
    verifyParentLaunch(runtimeProcess);
    requireNoArguments(dependencies.argv ?? runtimeProcess.argv.slice(2));
    await verifyNode({ ...dependencies, process: runtimeProcess });
    const manifest = await readManifest(dependencies.manifestPath ?? MANIFEST_PATH, {
      ...dependencies,
      installRoot: dependencies.installRoot ?? INSTALL_ROOT,
      repositoryRoot: dependencies.repositoryRoot ?? REPOSITORY_ROOT,
      signal: controller.signal,
    });
    if (controller.signal.aborted) {
      fail("PROCESS_CANCELLED", "The credential operation was cancelled before it started.");
    }
    await operation(manifest, { signal: controller.signal });
    if (controller.signal.aborted) {
      fail("PROCESS_CANCELLED", "The credential operation was cancelled.");
    }
  } catch (error) {
    runtimeProcess.stderr.write(`${renderFailure(error)}\n`);
    runtimeProcess.exitCode = 1;
  } finally {
    runtimeProcess.removeListener("SIGINT", cancel);
    runtimeProcess.removeListener("SIGTERM", cancel);
  }
}
