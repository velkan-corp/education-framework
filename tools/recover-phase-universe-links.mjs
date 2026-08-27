#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdownToMdast } from 'satteri';
import { canonicalUniverseFragment } from './lib/phaseUniverseLinks.mjs';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const legacyRef = args.find((arg) => arg.startsWith('--legacy-ref='))?.slice('--legacy-ref='.length) || 'HEAD';

const NAMED_ENTITIES = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['gt', '>'],
  ['lt', '<'],
  ['nbsp', ' '],
  ['quot', '"'],
  ['times', '×'],
]);

function decodeHtmlEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/giu, (entity, token) => {
    if (token.startsWith('#x') || token.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
    }
    if (token.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
    }
    return NAMED_ENTITIES.get(token.toLocaleLowerCase('en')) ?? entity;
  });
}

function normalizeVisibleText(value) {
  return value.replace(/\s+/gu, ' ').trim();
}

function visibleHtml(value) {
  return normalizeVisibleText(decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/giu, ' ')
      .replace(/<[^>]+>/gu, '')
  ));
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

function occurrenceCount(value, needle) {
  if (!needle) return 0;
  let count = 0;
  let cursor = 0;
  while ((cursor = value.indexOf(needle, cursor)) >= 0) {
    count += 1;
    cursor += needle.length;
  }
  return count;
}

function extractLegacyAnchors(source, filename) {
  const anchors = [];
  let order = 0;

  for (const rowMatch of source.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gidu)) {
    const rawRow = rowMatch[0];
    const cells = [...rawRow.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gidu)];
    const rowSignature = cells.map((cell) => visibleHtml(cell[1]));

    for (const anchorMatch of rawRow.matchAll(
      /<a\b[^>]*\bdata-universe-nav\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gidu
    )) {
      const anchorStart = anchorMatch.index;
      const cellIndex = cells.findIndex((cell) => (
        anchorStart >= cell.indices[1][0] && anchorStart < cell.indices[1][1]
      ));
      if (cellIndex < 0) {
        throw new Error(`${filename}: legacy universe anchor is not inside a table cell`);
      }

      const label = visibleHtml(anchorMatch[3]);
      if (!label) throw new Error(`${filename}: legacy universe anchor has an empty visible label`);
      const cell = cells[cellIndex];
      const prefixLength = anchorStart - cell.indices[1][0];
      const visiblePrefix = visibleHtml(cell[1].slice(0, prefixLength));

      anchors.push({
        filename,
        order: order += 1,
        universeId: canonicalUniverseFragment(anchorMatch[2]).slice('#universe-'.length),
        label,
        labelOrdinal: occurrenceCount(visiblePrefix, label),
        cellIndex,
        rowSignature,
        signatureKey: JSON.stringify(rowSignature),
      });
    }
  }

  return anchors;
}

function collectCurrentRows(tree) {
  const rows = [];
  walk(tree, (node) => {
    if (node.type !== 'tableRow') return;
    const signature = (node.children ?? []).map((cell) => normalizeVisibleText(textContent(cell)));
    rows.push({ node, signature, signatureKey: JSON.stringify(signature) });
  });
  return rows;
}

function collectLabelEvents(node, label, events = []) {
  if (node.type === 'link') {
    const visible = textContent(node);
    let cursor = 0;
    while ((cursor = visible.indexOf(label, cursor)) >= 0) {
      events.push({ kind: 'link', node, index: cursor });
      cursor += label.length;
    }
    return events;
  }

  if (node.type === 'text') {
    let cursor = 0;
    while ((cursor = node.value.indexOf(label, cursor)) >= 0) {
      events.push({
        kind: 'text',
        node,
        start: node.position?.start?.offset + cursor,
        end: node.position?.start?.offset + cursor + label.length,
      });
      cursor += label.length;
    }
    return events;
  }

  for (const child of node.children ?? []) collectLabelEvents(child, label, events);
  return events;
}

function markdownLinkLabel(label) {
  return label.replace(/\\/gu, '\\\\').replace(/\]/gu, '\\]');
}

function countUniverseLinks(tree) {
  let count = 0;
  walk(tree, (node) => {
    if (node.type === 'link' && node.url.startsWith('#universe-')) count += 1;
  });
  return count;
}

function formatIssue(issue) {
  const identity = `${issue.anchor.label} -> #universe-${issue.anchor.universeId}`;
  return `${issue.anchor.filename} [legacy anchor ${issue.anchor.order}: ${identity}]: ${issue.reason}`;
}

