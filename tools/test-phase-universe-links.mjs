#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  canonicalUniverseFragment,
  rewriteLegacyUniverseAnchorHrefs,
} from './lib/phaseUniverseLinks.mjs';

assert.equal(canonicalUniverseFragment('  dune.md  '), '#universe-dune');
assert.equal(canonicalUniverseFragment('#universe-star-wars'), '#universe-star-wars');

const legacy = '<p><a class="resource" data-universe-nav="dune.md">Dune</a></p>';
const migrated = rewriteLegacyUniverseAnchorHrefs(legacy);
assert.equal(migrated.rewritten, 1);
assert.equal(
  migrated.source,
  '<p><a class="resource" data-universe-nav="dune.md" href="#universe-dune">Dune</a></p>'
);

const canonical = rewriteLegacyUniverseAnchorHrefs(
  '<a data-universe-nav="dune.md" href="#universe-dune">Dune</a>'
);
assert.equal(canonical.rewritten, 0);
assert.equal(canonical.source, '<a data-universe-nav="dune.md" href="#universe-dune">Dune</a>');

assert.throws(
  () => rewriteLegacyUniverseAnchorHrefs(
    '<a data-universe-nav="dune.md" href="#universe-arrakis">Dune</a>'
  ),
  /conflicting href/u
);

const ordinary = '<a href="#universe-dune">Dune</a>';
assert.deepEqual(rewriteLegacyUniverseAnchorHrefs(ordinary), { source: ordinary, rewritten: 0 });

console.log('PASS: legacy universe anchors receive canonical hrefs before Markdown migration; conflicts fail closed.');
