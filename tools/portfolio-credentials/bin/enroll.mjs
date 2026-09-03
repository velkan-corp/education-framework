#!/opt/homebrew/opt/node@24/bin/node
import { enrollCapability } from "../runtime/capability.mjs";
import { REPOSITORY_ROOT, runEntrypoint } from "../runtime/entrypoint.mjs";

await runEntrypoint(async (manifest, dependencies) => {
  process.stdout.write(
    `Enroll the concealed api-token from 1Password item ${JSON.stringify(manifest.credential.onePasswordItem)}.\n`,
  );
  await enrollCapability(manifest, REPOSITORY_ROOT, dependencies);
  process.stdout.write("ENROLLED: metadata exists in the approved local login Keychain. Verify its ACL in Keychain Access.\n");
});
