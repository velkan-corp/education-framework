import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const modelPath = path.join(repoRoot, 'config/capacity-model.json');
const examplesDir = path.join(repoRoot, 'docs/examples');
const EPSILON = 1e-9;
const HOURS_PER_WEEK = 168;

function nearlyEqual(left, right) {
  return Math.abs(left - right) < EPSILON;
}

function formatHours(value) {
  return Number(value).toFixed(1);
}

function scheduledHours(capacity, operatingMode) {
  if (operatingMode === 'minimum') return capacity.guaranteeHours;
  const mode = capacity[operatingMode];
  return capacity.guaranteeHours
    + mode.choiceSlots * mode.choiceSlotHours
    + (mode.focusHours ?? 0);
}

function capHours(capacity, operatingMode) {
  return operatingMode === 'minimum'
    ? capacity.guaranteeHours
    : capacity[operatingMode].capHours;
}

function bufferHours(capacity, operatingMode) {
  return operatingMode === 'minimum'
    ? 0
    : capacity[operatingMode].bufferHours;
}

function timeLedger(model, phase, deliveryMode, directedHours) {
  const sleep = phase.time.typicalSleepHoursPerNight * 7;
  const externalSchool = phase.time.externalSchoolAndCommuteHours[deliveryMode];
  const externalStudy = phase.time.externalStudyHours[deliveryMode];
  const nonSchoolWaking = HOURS_PER_WEEK - sleep - externalSchool;
  const unstructured = nonSchoolWaking * model.unstructuredShareOfNonSchoolWakingTime;
  const committed = sleep
    + externalSchool
    + externalStudy
    + phase.time.essentialCareHoursPerWeek
    + unstructured
    + directedHours;

  return {
    sleep,
    externalSchool,
    externalStudy,
    unstructured,
    committed,
    slack: HOURS_PER_WEEK - committed,
  };
}

export function validateModel(model) {
  const errors = [];
  const warnings = [];
  const phaseIds = new Set();
  const deliveryModeIds = Object.keys(model.deliveryModes);
  const guaranteeIds = new Set(Object.keys(model.guarantees));
  const poolIds = new Set(Object.keys(model.alternativePools));

  if (model.schemaVersion !== 1) errors.push(`Unsupported schemaVersion: ${model.schemaVersion}`);
  if (!(model.unstructuredShareOfNonSchoolWakingTime > 0 && model.unstructuredShareOfNonSchoolWakingTime < 1)) {
    errors.push('unstructuredShareOfNonSchoolWakingTime must be between 0 and 1.');
  }

  for (const phase of model.phases) {
    if (phaseIds.has(phase.id)) errors.push(`Duplicate phase id: ${phase.id}`);
    phaseIds.add(phase.id);

    if (!(phase.rotationWeeks.min > 0 && phase.rotationWeeks.max >= phase.rotationWeeks.min)) {
      errors.push(`${phase.id}: invalid rotationWeeks.`);
    }
    if (!(phase.intensiveMaxWeeks > 0 && phase.intensiveMaxWeeks <= phase.rotationWeeks.max)) {
      errors.push(`${phase.id}: intensiveMaxWeeks must be positive and no longer than the maximum rotation.`);
    }
    for (const guaranteeId of phase.guaranteeIds) {
      if (!guaranteeIds.has(guaranteeId)) errors.push(`${phase.id}: unknown guarantee ${guaranteeId}.`);
    }
    for (const poolId of phase.alternativePoolIds) {
      if (!poolIds.has(poolId)) errors.push(`${phase.id}: unknown alternative pool ${poolId}.`);
    }

    for (const deliveryMode of deliveryModeIds) {
      const capacity = phase.capacity[deliveryMode];
      if (!capacity) {
        errors.push(`${phase.id}/${deliveryMode}: missing capacity.`);
        continue;
      }

      const minimumCap = capacity.guaranteeHours;
      const standardCap = capacity.standard.capHours;
      const intensiveCap = capacity.intensive.capHours;
      if (!(minimumCap >= 0 && minimumCap <= standardCap && standardCap <= intensiveCap && intensiveCap <= capacity.hardCapHours)) {
        errors.push(`${phase.id}/${deliveryMode}: caps must rise minimum <= standard <= intensive <= hard cap.`);
      }

      for (const operatingMode of ['standard', 'intensive']) {
        const mode = capacity[operatingMode];
        const scheduled = scheduledHours(capacity, operatingMode);
        if (!nearlyEqual(scheduled + mode.bufferHours, mode.capHours)) {
          errors.push(
            `${phase.id}/${deliveryMode}/${operatingMode}: scheduled ${scheduled} + buffer ${mode.bufferHours} != cap ${mode.capHours}.`
          );
        }
        if (!(mode.bufferHours > 0)) {
          errors.push(`${phase.id}/${deliveryMode}/${operatingMode}: a positive unscheduled buffer is required.`);
        }
      }

      if (!(capacity.intensive.choiceSlots < capacity.standard.choiceSlots)) {
        errors.push(`${phase.id}/${deliveryMode}: intensive must remove at least one standard choice slot.`);
      }
      if (!(capacity.intensive.focusHours > 0)) {
        errors.push(`${phase.id}/${deliveryMode}: intensive requires positive focusHours.`);
      }

      const standardLedger = timeLedger(model, phase, deliveryMode, standardCap);
      const hardLedger = timeLedger(model, phase, deliveryMode, capacity.hardCapHours);
      if (standardLedger.slack < 4 - EPSILON) {
        errors.push(`${phase.id}/${deliveryMode}: standard cap leaves less than 4 hours of weekly contingency (${formatHours(standardLedger.slack)}).`);
      }
      if (hardLedger.slack < 2 - EPSILON) {
        errors.push(`${phase.id}/${deliveryMode}: hard cap must preserve at least 2 hours of weekly contingency; found ${formatHours(hardLedger.slack)}.`);
      }
    }

    const overlayIntensive = phase.capacity.overlay.intensive.capHours;
    const fullSchoolHardCap = phase.capacity.fullSchool.hardCapHours;
    if (phase.holidayIntensiveHardCapHours < overlayIntensive || phase.holidayIntensiveHardCapHours > fullSchoolHardCap) {
      errors.push(`${phase.id}: holiday intensive cap must fall between overlay intensive and full-school hard cap.`);
    }
  }

  return { errors, warnings };
}

