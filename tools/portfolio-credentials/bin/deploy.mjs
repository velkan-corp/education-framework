#!/opt/homebrew/opt/node@24/bin/node
import { deploy } from "../runtime/deploy.mjs";
import { REPOSITORY_ROOT, runEntrypoint } from "../runtime/entrypoint.mjs";

await runEntrypoint(async (manifest, dependencies) => {
  const receipt = await deploy(manifest, REPOSITORY_ROOT, dependencies);
  process.stdout.write(`${JSON.stringify({ status: "deployed", ...receipt })}\n`);
});
