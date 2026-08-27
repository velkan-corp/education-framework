#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdownToMdast } from 'satteri';
import { rewriteLegacyUniverseAnchorHrefs } from './lib/phaseUniverseLinks.mjs';

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolDir, '..');
const filterPath = join(toolDir, 'migrate-phase-markdown.lua');
const phaseDirs = [
  join(repoRoot, 'src/content/phases'),
  join(repoRoot, 'src/content/phases-es'),
];

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const print = args.has('--print');
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

const files = requested.length > 0
  ? requested.map((file) => resolve(process.cwd(), file))
  : phaseDirs.flatMap((directory) =>
      execFileSync('find', [directory, '-maxdepth', '1', '-type', 'f', '-name', '*.md'], { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(Boolean)
        .sort());

function splitFrontmatter(source, file) {
  const match = source.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  if (!match) throw new Error(`${file}: missing leading YAML frontmatter`);
  return { frontmatter: match[1], body: match[2] };
}

function collectHtmlNodes(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (node.type === 'html') found.push(node.value);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) collectHtmlNodes(child, found);
    } else if (value && typeof value === 'object') {
      collectHtmlNodes(value, found);
    }
  }
  return found;
}

function semanticHtmlForPandoc(body) {
  return rewriteLegacyUniverseAnchorHrefs(body).source
    .replace(/<details\b([^>]*)>/giu, '<div$1>')
    .replace(/<\/details>/giu, '</div>')
    .replace(/<summary>/giu, '<div class="details-summary">')
    .replace(/<\/summary>/giu, '</div>');
}

function migrate(file) {
  const source = readFileSync(file, 'utf8');
  const { frontmatter, body } = splitFrontmatter(source, file);
  const existingHtml = collectHtmlNodes(markdownToMdast(source));
  if (existingHtml.length === 0) {
    if (print) process.stdout.write(source);
    return { file, before: source.length, after: source.length, skipped: true };
  }
  const scratch = mkdtempSync(join(tmpdir(), 'education-framework-markdown-'));
  const input = join(scratch, `${basename(file, '.md')}.html`);
  try {
    writeFileSync(input, semanticHtmlForPandoc(body));
    const markdown = execFileSync('pandoc', [
      '--from=html',
      '--to=gfm-raw_html',
      '--wrap=none',
      `--lua-filter=${filterPath}`,
      input,
    ], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        PHASE_MARKDOWN_LOCALE: file.includes('/phases-es/') ? 'es' : 'en',
      },
    });
    const output = `${frontmatter}${markdown.trim()}\n`;
    const htmlNodes = collectHtmlNodes(markdownToMdast(output));
    if (htmlNodes.length > 0) {
      throw new Error(`${file}: migration left ${htmlNodes.length} raw HTML node(s): ${htmlNodes[0]}`);
    }
    if (!output.includes('# ')) throw new Error(`${file}: migration lost headings`);
    if (print) process.stdout.write(output);
    if (write) writeFileSync(file, output);
    return { file, before: source.length, after: output.length };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const results = files.map(migrate);
const verb = write ? 'Migrated' : 'Validated migration for';
const migrated = results.filter((result) => !result.skipped).length;
const alreadySemantic = results.length - migrated;
console.log(`${verb} ${migrated} phase Markdown file(s); ${alreadySemantic} already semantic; zero raw HTML nodes.`);
for (const result of results) {
  const status = result.skipped ? 'already semantic' : `${result.before} → ${result.after} bytes`;
  console.log(`- ${result.file.replace(`${repoRoot}/`, '')}: ${status}`);
}