function printCapacityTable(model) {
  const rows = [];
  for (const phase of model.phases) {
    for (const deliveryMode of Object.keys(model.deliveryModes)) {
      const capacity = phase.capacity[deliveryMode];
      const hardLedger = timeLedger(model, phase, deliveryMode, capacity.hardCapHours);
      rows.push({
        phase: phase.label,
        delivery: deliveryMode,
        minimum: capacity.guaranteeHours,
        standard: capacity.standard.capHours,
        intensive: capacity.intensive.capHours,
        hard: capacity.hardCapHours,
        hardSlack: hardLedger.slack,
      });
    }
  }

  const headers = ['Phase', 'Delivery', 'Min', 'Std', 'Int', 'Hard', 'Slack@hard'];
  const formatted = rows.map((row) => [
    row.phase,
    row.delivery,
    formatHours(row.minimum),
    formatHours(row.standard),
    formatHours(row.intensive),
    formatHours(row.hard),
    formatHours(row.hardSlack),
  ]);
  const widths = headers.map((header, index) => Math.max(header.length, ...formatted.map((row) => row[index].length)));
  const render = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');

  console.log('\nCapacity matrix (directed hours/week)');
  console.log(render(headers));
  console.log(render(widths.map((width) => '-'.repeat(width))));
  for (const row of formatted) console.log(render(row));
}

function validateEvaluation(plan, prefix, errors) {
  const evaluation = plan.evaluation;
  if (!evaluation || typeof evaluation !== 'object') {
    errors.push(`${prefix}: missing minimal evaluation loop.`);
    return;
  }
  for (const key of ['baseline', 'termHypothesis']) {
    if (typeof evaluation[key] !== 'string' || evaluation[key].trim().length < 20) {
      errors.push(`${prefix}: evaluation.${key} must be a concrete sentence.`);
    }
  }
  for (const [key, max] of [['leadingIndicators', 4], ['workSamples', 3]]) {
    if (!Array.isArray(evaluation[key]) || evaluation[key].length === 0 || evaluation[key].length > max) {
      errors.push(`${prefix}: evaluation.${key} must contain 1-${max} deliberately minimal items.`);
    }
  }
  const review = evaluation.quarterlyReview;
  if (!review || !(review.reviewCadenceWeeks >= 8 && review.reviewCadenceWeeks <= 18)) {
    errors.push(`${prefix}: quarterly review cadence must be 8-18 weeks.`);
  }
  const requiredDecisions = ['continue', 'modify', 'stop'];
  if (!review || !Array.isArray(review.decisionOptions) || requiredDecisions.some((value) => !review.decisionOptions.includes(value))) {
    errors.push(`${prefix}: quarterly review must permit continue, modify, and stop.`);
  }
  if (!review || typeof review.decisionRule !== 'string' || review.decisionRule.trim().length < 20) {
    errors.push(`${prefix}: quarterly review requires a concrete decisionRule.`);
  }
}

