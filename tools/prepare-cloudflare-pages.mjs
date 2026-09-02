import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';

const repositoryRoot = new URL('../', import.meta.url);
const buildDirectory = new URL('dist/', repositoryRoot);
const publishDirectory = new URL('.cloudflare-pages/', repositoryRoot);
const siteDirectory = new URL('education-framework/', publishDirectory);

async function removeRepositoryMetadata(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);

    if (entry.name === '.DS_Store' || entry.name === 'CNAME') {
      await rm(entryUrl, { recursive: entry.isDirectory(), force: true });
    } else if (entry.isDirectory()) {
      await removeRepositoryMetadata(entryUrl);
    }
  }
}

await rm(publishDirectory, { recursive: true, force: true });
await mkdir(siteDirectory, { recursive: true });
await cp(buildDirectory, siteDirectory, { recursive: true });
await removeRepositoryMetadata(siteDirectory);
await writeFile(new URL('_redirects', publishDirectory), '/ /education-framework/ 302\n');
