#!/usr/bin/env node

import assert from 'node:assert/strict';
import { markdownToMdast } from 'satteri';
import {
  DEFAULT_UNIVERSE_ALIASES,
  auditBilingualResourceLinkParity,
  auditLocaleUniverseLinks,
} from './lib/universeLinkAudit.mjs';

const universeIds = new Set(DEFAULT_UNIVERSE_ALIASES.map((entry) => entry.id));

function phaseFile(filename, resourceMarkdown) {
  return {
    filename,
    tree: markdownToMdast(`---\nphaseId: age-14-16\n---\n\n## Resources\n\n${resourceMarkdown}`),
  };
}

function audit(localeId, markdown) {
  return auditLocaleUniverseLinks({
    localeId,
    phaseFiles: [phaseFile('age-14-16.md', markdown)],
    universeIds,
  });
}

const validEnglish = audit('en', `| Resource | Why |\n|---|---|\n| [Dune](#universe-dune) | Systems novel. |`);
const validSpanish = audit('es', `| Recurso | Por qué |\n|---|---|\n| [Dune](#universe-dune) | Novela de sistemas. |`);
assert.deepEqual(validEnglish.errors, []);
assert.deepEqual(validSpanish.errors, []);
assert.deepEqual(auditBilingualResourceLinkParity(validEnglish, validSpanish), []);
console.log('PASS  Accepted canonical semantic universe links with equivalent EN/ES resource resolution.');

const missingEnglish = audit('en', `| Resource | Why |\n|---|---|\n| Dune | Systems novel. |`);
assert.match(
  missingEnglish.errors.join('\n'),
  /resource 'Dune' recognizes \[Dune\] but the recognized title itself is not linked to #universe-dune/u
);
console.log('PASS  Rejected an unlinked recognizable universe title in a resource row.');

