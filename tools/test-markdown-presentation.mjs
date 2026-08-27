import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { markdownToHtml } from 'satteri';
import {
  phasePresentationPlugin,
  resolveLegacyProfileClass,
} from '../src/markdown/phasePresentation.mjs';
import { resolvePhaseSection } from '../src/markdown/phaseSections.mjs';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');
const fixtureDir = path.join(toolsDir, 'fixtures');

async function renderFixture(filename, phaseId) {
  const sourcePath = path.join(fixtureDir, filename);
  const source = await readFile(sourcePath, 'utf8');
  assert.doesNotMatch(source, /<\/?(?:div|span|p|h[1-6]|ol|li|blockquote|table)\b/iu);

  const result = markdownToHtml(source, {
    hastPlugins: [phasePresentationPlugin],
    fileURL: pathToFileURL(sourcePath),
    data: { astro: { frontmatter: { phaseId } } },
  });
  return result.html;
}

function occurrences(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

const english = await renderFixture('semantic-phase-en.md', 'age-17-18');
assert.match(english, /<p class="subtitle">The first paragraph/u);
assert.match(
  english,
  /<h2 class="phase-section-heading" id="s-activity" data-section-key="activity"><span class="material-symbols-rounded" aria-hidden="true">calendar_month<\/span>Activity Map<\/h2>/u
);
assert.match(english, /<ol class="target-grid" data-target-map="">/u);
assert.equal(occurrences(english, /<li class="target-card">/gu), 2);
assert.match(english, /<span class="target-num" aria-hidden="true">2<\/span>/u);
assert.match(english, /<h3 class="priority-heading" data-section-key="priorities">/u);
assert.match(english, /<ol class="priority-box" data-priority-list="">/u);
assert.equal(occurrences(english, /<li class="priority-item">/gu), 2);
assert.match(english, /<blockquote class="note-box" data-callout="note">/u);
assert.match(english, /<blockquote class="warn-box" data-callout="warning">/u);
assert.match(english, /<blockquote class="evidence evidence-callout" data-callout="evidence">/u);
assert.match(english, /<blockquote class="t-adjust t-introvert" data-profile="Introvert">/u);
assert.match(english, /<strong class="t-label">Profile — Introvert\.<\/strong>/u);
assert.match(
  english,
  /id="s-communication" data-section-key="communication" data-tier="foundational"/u
);
assert.match(
  english,
  /id="s-culture" data-section-key="culture" data-tier="core"/u
);
assert.match(english, /<table class="phase-table" data-section-key="culture">/u);

const spanish = await renderFixture('semantic-phase-es.md', 'age-14-16');
assert.match(spanish, /<p class="subtitle">El primer párrafo/u);
assert.match(spanish, /id="s-activity" data-section-key="activity"/u);
assert.match(spanish, /<ol class="target-grid" data-target-map="">/u);
assert.match(spanish, /<blockquote class="note-box" data-callout="note">/u);
assert.match(spanish, /<blockquote class="warn-box" data-callout="warning">/u);
assert.match(spanish, /<blockquote class="evidence evidence-callout" data-callout="evidence">/u);
assert.match(spanish, /<blockquote class="t-adjust t-high-react" data-profile="Alta Reactividad">/u);
assert.match(
  spanish,
  /id="s-communication" data-section-key="communication" data-tier="foundational"/u
);
assert.match(
  spanish,
  /id="s-culture" data-section-key="culture" data-tier="recommended"/u
);

assert.deepEqual(resolvePhaseSection('Mapa de Actividades', 'age-14-16'), {
  key: 'activity',
  id: 's-activity',
  icon: 'calendar_month',
  tier: undefined,
});
assert.equal(resolvePhaseSection('Social & Relational', 'age-14-16')?.tier, 'core');
assert.equal(resolvePhaseSection('Social & Relational', 'age-11-13')?.tier, 'foundational');
assert.equal(resolvePhaseSection('How to Know It’s Working', 'framework')?.key, 'measure');
assert.equal(resolvePhaseSection('Unknown Section', 'age-11-13'), undefined);

const framework = markdownToHtml('### Principle 1 — Compounding\n\n> *Start early.*\n\n> **Evidence.**\n>\n> Visible basis.', {
  hastPlugins: [phasePresentationPlugin],
  fileURL: pathToFileURL(path.join(fixtureDir, 'framework.md')),
  data: { astro: { frontmatter: { phaseId: 'framework' } } },
}).html;
assert.match(framework, /class="principle-thesis" data-callout="principle-thesis"/u);
assert.match(framework, /class="evidence evidence-callout" data-callout="evidence"/u);

const praiseTable = markdownToHtml('## Parenting Foundations\n\n#### Anti-Pattern Table — English\n\n| Verbal default to eliminate | Why | Replacement |\n|---|---|---|\n| Good job | Generic | Describe the act |', {
  hastPlugins: [phasePresentationPlugin],
  fileURL: pathToFileURL(path.join(fixtureDir, 'framework.md')),
  data: { astro: { frontmatter: { phaseId: 'framework' } } },
}).html;
assert.match(praiseTable, /<table class="praise-antipattern phase-table" data-section-key="attachment">/u);

const nonPhase = markdownToHtml('# Universe\n\n## Music\n\n> **Evidence.** Plain content.', {
  hastPlugins: [phasePresentationPlugin],
  fileURL: pathToFileURL(path.join(fixtureDir, 'universe.md')),
}).html;
assert.doesNotMatch(nonPhase, /phase-section-heading|data-section-key|data-callout/u);

const profileExpectations = [
  ['Introvert — Hardship Escalation', 't-introvert'],
  ['Extrovert — Power Structures', 't-extrovert'],
  ['High Reactivity — Route Design', 't-high-react'],
  ['Reactividad Alta', 't-high-react'],
  ['Baja Reactividad — Dosis de Práctica', 't-low-react'],
  ['Reactividad Baja', 't-low-react'],
  ['Alta Autorregulación — Autonomía', 't-ec-high'],
  ['Autorregulacion Baja', 't-ec-low'],
  ['Communication: Advanced', 't-comm-adv'],
  ['Comunicación: En Desarrollo', 't-comm-dev'],
  ['Problem Solving: Advanced', 't-ps-adv'],
  ['Resolución de Problemas: En Desarrollo', 't-ps-dev'],
  ['Gross Motor: Advanced', 't-gm-adv'],
  ['Motricidad Gruesa: En Desarrollo', 't-gm-dev'],
  ['Fine Motor: Advanced', 't-fm-adv'],
  ['Motricidad Fina: En Desarrollo', 't-fm-dev'],
  ['Personal-Social: Advanced — Power', 't-social-adv'],
  ['Personal-Social en Desarrollo — Colocación Social Desconocida', 't-social-dev'],
  ['Inhibit: Advanced', 't-inhib-adv'],
  ['Inhibición en Desarrollo — Consecuencias Reales', 't-inhib-dev'],
  ['Shift: Advanced', 't-shift-adv'],
  ['Flexibilidad Cognitiva: En Desarrollo', 't-shift-dev'],
  ['Emotional Control: Advanced', 't-emoctl-adv'],
  ['Control Emocional en Desarrollo — Autonomía', 't-emoctl-dev'],
  ['Working Memory: Advanced', 't-wm-adv'],
  ['Memoria de Trabajo: En Desarrollo', 't-wm-dev'],
  ['Plan/Organize: Advanced', 't-plan-adv'],
  ['Planificación/Organización: En Desarrollo', 't-plan-dev'],
];
assert.equal(new Set(profileExpectations.map(([, className]) => className)).size, 26);
for (const [label, expectedClass] of profileExpectations) {
  assert.equal(resolveLegacyProfileClass(label), expectedClass, label);
}

async function auditHeadingCoverage() {
  const localeDirectories = ['phases', 'phases-es'];
  const summary = {};
  for (const directory of localeDirectories) {
    const sourceDirectory = path.join(repoRoot, 'src', 'content', directory);
    const phaseFilenames = (await readdir(sourceDirectory)).filter((name) => name.endsWith('.md'));
    let headings = 0;
    let tiered = 0;
    for (const filename of phaseFilenames) {
      const source = await readFile(path.join(sourceDirectory, filename), 'utf8');
      const phaseId = filename.replace(/\.md$/u, '');
      const rawHeadingTitles = new Set();
      for (const match of source.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gu)) {
        const attributes = match[1];
        const body = match[2];
        const expectedId = attributes.match(/\bid="([^"]+)"/u)?.[1];
        const expectedTier = attributes.match(/\bdata-tier="([^"]+)"/u)?.[1];
        const expectedIcon = body.match(/<span[^>]*material-symbols-rounded[^>]*>([^<]*)<\/span>/u)?.[1] ?? '';
        const visibleTitle = body
          .replace(/<[^>]+>/gu, '')
          .replace(expectedIcon, '')
          .replace(/&amp;/gu, '&')
          .trim();
        rawHeadingTitles.add(visibleTitle);
        const resolved = resolvePhaseSection(visibleTitle, phaseId);
        assert.ok(resolved, `${directory}/${filename}: unmapped legacy H2 '${visibleTitle}'`);
        assert.equal(resolved.id, expectedId, `${directory}/${filename}: ${visibleTitle} ID`);
        assert.equal(resolved.icon, expectedIcon, `${directory}/${filename}: ${visibleTitle} icon`);
        assert.equal(resolved.tier, expectedTier, `${directory}/${filename}: ${visibleTitle} tier`);
        headings += 1;
        if (expectedTier) tiered += 1;
      }
      for (const match of source.matchAll(/^##[ \t]+(.+?)[ \t]*$/gmu)) {
        const visibleTitle = match[1].trim();
        if (rawHeadingTitles.has(visibleTitle)) continue;
        const resolved = resolvePhaseSection(visibleTitle, phaseId);
        assert.ok(resolved, `${directory}/${filename}: unmapped semantic H2 '${visibleTitle}'`);
        headings += 1;
        if (resolved.tier) tiered += 1;
      }
    }
    summary[directory] = { headings, tiered };
  }
  return summary;
}

const coverage = await auditHeadingCoverage();
assert.deepEqual(coverage, {
  phases: { headings: 107, tiered: 59 },
  'phases-es': { headings: 107, tiered: 59 },
});

console.log('Markdown presentation tests passed (EN/ES semantic fixtures, 214 stable H2 mappings, 118 tiered headings, and 26 profile classes).');
