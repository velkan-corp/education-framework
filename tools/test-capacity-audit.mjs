import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateModel, validatePlan } from './audit-capacity.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), 'utf8'));
}

function clone(value) {
  return structuredClone(value);
}

function expectRejected(model, name, plan, expectedPatterns) {
  const audit = validatePlan(model, plan, `negative-control:${name}`);
  const missingPatterns = expectedPatterns.filter(
    (pattern) => !audit.errors.some((error) => pattern.test(error))
  );

  if (audit.errors.length === 0 || missingPatterns.length > 0) {
    const details = audit.errors.length > 0 ? audit.errors.join('\n  ') : 'validator returned no errors';
    throw new Error(
      `${name}: negative control was not rejected as specified.\n`
      + `Missing diagnostics: ${missingPatterns.join(', ') || 'any rejection'}\n`
      + `Observed:\n  ${details}`
    );
  }

  console.log(`PASS  Rejected ${name}: ${expectedPatterns.length} required diagnostic(s) observed.`);
}

async function main() {
  const model = await readJson('config/capacity-model.json');
  const standard = await readJson('docs/examples/capacity-plan.age-14-16.overlay.standard.json');
  const intensive = await readJson('docs/examples/capacity-plan.age-14-16.full-school.intensive.json');

  const modelAudit = validateModel(model);
  if (modelAudit.errors.length > 0) {
    throw new Error(`Cannot run negative controls against an invalid model:\n${modelAudit.errors.join('\n')}`);
  }
  for (const [name, plan] of [['standard control', standard], ['intensive control', intensive]]) {
    const audit = validatePlan(model, plan, name);
    if (audit.errors.length > 0) throw new Error(`${name} must be valid:\n${audit.errors.join('\n')}`);
  }

  console.log('\nCapacity validator negative controls');

  const unsafeHardCap = clone(model);
  unsafeHardCap.phases
    .find((phase) => phase.id === 'age-17-18')
    .capacity.overlay.hardCapHours = 13;
  const unsafeHardCapAudit = validateModel(unsafeHardCap);
  if (!unsafeHardCapAudit.errors.some((error) => /hard cap must preserve at least 2 hours/.test(error))) {
    throw new Error('unsafe hard-cap negative control was not rejected for insufficient contingency.');
  }
  console.log('PASS  Rejected hard cap with less than 2 hours of weekly contingency.');

  const tooManyAlternatives = clone(standard);
  tooManyAlternatives.alternatives.push({
    id: 'third-simultaneous-elective',
    poolId: 'music-movement',
    hours: 1,
    owner: 'music-coach',
  });
  expectRejected(model, 'too many simultaneous alternatives', tooManyAlternatives, [
    /requires exactly 2 alternative slot\(s\), found 3/,
  ]);

  const missingGuarantee = clone(standard);
  missingGuarantee.guaranteesCovered = missingGuarantee.guaranteesCovered.slice(1);
  expectRejected(model, 'missing required guarantee', missingGuarantee, [
    /missing guarantees responsive-relationship/,
  ]);

  const missingOwner = clone(standard);
  delete missingOwner.owners.academic;
  expectRejected(model, 'missing named owner', missingOwner, [
    /missing named owner for academic/,
  ]);

  const reducedSleep = clone(standard);
  reducedSleep.protectedSleepHoursPerNight -= 0.5;
  expectRejected(model, 'sleep below the phase floor', reducedSleep, [
    /protected sleep must be at least 9 hours\/night/,
  ]);

  const removedUnstructuredTime = clone(standard);
  removedUnstructuredTime.protectedUnstructuredHoursPerWeek = 0;
  expectRejected(model, 'removed unstructured slack', removedUnstructuredTime, [
    /protect at least 18\.9 unstructured hours\/week/,
  ]);

  const consumedBuffer = clone(standard);
  consumedBuffer.alternatives[0].hours += 1;
  expectRejected(model, 'consumed protected buffer', consumedBuffer, [
    /schedule consumes the protected 1-hour buffer/,
  ]);

  const overloadedWeek = clone(intensive);
  overloadedWeek.protectedSleepHoursPerNight = 12;
  expectRejected(model, 'overloaded 168-hour ledger', overloadedWeek, [
    /plan overloads the 168-hour week/,
  ]);

  const excessiveIntensive = clone(intensive);
  excessiveIntensive.intensive.durationWeeks += 1;
  excessiveIntensive.rotationWeeks = excessiveIntensive.intensive.durationWeeks;
  expectRejected(model, 'intensive beyond phase duration', excessiveIntensive, [
    /intensive duration exceeds the 6-week phase limit/,
  ]);
}

await main();
