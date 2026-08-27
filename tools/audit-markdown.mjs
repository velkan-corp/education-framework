#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdownToMdast } from 'satteri';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const contentRoot = join(repoRoot, 'src/content');

const targetHeadings = new Set([
  'Activity Map',
  'The Eleven Targets',
  'Mapa de Actividades',
  'Los Once Objetivos',
  'Eleven-Target Progression',
  'Progresión de los Once Objetivos',
]);

async function listMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdown(path));
    else if (entry.isFile() && extname(entry.name) === '.md') files.push(path);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function textContent(node) {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.value === 'string' && node.type !== 'yaml') return node.value;
  if (typeof node.alt === 'string') return node.alt;
  return Array.isArray(node.children) ? node.children.map(textContent).join('') : '';
}

function walk(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const child of node.children ?? []) walk(child, visitor);
}

function firstMeaningfulChild(listItem) {
  const firstBlock = listItem.children?.[0];
  if (!firstBlock) return null;
  return firstBlock.children?.find((child) => child.type !== 'text' || child.value.trim() !== '') ?? null;
}

function auditTargetMap(path, tree, errors) {
  const headings = tree.children
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === 'heading' && node.depth === 2 && targetHeadings.has(textContent(node).trim()));
  if (headings.length !== 1) {
    errors.push(`${path}: expected one semantic target-map heading, found ${headings.length}`);
    return;
  }

  const { index } = headings[0];
  let list = null;
  for (const node of tree.children.slice(index + 1)) {
    if (node.type === 'heading' && node.depth <= 2) break;
    if (node.type === 'list' && node.ordered) {
      list = node;
      break;
    }
  }
  if (!list) {
    errors.push(`${path}: target-map heading must be followed by an ordered list`);
    return;
  }
  if (list.children.length !== 11) {
    errors.push(`${path}: target map must contain exactly 11 items, found ${list.children.length}`);
  }
  for (const [index, item] of list.children.entries()) {
    const first = firstMeaningfulChild(item);
    if (!first || first.type !== 'strong' || textContent(first).trim().length < 2) {
      errors.push(`${path}: target ${index + 1} must begin with a bold target name`);
    }
  }
}

function auditPhase(path, source, tree, errors) {
  const h1Count = tree.children.filter((node) => node.type === 'heading' && node.depth === 1).length;
  if (h1Count !== 1) errors.push(`${path}: expected exactly one H1, found ${h1Count}`);
  auditTargetMap(path, tree, errors);

  const profilePrefix = path.includes('/phases-es/') ? 'Perfil — ' : 'Profile — ';
  let profiles = 0;
  walk(tree, (node) => {
    if (node.type !== 'blockquote') return;
    const marker = textContent(node.children?.[0]).trim();
    if (marker.startsWith(profilePrefix)) profiles += 1;
  });
  if (path.endsWith('/framework.md') && profiles !== 0) {
    errors.push(`${path}: framework must not contain phase profile adjustments; found ${profiles}`);
  }
  if (!path.endsWith('/framework.md') && profiles === 0) {
    errors.push(`${path}: expected semantic profile-adjustment blockquotes`);
  }
}

async function main() {
  const files = await listMarkdown(contentRoot);
  const phaseFiles = files.filter((path) => /\/phases(?:-es)?\/[^/]+\.md$/u.test(path));
  const errors = [];
  let htmlNodeCount = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    let tree;
    try {
      tree = markdownToMdast(source);
    } catch (error) {
      errors.push(`${relative(repoRoot, file)}: Markdown parse failed: ${error.message}`);
      continue;
    }

    walk(tree, (node) => {
      if (node.type !== 'html') return;
      htmlNodeCount += 1;
      const line = node.position?.start?.line ?? '?';
      errors.push(`${relative(repoRoot, file)}:${line}: raw HTML is forbidden in content Markdown`);
    });

    if (phaseFiles.includes(file)) auditPhase(file, source, tree, errors);
  }

  if (files.length !== 514) errors.push(`content inventory: expected 514 Markdown files, found ${files.length}`);
  if (phaseFiles.length !== 16) errors.push(`phase inventory: expected 16 phase files, found ${phaseFiles.length}`);

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    console.error(`FAIL: ${errors.length} Markdown-integrity error(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`PASS: ${files.length} Markdown files parse; ${phaseFiles.length} phase files have semantic target/profile structures; ${htmlNodeCount} raw HTML nodes.`);
}

await main();
