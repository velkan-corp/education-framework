import { setTimeout as sleep } from "node:timers/promises";

import { RunnerError, fail } from "./errors.mjs";
import { decodeUtf8 } from "./text.mjs";

export const CLOUDFLARE_API_ORIGIN = "https://api.cloudflare.com";
const API_PREFIX = "/client/v4";
const MAX_API_RESPONSE_BYTES = 512 * 1024;
const TOKEN_ID = /^[a-f0-9]{32}$/u;
const DEPLOYMENT_ID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function endpoint(path) {
  return `${CLOUDFLARE_API_ORIGIN}${API_PREFIX}${path}`;
}

async function boundedResponseText(response, maximum = MAX_API_RESPONSE_BYTES) {
  if (!response.body || typeof response.body.getReader !== "function") {
    const bytes = Buffer.from(await response.arrayBuffer());
    try {
      return decodeUtf8(bytes, "Cloudflare response", maximum);
    } finally {
      bytes.fill(0);
    }
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let combined;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        fail("PROVIDER_RESPONSE_INVALID", "Cloudflare returned an oversized response.");
      }
      chunks.push(Buffer.from(value));
    }
    combined = Buffer.concat(chunks, total);
    return decodeUtf8(combined, "Cloudflare response", maximum);
  } finally {
    for (const chunk of chunks) chunk.fill(0);
    combined?.fill(0);
    reader.releaseLock();
  }
}

function validateEnvelope(value) {
  if (
    !isRecord(value) || value.success !== true || !Array.isArray(value.errors) ||
    value.errors.length !== 0 || !("result" in value)
  ) {
    fail("PROVIDER_RESPONSE_INVALID", "Cloudflare returned an unsuccessful or malformed response.");
  }
  return value.result;
}

