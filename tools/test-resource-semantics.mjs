#!/usr/bin/env node

import assert from 'node:assert/strict';
import { inferTrailingResourceTargets } from '../src/scripts/resources.js';

const englishTargets = [
  'Resilient Self-Efficacy',
  'First-Principles Reasoning',
  'Physical System Mastery',
];
const spanishTargets = [
  'Autoeficacia Resiliente',
  'Razonamiento desde Primeros Principios',
  'Autoconciencia y Autorregulación',
];

assert.deepEqual(
  inferTrailingResourceTargets('A difficult puzzle sequence. First-Principles Reasoning', englishTargets),
  ['First-Principles Reasoning']
);
assert.deepEqual(
  inferTrailingResourceTargets('Introducción gradual. Semilla de Autoconciencia y Autorregulacion.', spanishTargets),
  ['Autoconciencia y Autorregulación']
);
assert.deepEqual(
  inferTrailingResourceTargets('Builds a Resilient Self-Efficacy seed!', englishTargets),
  ['Resilient Self-Efficacy']
);
assert.deepEqual(
  inferTrailingResourceTargets('First-Principles Reasoning appears here, but the description continues.', englishTargets),
  []
);
assert.deepEqual(inferTrailingResourceTargets('', englishTargets), []);

console.log('PASS: semantic resource target inference handles EN/ES suffixes, seed forms, accents, punctuation, and non-trailing rejection.');