export function validatePlan(model, plan, sourceName) {
  const errors = [];
  const phase = model.phases.find((entry) => entry.id === plan.phaseId);
  const prefix = sourceName;
  if (!phase) return { errors: [`${prefix}: unknown phaseId ${plan.phaseId}.`] };
  if (!model.deliveryModes[plan.deliveryMode]) errors.push(`${prefix}: unknown deliveryMode ${plan.deliveryMode}.`);
  if (!model.operatingModes[plan.operatingMode]) errors.push(`${prefix}: unknown operatingMode ${plan.operatingMode}.`);
  if (errors.length > 0) return { errors };

  const capacity = phase.capacity[plan.deliveryMode];
  const operatingMode = plan.operatingMode;
  const mode = operatingMode === 'minimum' ? null : capacity[operatingMode];
  const expectedChoiceSlots = mode?.choiceSlots ?? 0;
  const expectedChoiceSlotHours = mode?.choiceSlotHours ?? 0;
  const alternatives = Array.isArray(plan.alternatives) ? plan.alternatives : [];
  const permittedPools = new Set(phase.alternativePoolIds);

  if (!nearlyEqual(plan.guaranteeHours, capacity.guaranteeHours)) {
    errors.push(`${prefix}: guaranteeHours must be ${capacity.guaranteeHours}; do not hide alternatives inside guarantees.`);
  }
  const covered = new Set(plan.guaranteesCovered ?? []);
  const missingGuarantees = phase.guaranteeIds.filter((id) => !covered.has(id));
  if (missingGuarantees.length > 0) errors.push(`${prefix}: missing guarantees ${missingGuarantees.join(', ')}.`);
  const unknownGuarantees = [...covered].filter((id) => !model.guarantees[id]);
  if (unknownGuarantees.length > 0) errors.push(`${prefix}: unknown guarantees ${unknownGuarantees.join(', ')}.`);

  if (alternatives.length !== expectedChoiceSlots) {
    errors.push(`${prefix}: ${operatingMode} requires exactly ${expectedChoiceSlots} alternative slot(s), found ${alternatives.length}.`);
  }
  const alternativeIds = new Set();
  for (const alternative of alternatives) {
    if (alternativeIds.has(alternative.id)) errors.push(`${prefix}: duplicate alternative id ${alternative.id}.`);
    alternativeIds.add(alternative.id);
    if (!permittedPools.has(alternative.poolId)) errors.push(`${prefix}: pool ${alternative.poolId} is not permitted in ${phase.id}.`);
    if (!nearlyEqual(alternative.hours, expectedChoiceSlotHours)) {
      errors.push(`${prefix}: alternative ${alternative.id} must use its ${expectedChoiceSlotHours}-hour slot.`);
    }
    if (typeof alternative.owner !== 'string' || alternative.owner.trim() === '') {
      errors.push(`${prefix}: alternative ${alternative.id} requires a named owner.`);
    }
  }

  if (operatingMode === 'intensive') {
    if (!plan.intensive) {
      errors.push(`${prefix}: intensive mode requires one focus.`);
    } else {
      if (!permittedPools.has(plan.intensive.poolId)) errors.push(`${prefix}: intensive pool ${plan.intensive.poolId} is not permitted in ${phase.id}.`);
      if (!nearlyEqual(plan.intensive.hours, capacity.intensive.focusHours)) {
        errors.push(`${prefix}: intensive focus must use ${capacity.intensive.focusHours} hours.`);
      }
      if (!(plan.intensive.durationWeeks > 0 && plan.intensive.durationWeeks <= phase.intensiveMaxWeeks)) {
        errors.push(`${prefix}: intensive duration exceeds the ${phase.intensiveMaxWeeks}-week phase limit.`);
      }
      if (plan.rotationWeeks !== plan.intensive.durationWeeks) {
        errors.push(`${prefix}: intensive rotationWeeks must equal intensive.durationWeeks.`);
      }
      if (typeof plan.intensive.exitCriterion !== 'string' || plan.intensive.exitCriterion.trim().length < 20) {
        errors.push(`${prefix}: intensive requires a concrete exitCriterion.`);
      }
      if (typeof plan.intensive.owner !== 'string' || plan.intensive.owner.trim() === '') {
        errors.push(`${prefix}: intensive focus requires a named owner.`);
      }
    }
  } else {
    if (plan.intensive !== null) errors.push(`${prefix}: only intensive mode may contain an intensive focus.`);
    if (!(plan.rotationWeeks >= phase.rotationWeeks.min && plan.rotationWeeks <= phase.rotationWeeks.max)) {
      errors.push(`${prefix}: rotationWeeks must be ${phase.rotationWeeks.min}-${phase.rotationWeeks.max}.`);
    }
  }

  const requiredOwners = model.requiredOwnerKeys;
  for (const ownerKey of requiredOwners) {
    if (typeof plan.owners?.[ownerKey] !== 'string' || plan.owners[ownerKey].trim() === '') {
      errors.push(`${prefix}: missing named owner for ${ownerKey}.`);
    }
  }

  if (!(plan.protectedSleepHoursPerNight >= phase.time.typicalSleepHoursPerNight)) {
    errors.push(`${prefix}: protected sleep must be at least ${phase.time.typicalSleepHoursPerNight} hours/night.`);
  }
  const externalSchool = phase.time.externalSchoolAndCommuteHours[plan.deliveryMode];
  const requiredUnstructured = (
    HOURS_PER_WEEK - plan.protectedSleepHoursPerNight * 7 - externalSchool
  ) * model.unstructuredShareOfNonSchoolWakingTime;
  if (!(plan.protectedUnstructuredHoursPerWeek + EPSILON >= requiredUnstructured)) {
    errors.push(`${prefix}: protect at least ${formatHours(requiredUnstructured)} unstructured hours/week.`);
  }

  const actualScheduled = plan.guaranteeHours
    + alternatives.reduce((total, alternative) => total + alternative.hours, 0)
    + (plan.intensive?.hours ?? 0);
  const expectedScheduled = scheduledHours(capacity, operatingMode);
  if (!nearlyEqual(actualScheduled, expectedScheduled)) {
    errors.push(`${prefix}: scheduled ${actualScheduled} hours; model requires ${expectedScheduled}.`);
  }
  const weeklyCap = capHours(capacity, operatingMode);
  const reservedBuffer = bufferHours(capacity, operatingMode);
  if (actualScheduled > weeklyCap - reservedBuffer + EPSILON) {
    errors.push(`${prefix}: schedule consumes the protected ${reservedBuffer}-hour buffer.`);
  }

  const ledgerCommitted = plan.protectedSleepHoursPerNight * 7
    + externalSchool
    + phase.time.externalStudyHours[plan.deliveryMode]
    + phase.time.essentialCareHoursPerWeek
    + plan.protectedUnstructuredHoursPerWeek
    + weeklyCap;
  if (ledgerCommitted > HOURS_PER_WEEK + EPSILON) {
    errors.push(`${prefix}: plan overloads the 168-hour week by ${formatHours(ledgerCommitted - HOURS_PER_WEEK)} hours.`);
  }

  validateEvaluation(plan, prefix, errors);
  return {
    errors,
    summary: {
      scheduled: actualScheduled,
      cap: weeklyCap,
      buffer: reservedBuffer,
      ledgerSlack: HOURS_PER_WEEK - ledgerCommitted,
    },
  };
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, 'utf8'));
}