const misplacedLink = audit('en', `| Resource | Why |\n|---|---|\n| Dune | [Analysis](#universe-dune) |`);
assert.match(misplacedLink.errors.join('\n'), /recognized title itself is not linked to #universe-dune/u);
console.log('PASS  Rejected a universe link hidden outside the resource-title cell.');

const wrongSpan = audit('en', `| Resource | Why |\n|---|---|\n| Dune [details](#universe-dune) | Systems novel. |`);
assert.match(wrongSpan.errors.join('\n'), /recognized title itself is not linked to #universe-dune/u);
console.log('PASS  Rejected a nearby link that does not wrap the recognized title.');

const canonicalMediaCoverage = audit('en', `| Resource | Why |
|---|---|
| Batman: The Animated Series | Film. |
| Spider-Man: Into the Spider-Verse | Film. |
| WALL-E | Film. |`);
assert.match(canonicalMediaCoverage.errors.join('\n'), /#universe-dc-marvel/u);
assert.match(canonicalMediaCoverage.errors.join('\n'), /#universe-pixar/u);
console.log('PASS  Audited the reviewed DC/Marvel and Pixar resource aliases.');

const gameTable = audit('en', `| Game | What It Teaches |
|---|---|
| Chess (Lichess) | Strategy. |`);
assert.match(gameTable.errors.join('\n'), /#universe-chess/u);
console.log('PASS  Audited semantic Game/Juego resource tables.');

const tierPrefixResource = audit('en', `| Resource | Why |
|---|---|
| Core Dune Sequence | A real resource, not a separator. |`);
assert.match(tierPrefixResource.errors.join('\n'), /#universe-dune/u);
console.log('PASS  Did not mistake a resource beginning with Core for a tier separator.');

const reviewedDomainAliases = [
  ['Duplo Large Set', 'lego'],
  ['Duplo Large Creative Box', 'lego'],
  ['Tumbling Mat (folding panel)', 'gymnastics-acrobatics'],
  ['Gymnastics Mat (folding panel)', 'gymnastics-acrobatics'],
  ['Gymnastics Rings', 'gymnastics-acrobatics'],
  ['Anillas de gimnasia', 'gymnastics-acrobatics'],
  ['Latin Dance Family Playlist', 'dance'],
  ['Ballet Shoes — Bloch Bunnyhop', 'dance'],
  ['Latin Dance Shoes — Supadance', 'dance'],
  ['Sensory Material Sample Box (DIY)', 'material-craft'],
  ['Kintsugi Repair Kit', 'material-craft'],
  ['Kit de reparación Kintsugi', 'material-craft'],
  ['Shoe Goo', 'material-craft'],
  ['Child-Sized Cooking Tools', 'cooking'],
  ['Jiu-Jitsu or martial arts enrollment', 'martial-arts'],
  ['Inscripción en Jiu-Jitsu o artes marciales', 'martial-arts'],
  ['Gracie Jiu-Jitsu Bullyproof Kids Program', 'martial-arts'],
  ['DK Eyewitness Series', 'dk-visual-reference'],
  ['Nat Geo Kids Magazine', 'dk-visual-reference'],
  ['Horrible Histories', 'dk-visual-reference'],
  ['Cubetto Playset', 'coding'],
  ['Scratch → Python transition', 'coding'],
  ['Transición de Scratch a Python', 'coding'],
  ['Automate the Boring Stuff with Python', 'coding'],
  ['Moonjar Save Spend Share Bank', 'personal-finance'],
  ["The Emperor's New Clothes — H.C. Andersen", 'fairy-tales'],
  ['García Lorca — Selected Poetry', 'poetry'],
  ['Octavio Paz — selected essays', 'poetry'],
  ['Plato — Apology, Republic', 'western-philosophy'],
  ['Seneca — Letters from a Stoic', 'western-philosophy'],
  ['Marcus Aurelius — Meditations', 'western-philosophy'],
  ['Nietzsche — Beyond Good and Evil', 'western-philosophy'],
  ['Adam Smith — Wealth of Nations', 'economics'],
  ['Anki (spaced repetition)', 'cognitive-science'],
  ['Connectography (Parag Khanna)', 'spatial-intelligence'],
  ["Grimm's Rainbow + Nesting Cups", 'spatial-intelligence'],
  ["Grimm's Nesting/Stacking Cups", 'spatial-intelligence'],
  ['Magna-Tiles (100 pieces)', 'spatial-intelligence'],
  ['Brio World Wooden Train System', 'spatial-intelligence'],
  ['Hape Shape Sorting Box', 'spatial-intelligence'],
  ['Plan Toys Sorting Bus', 'spatial-intelligence'],
  ['Thucydides — Peloponnesian War', 'historical-cycles'],
  ['Book of Job', 'bible-as-literature'],
];
for (const [label, universeId] of reviewedDomainAliases) {
  const result = audit('en', `| Resource | Why |\n|---|---|\n| ${label} | Reviewed resource identity. |`);
  assert.match(result.errors.join('\n'), new RegExp(`#universe-${universeId}`, 'u'), label);
}
console.log('PASS  Audited every reviewed resource-to-domain alias in the explicit coverage contract.');

const ordinaryProse = audit('en', `Read Dune before comparing its political ecology.\n\n| Resource | Why |\n|---|---|\n| Reference text | Systems novel. |`);
assert.deepEqual(ordinaryProse.errors, []);
console.log('PASS  Ignored ordinary prose outside the curated resource-row contract.');

const wrongTarget = audit('en', `| Resource | Why |\n|---|---|\n| [Dune](#universe-lotgh) | Systems novel. |`);
assert.match(wrongTarget.errors.join('\n'), /linked label 'Dune' recognizes dune, not lotgh/u);
assert.match(wrongTarget.errors.join('\n'), /is not linked to #universe-dune/u);
console.log('PASS  Rejected a recognizable title linked to the wrong universe ID.');

const finalCutWrongTarget = audit('en', `| Resource | Why |\n|---|---|\n| [Blade Runner](#universe-villeneuve): The Final Cut | Film. |`);
assert.match(
  finalCutWrongTarget.errors.join('\n'),
  /linked label 'Blade Runner' recognizes ridley-scott, not villeneuve/u
);
assert.match(finalCutWrongTarget.errors.join('\n'), /is not linked to #universe-ridley-scott/u);
console.log('PASS  Rejected the real Final Cut → Villeneuve attribution defect.');

const parityMismatch = auditBilingualResourceLinkParity(validEnglish, missingEnglish);
assert.match(parityMismatch.join('\n'), /EN resolves \[dune\], ES resolves \[\]/u);
console.log('PASS  Rejected unequal EN/ES universe resolution for equivalent resource rows.');

const untranslatedAliasContract = audit('es', `| Recurso | Por qué |\n|---|---|\n| [Novela de sistemas](#universe-dune) | Filosofía. |`);
const recognitionMismatch = auditBilingualResourceLinkParity(validEnglish, untranslatedAliasContract);
assert.match(recognitionMismatch.join('\n'), /EN recognizes \[dune\], ES recognizes \[\]/u);
console.log('PASS  Rejected equal links when the translated resource identity escaped recognition.');

const substitutedSpanish = audit('es', `| Recurso | Por qué |\n|---|---|\n| [Legend of the Galactic Heroes](#universe-lotgh) | Ópera espacial. |`);
const substitution = [{
  key: 'age-14-16.md:table-1:row-1',
  enIds: ['dune'],
  esIds: ['lotgh'],
  rationale: 'A deliberate locale-only replacement selected for this translated resource row.',
}];
assert.deepEqual(
  auditBilingualResourceLinkParity(validEnglish, substitutedSpanish, { substitutions: substitution }),
  []
);
console.log('PASS  Accepted an explicit locale-only substitution with exact IDs and rationale.');

const staleSubstitution = auditBilingualResourceLinkParity(validEnglish, validSpanish, {
  substitutions: substitution,
});
assert.match(staleSubstitution.join('\n'), /stale allowlist entry; EN and ES no longer differ/u);
console.log('PASS  Rejected a stale locale-substitution allowlist entry.');

const unjustified = auditBilingualResourceLinkParity(validEnglish, substitutedSpanish, {
  substitutions: [{ ...substitution[0], rationale: 'because' }],
});
assert.match(unjustified.join('\n'), /rationale must be at least 24 characters/u);
console.log('PASS  Rejected a locale-only substitution without a substantive rationale.');