async function recoverFile(filename) {
  const absolutePath = path.join(repoRoot, filename);
  const [source, legacySource] = await Promise.all([
    readFile(absolutePath, 'utf8'),
    Promise.resolve(execFileSync('git', ['show', `${legacyRef}:${filename}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })),
  ]);
  const tree = markdownToMdast(source);
  const legacyAnchors = extractLegacyAnchors(legacySource, filename);
  const currentRows = collectCurrentRows(tree);
  const legacyGroups = new Map();
  const currentGroups = new Map();

  for (const anchor of legacyAnchors) {
    if (!legacyGroups.has(anchor.signatureKey)) legacyGroups.set(anchor.signatureKey, []);
    legacyGroups.get(anchor.signatureKey).push(anchor);
  }
  for (const row of currentRows) {
    if (!currentGroups.has(row.signatureKey)) currentGroups.set(row.signatureKey, []);
    currentGroups.get(row.signatureKey).push(row);
  }

  const patches = [];
  const unresolved = [];
  const ambiguous = [];
  let alreadyLinked = 0;

  for (const [signatureKey, anchors] of legacyGroups) {
    const rows = currentGroups.get(signatureKey) ?? [];
    if (rows.length !== anchors.length) {
      const bucket = rows.length > anchors.length ? ambiguous : unresolved;
      for (const anchor of anchors) {
        bucket.push({
          anchor,
          reason: `exact visible row occurs ${rows.length} time(s) currently and ${anchors.length} time(s) in legacy source`,
        });
      }
      continue;
    }

    anchors.forEach((anchor, index) => {
      const row = rows[index].node;
      const cell = row.children?.[anchor.cellIndex];
      if (!cell) {
        unresolved.push({ anchor, reason: `matched row has no cell ${anchor.cellIndex + 1}` });
        return;
      }

      const events = collectLabelEvents(cell, anchor.label);
      const event = events[anchor.labelOrdinal];
      if (!event) {
        unresolved.push({
          anchor,
          reason: `label occurrence ${anchor.labelOrdinal + 1} is not represented by one Markdown text/link node`,
        });
        return;
      }

      const expectedUrl = `#universe-${anchor.universeId}`;
      if (event.kind === 'link') {
        if (event.node.url === expectedUrl && textContent(event.node) === anchor.label) {
          alreadyLinked += 1;
        } else {
          ambiguous.push({
            anchor,
            reason: `matching occurrence is already linked as '${event.node.url}' with label '${textContent(event.node)}'`,
          });
        }
        return;
      }

      if (!Number.isInteger(event.start) || source.slice(event.start, event.end) !== anchor.label) {
        unresolved.push({
          anchor,
          reason: 'source spelling differs from the exact visible legacy label; refusing an encoded-text rewrite',
        });
        return;
      }
      patches.push({
        start: event.start,
        end: event.end,
        replacement: `[${markdownLinkLabel(anchor.label)}](${expectedUrl})`,
        anchor,
      });
    });
  }

  const orderedPatches = patches.sort((left, right) => right.start - left.start);
  for (let index = 1; index < orderedPatches.length; index += 1) {
    if (orderedPatches[index - 1].start < orderedPatches[index].end) {
      throw new Error(`${filename}: generated overlapping universe-link patches`);
    }
  }

  let output = source;
  for (const patch of orderedPatches) {
    output = output.slice(0, patch.start) + patch.replacement + output.slice(patch.end);
  }

  const beforeLinks = countUniverseLinks(tree);
  const afterLinks = countUniverseLinks(markdownToMdast(output));
  if (afterLinks !== beforeLinks + patches.length) {
    throw new Error(`${filename}: expected ${beforeLinks + patches.length} universe links after recovery, found ${afterLinks}`);
  }
  if (write && output !== source) await writeFile(absolutePath, output);

  return {
    filename,
    legacy: legacyAnchors.length,
    beforeLinks,
    afterLinks,
    recovered: patches.length,
    alreadyLinked,
    unresolved,
    ambiguous,
  };
}

async function main() {
  const filenames = execFileSync('git', [
    'ls-tree', '-r', '--name-only', legacyRef, '--', 'src/content/phases', 'src/content/phases-es',
  ], { cwd: repoRoot, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((filename) => filename.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right));
  if (filenames.length !== 16) {
    throw new Error(`Expected 16 legacy phase files at ${legacyRef}, found ${filenames.length}`);
  }

  const results = [];
  for (const filename of filenames) results.push(await recoverFile(filename));

  const totals = results.reduce((summary, result) => ({
    legacy: summary.legacy + result.legacy,
    beforeLinks: summary.beforeLinks + result.beforeLinks,
    afterLinks: summary.afterLinks + result.afterLinks,
    recovered: summary.recovered + result.recovered,
    alreadyLinked: summary.alreadyLinked + result.alreadyLinked,
    unresolved: summary.unresolved + result.unresolved.length,
    ambiguous: summary.ambiguous + result.ambiguous.length,
  }), {
    legacy: 0,
    beforeLinks: 0,
    afterLinks: 0,
    recovered: 0,
    alreadyLinked: 0,
    unresolved: 0,
    ambiguous: 0,
  });

  for (const result of results.filter((entry) => entry.legacy > 0)) {
    console.log(
      `${result.filename}: legacy ${result.legacy}; existing ${result.alreadyLinked}; `
      + `recovered ${result.recovered}; residual ${result.unresolved.length + result.ambiguous.length}`
    );
  }
  for (const result of results) {
    for (const issue of result.unresolved) console.error(`UNRESOLVED: ${formatIssue(issue)}`);
    for (const issue of result.ambiguous) console.error(`AMBIGUOUS: ${formatIssue(issue)}`);
  }

  const mode = write ? 'write' : 'dry-run';
  console.log(
    `Universe-link recovery (${mode}, legacy ${legacyRef}): `
    + `${totals.legacy} legacy data anchors; ${totals.beforeLinks} ordinary links before; `
    + `${totals.recovered} recovered; ${totals.alreadyLinked} already recovered; `
    + `${totals.afterLinks} ordinary links after; ${totals.unresolved} unresolved; ${totals.ambiguous} ambiguous.`
  );

  if (totals.unresolved > 0 || totals.ambiguous > 0) process.exitCode = 1;
}

await main();