async function examplePaths() {
  const entries = await readdir(examplesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith('capacity-plan.') && entry.name.endsWith('.json'))
    .map((entry) => path.join(examplesDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function requestedPlanPaths(args) {
  const paths = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--plan') {
      const filename = args[index + 1];
      if (!filename) throw new Error('--plan requires a path.');
      paths.push(path.resolve(process.cwd(), filename));
      index += 1;
    }
  }
  return paths;
}

async function main() {
  const args = process.argv.slice(2);
  const model = await readJson(modelPath);
  const modelAudit = validateModel(model);
  printCapacityTable(model);

  console.log('\nModel integrity');
  for (const warning of modelAudit.warnings) console.log(`WARN  ${warning}`);
  if (modelAudit.errors.length === 0) console.log('PASS  Capacity ordering, displacement, buffers, sleep/slack ledger, pools, and rotations.');
  else for (const error of modelAudit.errors) console.error(`FAIL  ${error}`);

  let plans = requestedPlanPaths(args);
  if (args.includes('--examples')) plans = [...plans, ...(await examplePaths())];
  const uniquePlans = [...new Set(plans)];
  const planErrors = [];

  if (uniquePlans.length > 0) console.log('\nPlan audits');
  for (const filename of uniquePlans) {
    const plan = await readJson(filename);
    const relativeName = path.relative(repoRoot, filename);
    const audit = validatePlan(model, plan, relativeName);
    if (audit.errors.length > 0) {
      planErrors.push(...audit.errors);
      for (const error of audit.errors) console.error(`FAIL  ${error}`);
    } else {
      console.log(
        `PASS  ${relativeName}: ${formatHours(audit.summary.scheduled)} scheduled / ${formatHours(audit.summary.cap)} cap, `
        + `${formatHours(audit.summary.buffer)} buffer, ${formatHours(audit.summary.ledgerSlack)} ledger slack.`
      );
    }
  }

  if (modelAudit.errors.length > 0 || planErrors.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) await main();
