import { verifyAccountToken, verifyPagesProject } from "./cloudflare-pages.mjs";
import { fail } from "./errors.mjs";
import {
  credentialExists,
  enrollCredential,
  readCredential,
  verifyLoginKeychain,
} from "./keychain.mjs";
import { verifyRepository } from "./repository.mjs";

function throwIfCancelled(signal) {
  if (signal?.aborted === true) {
    fail("PROCESS_CANCELLED", "The credential capability operation was cancelled.");
  }
}

export async function enrollCapability(manifest, repoRoot, dependencies = {}) {
  const verifySource = dependencies.verifyRepository ?? verifyRepository;
  const enroll = dependencies.enrollCredential ?? enrollCredential;
  await verifySource(manifest, repoRoot, dependencies);
  throwIfCancelled(dependencies.signal);
  await enroll(manifest, dependencies);
}

export async function verifyCapability(manifest, repoRoot, dependencies = {}) {
  const verifySource = dependencies.verifyRepository ?? verifyRepository;
  const selectKeychain = dependencies.verifyLoginKeychain ?? verifyLoginKeychain;
  const exists = dependencies.credentialExists ?? credentialExists;
  const read = dependencies.readCredential ?? readCredential;
  const verifyToken = dependencies.verifyAccountToken ?? verifyAccountToken;
  const verifyProject = dependencies.verifyPagesProject ?? verifyPagesProject;
  let credential;
  try {
    const source = await verifySource(manifest, repoRoot, dependencies);
    const selected = await selectKeychain(dependencies);
    if (!await exists(manifest, { ...dependencies, selected })) {
      fail("CREDENTIAL_MISSING", "The dedicated Keychain credential is not enrolled.");
    }
    throwIfCancelled(dependencies.signal);
    credential = await read(manifest, { ...dependencies, selected });
    const token = credential.toString("ascii");
    const tokenEvidence = await verifyToken(token, manifest, dependencies);
    const projectEvidence = await verifyProject(token, manifest, dependencies);
    throwIfCancelled(dependencies.signal);
    return Object.freeze({
      status: "verified",
      provider: manifest.provider,
      capability: manifest.capability,
      project: manifest.cloudflare.pagesProject,
      projectId: projectEvidence.id,
      commit: source.head,
      tokenId: tokenEvidence.id,
      tokenExpiresAt: tokenEvidence.expiresAt,
    });
  } finally {
    credential?.fill(0);
  }
}