export async function cloudflareGet(path, token, manifest, dependencies = {}) {
  if (!path.startsWith("/") || path.includes("..") || /[\0\r\n]/u.test(path)) {
    fail("PROVIDER_TARGET_INVALID", "The Cloudflare API target is not fixed and canonical.");
  }
  const fetchRequest = dependencies.fetch ?? fetch;
  const Abort = dependencies.AbortController ?? AbortController;
  const setTimer = dependencies.setTimeout ?? setTimeout;
  const clearTimer = dependencies.clearTimeout ?? clearTimeout;
  const externalSignal = dependencies.signal;
  if (externalSignal?.aborted === true) {
    fail("PROCESS_CANCELLED", "The Cloudflare verification request was cancelled before it started.");
  }
  const controller = new Abort();
  const timer = setTimer(() => controller.abort(), manifest.limits.apiTimeoutSeconds * 1000);
  const cancel = () => controller.abort();
  externalSignal?.addEventListener?.("abort", cancel, { once: true });
  if (externalSignal?.aborted === true) cancel();
  try {
    const response = await fetchRequest(endpoint(path), {
      method: "GET",
      redirect: "error",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      fail("CREDENTIAL_REJECTED", "Cloudflare rejected the dedicated deployment credential.");
    }
    if (response.status === 404) {
      fail("PROVIDER_TARGET_MISMATCH", "The reviewed Cloudflare target was not found.");
    }
    if (!response.ok || response.status !== 200) {
      fail("PROVIDER_UNAVAILABLE", "Cloudflare returned a rejected status for a bounded read.");
    }
    const body = JSON.parse(await boundedResponseText(response));
    return validateEnvelope(body);
  } catch (error) {
    if (error instanceof RunnerError) throw error;
    if (externalSignal?.aborted === true) {
      fail("PROCESS_CANCELLED", "The Cloudflare verification request was cancelled.", { cause: error });
    }
    if (error instanceof SyntaxError) {
      fail("PROVIDER_RESPONSE_INVALID", "Cloudflare returned invalid JSON.", { cause: error });
    }
    fail("PROVIDER_UNAVAILABLE", "Cloudflare did not complete a bounded API request.", { cause: error });
  } finally {
    clearTimer(timer);
    externalSignal?.removeEventListener?.("abort", cancel);
  }
}

export async function verifyAccountToken(token, manifest, dependencies = {}) {
  const now = dependencies.now ?? (() => Date.now());
  const result = await cloudflareGet(
    `/accounts/${manifest.cloudflare.accountId}/tokens/verify`,
    token,
    manifest,
    dependencies,
  );
  if (
    !isRecord(result) || typeof result.id !== "string" || !TOKEN_ID.test(result.id) ||
    result.status !== "active" || typeof result.expires_on !== "string"
  ) {
    fail("CREDENTIAL_INVALID", "Cloudflare returned invalid account-token status metadata.");
  }
  const expiresAt = Date.parse(result.expires_on);
  const notBefore = result.not_before === null || result.not_before === undefined
    ? null
    : Date.parse(result.not_before);
  if (!Number.isFinite(expiresAt) || (notBefore !== null && !Number.isFinite(notBefore))) {
    fail("CREDENTIAL_INVALID", "Cloudflare returned invalid account-token lifetime metadata.");
  }
  const currentTime = now();
  if (!Number.isFinite(currentTime)) fail("CLOCK_INVALID", "The deployment clock is invalid.");
  if (notBefore !== null && notBefore > currentTime) {
    fail("CREDENTIAL_NOT_ACTIVE", "The Cloudflare account token is not active yet.");
  }
  if (expiresAt - currentTime < manifest.limits.minimumTokenLifetimeSeconds * 1000) {
    fail("CREDENTIAL_EXPIRING", "The Cloudflare account token is expired or inside its rotation window.");
  }
  return Object.freeze({ id: result.id, expiresAt: new Date(expiresAt).toISOString() });
}

export async function verifyPagesProject(token, manifest, dependencies = {}) {
  const project = await cloudflareGet(
    `/accounts/${manifest.cloudflare.accountId}/pages/projects/${encodeURIComponent(manifest.cloudflare.pagesProject)}`,
    token,
    manifest,
    dependencies,
  );
  if (
    !isRecord(project) || project.id !== manifest.cloudflare.pagesProjectId ||
    project.name !== manifest.cloudflare.pagesProject ||
    project.production_branch !== manifest.cloudflare.productionBranch ||
    (project.source !== null && project.source !== undefined) ||
    project.uses_functions !== false
  ) {
    fail(
      "PROVIDER_TARGET_MISMATCH",
      "Cloudflare Pages project metadata differs from the reviewed Direct Upload target.",
    );
  }
  return Object.freeze({
    id: project.id,
    name: project.name,
    productionBranch: project.production_branch,
    directUpload: true,
    usesFunctions: false,
  });
}

function validDeploymentUrl(value, projectName) {
  if (typeof value !== "string") return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const suffix = `.${projectName}.pages.dev`;
  const prefix = url.hostname.endsWith(suffix) ? url.hostname.slice(0, -suffix.length) : "";
  return url.protocol === "https:" && url.username === "" && url.password === "" &&
    url.port === "" && url.pathname === "/" && url.search === "" && url.hash === "" &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(prefix);
}

function validDeployment(deployment, manifest, head, startedAt) {
  if (!isRecord(deployment) || typeof deployment.id !== "string" || !DEPLOYMENT_ID.test(deployment.id)) return false;
  const metadata = deployment.deployment_trigger?.metadata;
  const stage = deployment.latest_stage;
  const created = Date.parse(deployment.created_on);
  return deployment.project_id === manifest.cloudflare.pagesProjectId &&
    deployment.project_name === manifest.cloudflare.pagesProject &&
    deployment.environment === "production" &&
    deployment.production_branch === manifest.cloudflare.productionBranch &&
    deployment.is_skipped === false &&
    deployment.uses_functions === false &&
    deployment.deployment_trigger?.type === "ad_hoc" &&
    isRecord(metadata) && metadata.branch === "main" && metadata.commit_hash === head &&
    metadata.commit_dirty === false &&
    isRecord(stage) && stage.name === "deploy" && stage.status === "success" &&
    Number.isFinite(created) && created >= startedAt - 5_000 &&
    validDeploymentUrl(deployment.url, manifest.cloudflare.pagesProject);
}

export async function waitForDeploymentReceipt(token, manifest, head, startedAt, dependencies = {}) {
  const now = dependencies.now ?? (() => Date.now());
  const wait = dependencies.sleep ?? ((milliseconds, signal) => sleep(milliseconds, undefined, { signal }));
  const deadline = startedAt + manifest.limits.deploymentTimeoutSeconds * 1000;
  do {
    const deployments = await cloudflareGet(
      `/accounts/${manifest.cloudflare.accountId}/pages/projects/${encodeURIComponent(manifest.cloudflare.pagesProject)}/deployments?env=production&page=1&per_page=10`,
      token,
      manifest,
      dependencies,
    );
    if (!Array.isArray(deployments) || deployments.length > 10) {
      fail("DEPLOYMENT_RECEIPT_INVALID", "Cloudflare returned an invalid bounded deployment inventory.");
    }
    const matches = deployments.filter((deployment) => validDeployment(deployment, manifest, head, startedAt));
    if (matches.length === 1) {
      const deployment = matches[0];
      return Object.freeze({
        deploymentId: deployment.id,
        projectId: deployment.project_id,
        url: deployment.url,
        commit: head,
        createdAt: new Date(Date.parse(deployment.created_on)).toISOString(),
      });
    }
    if (matches.length > 1) {
      fail("DEPLOYMENT_RECEIPT_INVALID", "Cloudflare returned ambiguous deployment receipts for this commit.");
    }
    if (now() >= deadline) break;
    try {
      await wait(2_000, dependencies.signal);
    } catch (error) {
      if (dependencies.signal?.aborted === true) {
        fail("PROCESS_CANCELLED", "Deployment receipt verification was cancelled.", { cause: error });
      }
      throw error;
    }
    if (dependencies.signal?.aborted === true) {
      fail("PROCESS_CANCELLED", "Deployment receipt verification was cancelled.");
    }
  } while (now() <= deadline);
  fail("DEPLOYMENT_RECEIPT_TIMEOUT", "Cloudflare did not produce one complete deployment receipt in time.");
}
