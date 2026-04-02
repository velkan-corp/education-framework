import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const phasesDir = path.join(repoRoot, 'src/content/phases');
const universesDir = path.join(repoRoot, 'src/content/universes');

const EXPANDED_UNIVERSE_FIELDS = [
  'kind',
  'summary',
  'whyItBelongs',
  'targets',
  'models',
  'intensity',
  'socialValue',
];

function getFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? '';
}

function getSlug(filename) {
  return filename.replace(/\.md$/u, '');
}

function countFieldCoverage(frontmatters) {
  return Object.fromEntries(
    EXPANDED_UNIVERSE_FIELDS.map((field) => [
      field,
      frontmatters.filter((frontmatter) => new RegExp(`^${field}:`, 'm').test(frontmatter)).length,
    ])
  );
}

async function readMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    filenames.map(async (filename) => ({
      filename,
      fullPath: path.join(dir, filename),
      source: await readFile(path.join(dir, filename), 'utf8'),
    }))
  );
}

function auditPhaseIds(phaseFiles) {
  const idMap = new Map();

  for (const file of phaseFiles) {
    const matches = [...file.source.matchAll(/id="([^"]+)"/gu)].map((match) => match[1]);
    for (const id of matches) {
      const files = idMap.get(id) ?? [];
      files.push(file.filename);
      idMap.set(id, files);
    }
  }

  return [...idMap.entries()]
    .filter(([, filenames]) => new Set(filenames).size > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function auditUniverses(universeFiles) {
  const universeIds = new Set(universeFiles.map((file) => getSlug(file.filename)));
  const frontmatters = universeFiles.map((file) => getFrontmatter(file.source));

  const thinUniverses = [];
  const duplicatePhaseEntries = [];
  const unknownSubstitutes = [];

  for (const file of universeFiles) {
    const frontmatter = getFrontmatter(file.source);
    const missingFields = EXPANDED_UNIVERSE_FIELDS.filter(
      (field) => !new RegExp(`^${field}:`, 'm').test(frontmatter)
    );

    if (missingFields.length > 0) {
      thinUniverses.push({
        filename: file.filename,
        missingFields,
      });
    }

    const phaseIds = [...frontmatter.matchAll(/^\s*-\s*phaseId:\s*([a-z0-9-]+)/gmu)].map((match) => match[1]);
    const seenPhaseIds = new Set();
    const duplicates = [];
    for (const phaseId of phaseIds) {
      if (seenPhaseIds.has(phaseId)) duplicates.push(phaseId);
      seenPhaseIds.add(phaseId);
    }
    if (duplicates.length > 0) {
      duplicatePhaseEntries.push({
        filename: file.filename,
        duplicates: [...new Set(duplicates)],
      });
    }

    const inlineSubstitutes = frontmatter.match(/^\s*substitutes:\s*\[([^\]]*)\]/mu)?.[1] ?? '';
    const substituteIds = inlineSubstitutes
      .split(',')
      .map((value) => value.trim().replace(/^["']|["']$/gu, ''))
      .filter(Boolean);

    const unknown = substituteIds.filter((substituteId) => !universeIds.has(substituteId));
    if (unknown.length > 0) {
      unknownSubstitutes.push({
        filename: file.filename,
        unknown,
      });
    }
  }

  return {
    coverage: countFieldCoverage(frontmatters),
    total: universeFiles.length,
    thinUniverses,
    duplicatePhaseEntries,
    unknownSubstitutes,
  };
}

function printSection(title) {
  console.log(`\n${title}`);
}

async function main() {
  const [phaseFiles, universeFiles] = await Promise.all([
    readMarkdownFiles(phasesDir),
    readMarkdownFiles(universesDir),
  ]);

  const sharedPhaseIds = auditPhaseIds(phaseFiles);
  const universeAudit = auditUniverses(universeFiles);

  printSection('Phase anchor structure');
  console.log(`Phase files: ${phaseFiles.length}`);
  console.log(`Shared raw ids across phase sources: ${sharedPhaseIds.length}`);
  console.log('Note: shared source ids are expected; runtime scoping in the app makes rendered DOM ids unique.');

  printSection('Universe metadata coverage');
  console.log(`Universe files: ${universeAudit.total}`);
  for (const [field, count] of Object.entries(universeAudit.coverage)) {
    console.log(`- ${field}: ${count}/${universeAudit.total}`);
  }

  printSection('Universes missing expanded metadata');
  if (universeAudit.thinUniverses.length === 0) {
    console.log('All universes include the expanded metadata fields.');
  } else {
    for (const entry of universeAudit.thinUniverses) {
      console.log(`- ${entry.filename}: missing ${entry.missingFields.join(', ')}`);
    }
  }

  printSection('Universe integrity checks');
  if (universeAudit.duplicatePhaseEntries.length === 0 && universeAudit.unknownSubstitutes.length === 0) {
    console.log('No duplicate phase entries or unknown substitutes found.');
  } else {
    for (const entry of universeAudit.duplicatePhaseEntries) {
      console.log(`- ${entry.filename}: duplicate phase ids ${entry.duplicates.join(', ')}`);
    }
    for (const entry of universeAudit.unknownSubstitutes) {
      console.log(`- ${entry.filename}: unknown substitutes ${entry.unknown.join(', ')}`);
    }
  }

  if (universeAudit.duplicatePhaseEntries.length > 0 || universeAudit.unknownSubstitutes.length > 0) {
    process.exitCode = 1;
  }
}

await main();
