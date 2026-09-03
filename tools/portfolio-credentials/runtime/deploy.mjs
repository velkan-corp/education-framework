import { cleanupArtifact, prepareArtifact } from "./archive.mjs";
import {
  verifyAccountToken,
  verifyPagesProject,
  waitForDeploymentReceipt,
} from "./cloudflare-pages.mjs";
import { RunnerError, fail } from "./errors.mjs";
import { verifyWorkspaceIntegrity } from "./integrity.mjs";
import { credentialExists, readCredential, verifyLoginKeychain } from "./keychain.mjs";
import {
  acquireDeploymentLock,
  recordDeploymentWorkspace,
  releaseDeploymentLock,
} from "./lock.mjs";
import { runBounded } from "./process.mjs";
import { NODE_EXECUTABLE, verifyRuntime } from "./platform.mjs";
import { verifyRepository, verifyRepositoryUnchanged } from "./repository.mjs";

function throwIfCancelled(signal) {
  if (signal?.aborted === true) {
    fail("PROCESS_CANCELLED", "The deployment operation was cancelled.");
  }
}

export async function deploy(manifest, repoRoot, dependencies = {}) {
  const acquireLock = dependencies.acquireLock ?? acquireDeploymentLock;
  const releaseLock = dependencies.releaseLock ?? releaseDeploymentLock;
  const recordWorkspace = dependencies.recordDeploymentWorkspace ?? recordDeploymentWorkspace;
  const verifySource = dependencies.verifyRepository ?? verifyRepository;
  const verifySourceUnchanged = dependencies.verifyRepositoryUnchanged ?? verifyRepositoryUnchanged;
  const prepare = dependencies.prepareArtifact ?? prepareArtifact;
  const cleanup = dependencies.cleanupArtifact ?? cleanupArtifact;
  const selectKeychain = dependencies.verifyLoginKeychain ?? verifyLoginKeychain;
  const exists = dependencies.credentialExists ?? credentialExists;
  const read = dependencies.readCredential ?? readCredential;
  const verifyToken = dependencies.verifyAccountToken ?? verifyAccountToken;
  const verifyProject = dependencies.verifyPagesProject ?? verifyPagesProject;
  const receipt = dependencies.waitForDeploymentReceipt ?? waitForDeploymentReceipt;
  const run = dependencies.run ?? runBounded;
  const verifyIntegrity = dependencies.verifyWorkspaceIntegrity ?? verifyWorkspaceIntegrity;
  const verifyNode = dependencies.verifyRuntime ?? verifyRuntime;
  const now = dependencies.now ?? (() => Date.now());
  let lock;
  let workspace;
  let credential;
  let childEnvironment;
  let preserveLock = false;
  try {
    lock = await acquireLock(manifest, dependencies);
    throwIfCancelled(dependencies.signal);

    // All repository, dependency, artifact, target-name and Keychain metadata checks happen
    // before the credential value enters this process.
    const selected = await selectKeychain(dependencies);
    if (!await exists(manifest, { ...dependencies, selected })) {
      fail("CREDENTIAL_MISSING", "The dedicated Keychain credential is not enrolled.");
    }
    const source = await verifySource(manifest, repoRoot, dependencies);
    workspace = await prepare(manifest, source, {
      ...dependencies,
      recordWorkspace: async (path) => recordWorkspace(lock, path, dependencies),
    });
    await verifySourceUnchanged(manifest, source, dependencies);
    await verifyIntegrity(workspace, manifest, dependencies);
    await verifyNode(dependencies);
    throwIfCancelled(dependencies.signal);

    credential = await read(manifest, { ...dependencies, selected });
    const token = credential.toString("ascii");
    await verifyToken(token, manifest, dependencies);
    await verifyProject(token, manifest, dependencies);
    await verifySourceUnchanged(manifest, source, dependencies);
    await verifyIntegrity(workspace, manifest, dependencies);
    await verifyNode(dependencies);
    throwIfCancelled(dependencies.signal);

    const startedAt = now();
    childEnvironment = {
      ...workspace.environment,
      CLOUDFLARE_ACCOUNT_ID: manifest.cloudflare.accountId,
      CLOUDFLARE_API_TOKEN: token,
    };
    const result = await run({
      executable: NODE_EXECUTABLE,
      args: [
        workspace.wranglerCli,
        "pages",
        "deploy",
        workspace.artifactRoot,
        `--env-file=${workspace.emptyEnvironmentFile}`,
        "--project-name",
        manifest.cloudflare.pagesProject,
        "--branch",
        "main",
        "--commit-hash",
        source.head,
        "--commit-dirty=false",
        "--install-skills=false",
        "--force=true",
        "--x-provision=false",
        "--x-auto-create=false",
      ],
      cwd: workspace.temporaryHome,
      env: childEnvironment,
      timeoutMs: manifest.limits.deploymentTimeoutSeconds * 1000,
      maxOutputBytes: 1024 * 1024,
      signal: dependencies.signal,
    });
    result.stdout.fill(0);
    delete childEnvironment.CLOUDFLARE_API_TOKEN;
    credential.fill(0);
    credential = undefined;

    return await receipt(token, manifest, source.head, startedAt, dependencies);
  } catch (error) {
    preserveLock = error instanceof RunnerError && error.preserveLock;
    throw error;
  } finally {
    if (credential) credential.fill(0);
    if (childEnvironment) delete childEnvironment.CLOUDFLARE_API_TOKEN;
    if (!preserveLock && workspace) {
      try {
        await cleanup(workspace);
      } catch (error) {
        preserveLock = true;
        throw new RunnerError(
          "CLEANUP_UNCERTAIN",
          "The private deployment workspace could not be proven removed; the lock was retained.",
          { cause: error, preserveLock: true },
        );
      }
    }
    if (!preserveLock && lock) {
      try {
        await releaseLock(lock, dependencies);
      } catch (error) {
        throw new RunnerError(
          "LOCK_RELEASE_FAILED",
          "The completed deployment lock could not be proven released.",
          { cause: error, preserveLock: true },
        );
      }
    }
  }
}
