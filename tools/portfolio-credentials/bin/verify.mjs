#!/opt/homebrew/opt/node@24/bin/node
import { verifyCapability } from "../runtime/capability.mjs";
import { REPOSITORY_ROOT, runEntrypoint } from "../runtime/entrypoint.mjs";

await runEntrypoint(async (manifest, dependencies) => {
  const receipt = await verifyCapability(manifest, REPOSITORY_ROOT, dependencies);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
});
