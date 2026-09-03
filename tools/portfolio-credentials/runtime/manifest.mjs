import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

import { fail } from "./errors.mjs";
import { runBounded, sanitizedLocalEnvironment } from "./process.mjs";
import { decodeUtf8 } from "./text.mjs";

const TOP_LEVEL_KEYS = [
  "schemaVersion",
  "provider",
  "capability",
  "repository",
  "credential",
  "build",
  "cloudflare",
  "limits",
];

const GITHUB_REMOTE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/u;
const SAFE_RELATIVE_SEGMENT = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*[\0\r\n]).+$/u;
const SERVICE_NAME = /^com\.(?:velkan|pedrortm|wafflepage)\.[a-z0-9-]+\.cloudflare\.pages-deploy$/u;
const PAGES_PROJECT = /^[a-z0-9](?:[a-z0-9-]{0,56}[a-z0-9])?$/u;
const ACCOUNT_ID = /^[a-f0-9]{32}$/u;
const PAGES_PROJECT_ID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
const PROCESS_UID = process.getuid?.();
const GIT = "/usr/bin/git";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!isRecord(value)) fail("INVALID_MANIFEST", `${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("INVALID_MANIFEST", `${label} contains missing or unknown keys.`);
  }
}

function requiredString(value, label, maximum = 512) {
  if (
    typeof value !== "string" || value.length === 0 || value.length > maximum ||
    /[\0\r\n]/u.test(value)
  ) {
    fail("INVALID_MANIFEST", `${label} must be a bounded single-line string.`);
  }
  return value;
}

function relativePath(value, label) {
  const path = requiredString(value, label, 240);
  if (path.includes("\\") || (path !== "." && !SAFE_RELATIVE_SEGMENT.test(path))) {
    fail("INVALID_MANIFEST", `${label} must remain within the archived repository.`);
  }
  return path;
}

function integerInRange(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail("INVALID_MANIFEST", `${label} is outside its allowed range.`);
  }
  return value;
}

function validateRepository(value) {
  exactKeys(value, ["remoteName", "remoteUrl", "branch"], "repository");
  if (value.remoteName !== "origin" || value.branch !== "main") {
    fail("INVALID_MANIFEST", "V1 requires remote origin and branch main.");
  }
  const remoteUrl = requiredString(value.remoteUrl, "repository.remoteUrl", 512);
  if (!GITHUB_REMOTE.test(remoteUrl) || remoteUrl.includes("@github.com/") || remoteUrl.includes("?")) {
    fail("INVALID_MANIFEST", "repository.remoteUrl must be an exact credential-free HTTPS GitHub remote.");
  }
  return { remoteName: "origin", remoteUrl, branch: "main" };
}

function validateCredential(value) {
  exactKeys(
    value,
    ["keychainService", "keychainAccount", "onePasswordItem"],
    "credential",
  );
  const keychainService = requiredString(value.keychainService, "credential.keychainService", 160);
  if (!SERVICE_NAME.test(keychainService)) {
    fail("INVALID_MANIFEST", "credential.keychainService is not an approved explicit service name.");
  }
  if (value.keychainAccount !== "api-token") {
    fail("INVALID_MANIFEST", "credential.keychainAccount must be api-token.");
  }
  const onePasswordItem = requiredString(value.onePasswordItem, "credential.onePasswordItem", 160);
  if (!onePasswordItem.endsWith(" Cloudflare Pages Deploy")) {
    fail("INVALID_MANIFEST", "credential.onePasswordItem must follow the project capability naming contract.");
  }
  return {
    keychainService,
    keychainAccount: "api-token",
    onePasswordItem,
  };
}

function validateBuild(value) {
  if (!isRecord(value)) fail("INVALID_MANIFEST", "build must be an object.");
  if (value.mode === "command") {
    exactKeys(value, ["mode", "outputDirectory"], "build");
    const outputDirectory = relativePath(value.outputDirectory, "build.outputDirectory");
    if (outputDirectory === ".") {
      fail("INVALID_MANIFEST", "Command builds require a dedicated output directory.");
    }
    const outputParts = outputDirectory.split("/").filter((part) => part !== ".");
    if (
      outputParts.some((part) => {
        const normalized = part.toLowerCase();
        return normalized === ".git" || normalized === ".wrangler" ||
          normalized === "functions" || normalized === "node_modules" ||
          normalized === "_worker.js" || normalized === ".env" ||
          normalized.startsWith(".env.") || normalized === ".dev.vars" ||
          normalized.startsWith(".dev.vars.");
      }) ||
      outputDirectory.toLowerCase() === "tools/portfolio-credentials" ||
      outputDirectory.toLowerCase().startsWith("tools/portfolio-credentials/")
    ) {
      fail("INVALID_MANIFEST", "build.outputDirectory selects a forbidden private or tooling path.");
    }
    return {
      mode: "command",
      outputDirectory,
    };
  }
  if (value.mode === "committed-tree") {
    exactKeys(value, ["mode"], "build");
    return { mode: "committed-tree" };
  }
  fail("INVALID_MANIFEST", "build.mode must be command or committed-tree.");
}

function validateCloudflare(value) {
  exactKeys(
    value,
    ["accountId", "pagesProject", "pagesProjectId", "productionBranch"],
    "cloudflare",
  );
  if (typeof value.accountId !== "string" || !ACCOUNT_ID.test(value.accountId)) {
    fail("INVALID_MANIFEST", "cloudflare.accountId must be a 32-character lowercase identifier.");
  }
  if (typeof value.pagesProject !== "string" || !PAGES_PROJECT.test(value.pagesProject)) {
    fail("INVALID_MANIFEST", "cloudflare.pagesProject is invalid.");
  }
  if (value.productionBranch !== "main") {
    fail("INVALID_MANIFEST", "V1 deploys only the production branch main.");
  }
  if (typeof value.pagesProjectId !== "string" || !PAGES_PROJECT_ID.test(value.pagesProjectId)) {
    fail("INVALID_MANIFEST", "cloudflare.pagesProjectId must be the exact canonical lowercase UUID.");
  }
  return {
    accountId: value.accountId,
    pagesProject: value.pagesProject,
    pagesProjectId: value.pagesProjectId,
    productionBranch: "main",
  };
}

function validateLimits(value) {
  exactKeys(
    value,
    [
      "commandTimeoutSeconds",
      "apiTimeoutSeconds",
      "deploymentTimeoutSeconds",
      "minimumTokenLifetimeSeconds",
      "maxArtifactFiles",
      "maxArtifactFileBytes",
      "maxArtifactTotalBytes",
    ],
    "limits",
  );
  return {
    commandTimeoutSeconds: integerInRange(value.commandTimeoutSeconds, "limits.commandTimeoutSeconds", 30, 3600),
    apiTimeoutSeconds: integerInRange(value.apiTimeoutSeconds, "limits.apiTimeoutSeconds", 5, 60),
    deploymentTimeoutSeconds: integerInRange(
      value.deploymentTimeoutSeconds,
      "limits.deploymentTimeoutSeconds",
      30,
      1800,
    ),
    minimumTokenLifetimeSeconds: integerInRange(
      value.minimumTokenLifetimeSeconds,
      "limits.minimumTokenLifetimeSeconds",
      2_592_000,
      15_552_000,
    ),
    maxArtifactFiles: integerInRange(value.maxArtifactFiles, "limits.maxArtifactFiles", 1, 20_000),
    maxArtifactFileBytes: integerInRange(
      value.maxArtifactFileBytes,
      "limits.maxArtifactFileBytes",
      1,
      25 * 1024 * 1024,
    ),
    maxArtifactTotalBytes: integerInRange(
      value.maxArtifactTotalBytes,
      "limits.maxArtifactTotalBytes",
      1,
      2 * 1024 * 1024 * 1024,
    ),
  };
}

export function validateManifest(value) {
  exactKeys(value, TOP_LEVEL_KEYS, "manifest");
  if (value.schemaVersion !== 1 || value.provider !== "cloudflare" || value.capability !== "pages-direct-upload") {
    fail("INVALID_MANIFEST", "V1 admits only Cloudflare Pages Direct Upload schemaVersion 1.");
  }
  return Object.freeze({
    schemaVersion: 1,
    provider: "cloudflare",
    capability: "pages-direct-upload",
    repository: Object.freeze(validateRepository(value.repository)),
    credential: Object.freeze(validateCredential(value.credential)),
    build: Object.freeze(validateBuild(value.build)),
    cloudflare: Object.freeze(validateCloudflare(value.cloudflare)),
    limits: Object.freeze(validateLimits(value.limits)),
  });
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size &&
    left.mode === right.mode && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

async function readStableManifest(path, dependencies) {
  const openFile = dependencies.open ?? open;
  let handle;
  let bytes;
  try {
    const pathStats = await lstat(path, { bigint: true });
    const mode = Number(pathStats.mode & 0o7777n);
    if (
      !pathStats.isFile() || pathStats.isSymbolicLink() || (mode & 0o022) !== 0 ||
      (dependencies.installRoot !== undefined && mode !== 0o644) ||
      (PROCESS_UID !== undefined && Number(pathStats.uid) !== PROCESS_UID) || pathStats.size > 64n * 1024n
    ) {
      fail("INVALID_MANIFEST", "The capability manifest is not a safely owned regular file with its reviewed mode.");
    }
    handle = await openFile(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || !sameFileIdentity(pathStats, opened)) {
      fail("INVALID_MANIFEST", "The capability manifest changed identity while being opened.");
    }
    bytes = await handle.readFile();
    const final = await handle.stat({ bigint: true });
    if (!sameFileIdentity(opened, final) || BigInt(bytes.length) !== opened.size) {
      bytes.fill(0);
      fail("INVALID_MANIFEST", "The capability manifest changed while being read.");
    }
  } catch (error) {
    bytes?.fill(0);
    if (error?.code === "INVALID_MANIFEST") throw error;
    fail("INVALID_MANIFEST", "The fixed capability manifest could not be read safely.", { cause: error });
  } finally {
    await handle?.close();
  }
  return bytes;
}

async function verifyCommittedManifest(path, bytes, dependencies) {
  if (dependencies.installRoot === undefined && dependencies.repositoryRoot === undefined) return;
  if (typeof dependencies.installRoot !== "string" || typeof dependencies.repositoryRoot !== "string") {
    fail("INVALID_MANIFEST", "Installed manifest verification requires exact runner and repository roots.");
  }
  let installRoot;
  let repositoryRoot;
  let manifestPath;
  try {
    installRoot = await realpath(dependencies.installRoot);
    repositoryRoot = await realpath(dependencies.repositoryRoot);
    manifestPath = await realpath(path);
    const installStats = await lstat(dependencies.installRoot);
    if (!installStats.isDirectory() || installStats.isSymbolicLink()) throw new Error("runner root is not real");
  } catch (error) {
    fail("INVALID_MANIFEST", "The installed capability path could not be physically bound.", { cause: error });
  }
  if (
    installRoot !== resolve(dependencies.installRoot) || repositoryRoot !== resolve(dependencies.repositoryRoot) ||
    manifestPath !== join(installRoot, "capability.json")
  ) {
    fail("INVALID_MANIFEST", "The capability manifest is outside the exact project-owned runner root.");
  }
  const installRelative = relative(repositoryRoot, installRoot);
  if (installRelative !== "tools/portfolio-credentials" || installRelative.startsWith(`..${sep}`)) {
    fail("INVALID_MANIFEST", "The runner is not installed at its sole reviewed repository path.");
  }
  const run = dependencies.run ?? runBounded;
  const result = await run({
    executable: GIT,
    args: ["show", "HEAD:tools/portfolio-credentials/capability.json"],
    cwd: repositoryRoot,
    env: sanitizedLocalEnvironment(dependencies.homeDirectory ?? repositoryRoot),
    timeoutMs: 10_000,
    maxOutputBytes: 64 * 1024,
    signal: dependencies.signal,
  });
  try {
    if (!result.stdout.equals(bytes)) {
      fail("INVALID_MANIFEST", "The capability manifest bytes differ from the clean committed HEAD blob.");
    }
  } finally {
    result.stdout.fill(0);
  }
}

export async function loadManifest(path, dependencies = {}) {
  let bytes;
  let text;
  try {
    bytes = await readStableManifest(path, dependencies);
    await verifyCommittedManifest(path, bytes, dependencies);
    text = decodeUtf8(bytes, "Capability manifest", 64 * 1024);
  } catch (error) {
    bytes?.fill(0);
    if (error?.code === "INVALID_MANIFEST" || error?.code === "PROCESS_CANCELLED") throw error;
    fail("INVALID_MANIFEST", "The fixed capability manifest could not be read.", { cause: error });
  } finally {
    bytes?.fill(0);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    fail("INVALID_MANIFEST", "The capability manifest is not valid JSON.", { cause: error });
  }
  return validateManifest(value);
}
