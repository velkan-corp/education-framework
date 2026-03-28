/**
 * One-time extraction script.
 * Reads the original index.html, extracts each SECTIONS entry,
 * and writes it as a Markdown file with frontmatter.
 *
 * Usage: node extract-content.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const html = readFileSync('index.html', 'utf-8');

// The TABS array defines the order and labels
const tabs = [
  { id: 'philosophy', label: 'Philosophy', order: 0 },
  { id: 'age-0-1', label: '0–1', order: 1 },
  { id: 'age-1-3', label: '1–3', order: 2 },
  { id: 'age-4-7', label: '4–7', order: 3 },
  { id: 'age-8-10', label: '8–10', order: 4 },
  { id: 'age-11-13', label: '11–13', order: 5 },
  { id: 'age-14-16', label: '14–16', order: 6 },
  { id: 'age-17-18', label: '17–18', order: 7 },
  { id: 'meta', label: 'Meta', order: 8 },
];

const outDir = join(process.cwd(), 'src', 'content', 'phases');
mkdirSync(outDir, { recursive: true });

// Extract each section from the SECTIONS object.
// Each section is delimited by: 'section-id': `...content...`,
// followed by the next section or the closing };
for (let i = 0; i < tabs.length; i++) {
  const tab = tabs[i];

  // Find the start of this section's content (after the backtick)
  // Keys may be quoted ('age-0-1') or unquoted (philosophy, meta)
  let sectionKey = `'${tab.id}': \``;
  let startIdx = html.indexOf(sectionKey);
  if (startIdx === -1) {
    sectionKey = `${tab.id}: \``;
    startIdx = html.indexOf(sectionKey);
  }
  if (startIdx === -1) {
    console.error(`Could not find section: ${tab.id}`);
    continue;
  }

  const contentStart = startIdx + sectionKey.length;

  // Find the closing backtick followed by comma or };
  // We need to find the unescaped backtick that closes this template literal
  let contentEnd = -1;
  let j = contentStart;
  while (j < html.length) {
    if (html[j] === '\\' && html[j + 1] === '`') {
      j += 2; // skip escaped backtick
      continue;
    }
    if (html[j] === '`') {
      contentEnd = j;
      break;
    }
    j++;
  }

  if (contentEnd === -1) {
    console.error(`Could not find end of section: ${tab.id}`);
    continue;
  }

  let content = html.substring(contentStart, contentEnd).trim();

  // Unescape any escaped backticks
  content = content.replace(/\\`/g, '`');

  // Build the markdown file with frontmatter
  const frontmatter = [
    '---',
    `id: "${tab.id}"`,
    `label: "${tab.label}"`,
    `order: ${tab.order}`,
    '---',
    '',
  ].join('\n');

  const filename = `${tab.id}.md`;
  const filepath = join(outDir, filename);

  writeFileSync(filepath, frontmatter + content + '\n', 'utf-8');
  console.log(`Extracted: ${filename} (${content.length} chars)`);
}

console.log('\nDone. Files written to src/content/phases/');
