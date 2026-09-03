#!/opt/homebrew/opt/node@24/bin/node
import { credentialExists, verifyLoginKeychain } from "../runtime/keychain.mjs";
import { REPOSITORY_ROOT, runEntrypoint } from "../runtime/entrypoint.mjs";

await runEntrypoint(async (manifest, dependencies) => {
  const selected = await verifyLoginKeychain(dependencies);
  const enrolled = await credentialExists(manifest, { ...dependencies, selected });
  process.stdout.write(
    `${enrolled ? "ENROLLED" : "MISSING"} ${manifest.provider}/${manifest.capability} ` +
      `${manifest.cloudflare.pagesProject} (${REPOSITORY_ROOT})\n`,
  );
});
