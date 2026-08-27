import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const modelPath = path.join(repoRoot, 'config/hardship-model.json');
const examplesDir = path.join(repoRoot, 'docs/examples');
const EXPECTED_DOMAIN_COUNT = 12;
const PLACEHOLDER = /^(?:tbd|todo|none|n\/a|unknown|owner|someone|later)$/i;
const PHYSICAL_CO_CREDIT_BLOCKLIST = new Set([
  'adverse-weather',
  'austere-living',
  'solitude-separation-navigation',
]);
const LEDGER_STATUSES = new Set(['planned', 'preparing', 'in-progress', 'completed', 'deferred', 'invalidated']);
const REQUIREMENT_TYPES = new Set(['recurring-duration', 'sustained-duration', 'evidence', 'milestone']);
const DURATION_UNITS = new Set(['hours', 'days', 'nights', 'months']);
const CANONICAL_STRUCTURED_REQUIREMENTS = {
  'age-8-10': {
    'digital-abstinence': [
      {
        id: 'monthly-24h',
        type: 'recurring-duration',
        minimumOccurrencesPerPlanYear: 12,
        duration: { minimum: 24, unit: 'hours' },
      },
      {
        id: 'annual-48h',
        type: 'recurring-duration',
        minimumOccurrencesPerPlanYear: 1,
        duration: { minimum: 48, unit: 'hours' },
      },
    ],
  },
  'age-11-13': {
    'digital-abstinence': [
      {
        id: 'semiannual-48h',
        type: 'recurring-duration',
        minimumOccurrencesPerPlanYear: 2,
        duration: { minimum: 48, unit: 'hours' },
      },
    ],
    'solitude-separation-navigation': [
      {
        id: 'annual-three-day-separation',
        type: 'recurring-duration',
        minimumOccurrencesPerPlanYear: 1,
        duration: { minimum: 3, unit: 'days' },
      },
    ],
    'moral-courage-integrity': [
      {
        id: 'annual-natural-case-evidence',
        type: 'evidence',
        minimumRecordsPerPlanYear: 1,
        caseSource: 'naturally-occurring',
        manufacturedCasesForbidden: true,
      },
    ],
  },
  'age-14-16': {
    'digital-abstinence': [
      {
        id: 'quarterly-48h',
        type: 'recurring-duration',
        minimumOccurrencesPerPlanYear: 4,
        duration: { minimum: 48, unit: 'hours' },
      },
      {
        id: 'annual-5-7d',
        type: 'recurring-duration',
        minimumOccurrencesPerPlanYear: 1,
        duration: { minimum: 5, maximum: 7, unit: 'days' },
      },
    ],
    'solitude-separation-navigation': [
      {
        id: 'solo-wilderness-overnight-by-16',
        type: 'milestone',
        deadlineAge: 16,
        duration: { minimum: 1, unit: 'nights' },
        setting: 'wilderness',
        communicationMode: 'emergency-only',
      },
    ],
    'service-reality': [
      {
        id: 'minimum-six-month-service',
        type: 'sustained-duration',
        duration: { minimum: 6, unit: 'months' },
      },
    ],
    'moral-courage-integrity': [
      {
        id: 'annual-natural-case-evidence',
        type: 'evidence',
        minimumRecordsPerPlanYear: 1,
        caseSource: 'naturally-occurring',
        manufacturedCasesForbidden: true,
      },
    ],
  },
  'age-17-18': {
    'digital-abstinence': [
      {
        id: 'recurring-24-48h',
        type: 'recurring-duration',
        minimumOccurrencesPerPlanYear: 2,
        duration: { minimum: 24, maximum: 48, unit: 'hours' },
      },
      {
        id: 'annual-7d',
        type: 'recurring-duration',
        minimumOccurrencesPerPlanYear: 1,
        duration: { minimum: 7, unit: 'days' },
      },
    ],
    'solitude-separation-navigation': [
      {
        id: 'independent-month-by-18',
        type: 'milestone',
        deadlineAge: 18,
        duration: { minimum: 30, unit: 'days' },
        setting: 'away-from-routine-parental-management',
        communicationMode: 'emergency-and-scheduled-check-in',
      },
    ],
    'service-reality': [
      {
        id: 'minimum-six-month-service',
        type: 'sustained-duration',
        duration: { minimum: 6, unit: 'months' },
      },
    ],
    'moral-courage-integrity': [
      {
        id: 'annual-natural-case-evidence',
        type: 'evidence',
        minimumRecordsPerPlanYear: 1,
        caseSource: 'naturally-occurring',
        manufacturedCasesForbidden: true,
      },
    ],
  },
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSubstantive(value, minimumLength = 24) {
  return typeof value === 'string'
    && value.trim().length >= minimumLength
    && !PLACEHOLDER.test(value.trim());
}

function hasNamedOwner(value) {
  return typeof value === 'string'
    && value.trim().length >= 3
    && !PLACEHOLDER.test(value.trim());
}

function sameStringMap(actual, expected) {
  if (!isObject(actual) || !isObject(expected)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index] && String(actual[key]) === String(expected[key]));
}

function phaseMinimums(phase, domainId) {
  return phase.minimumAttributesByDomain?.[domainId] ?? {};
}

function phaseRequirements(phase, domainId) {
  return phase.requirementsByDomain?.[domainId] ?? [];
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validateDurationDefinition(duration, prefix, errors) {
  if (!isObject(duration)) {
    errors.push(`${prefix}: duration must be an object.`);
    return;
  }
  if (typeof duration.minimum !== 'number' || !Number.isFinite(duration.minimum) || duration.minimum <= 0) {
    errors.push(`${prefix}: duration.minimum must be a positive number.`);
  }
  if (!DURATION_UNITS.has(duration.unit)) {
    errors.push(`${prefix}: duration.unit must be hours, days, nights, or months.`);
  }
  if ('maximum' in duration
      && (typeof duration.maximum !== 'number'
        || !Number.isFinite(duration.maximum)
        || duration.maximum < duration.minimum)) {
    errors.push(`${prefix}: duration.maximum must be a number greater than or equal to duration.minimum.`);
  }
}

function validateRequirementDefinition(requirement, prefix, errors) {
  if (!isObject(requirement)) {
    errors.push(`${prefix}: requirement must be an object.`);
    return;
  }
  if (typeof requirement.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requirement.id)) {
    errors.push(`${prefix}: requirement id must be a kebab-case string.`);
  }
  if (!REQUIREMENT_TYPES.has(requirement.type)) {
    errors.push(`${prefix}/${String(requirement.id)}: unsupported requirement type ${String(requirement.type)}.`);
    return;
  }

  const requirementPrefix = `${prefix}/${requirement.id}`;
  if (requirement.type === 'recurring-duration') {
    if (!isPositiveInteger(requirement.minimumOccurrencesPerPlanYear)) {
      errors.push(`${requirementPrefix}: minimumOccurrencesPerPlanYear must be a positive integer.`);
    }
    validateDurationDefinition(requirement.duration, requirementPrefix, errors);
  }

  if (requirement.type === 'sustained-duration') {
    validateDurationDefinition(requirement.duration, requirementPrefix, errors);
  }

  if (requirement.type === 'evidence') {
    if (!isPositiveInteger(requirement.minimumRecordsPerPlanYear)) {
      errors.push(`${requirementPrefix}: minimumRecordsPerPlanYear must be a positive integer.`);
    }
    if (requirement.caseSource !== 'naturally-occurring') {
      errors.push(`${requirementPrefix}: evidence cases must be naturally-occurring.`);
    }
    if (requirement.manufacturedCasesForbidden !== true) {
      errors.push(`${requirementPrefix}: manufacturedCasesForbidden must be true.`);
    }
  }

  if (requirement.type === 'milestone') {
    if (!isPositiveInteger(requirement.deadlineAge)) {
      errors.push(`${requirementPrefix}: deadlineAge must be a positive integer.`);
    }
    validateDurationDefinition(requirement.duration, requirementPrefix, errors);
    if (!isSubstantive(requirement.setting, 3)) {
      errors.push(`${requirementPrefix}: setting must be substantive.`);
    }
    if (!isSubstantive(requirement.communicationMode, 3)) {
      errors.push(`${requirementPrefix}: communicationMode must be substantive.`);
    }
  }
}

function validateCanonicalStructuredRequirements(model, errors) {
  const phaseById = new Map((model.phases ?? []).map((phase) => [phase.phaseId, phase]));

  if (phaseById.get('age-17-18')?.cadenceByDomain?.['public-failure-rejection'] !== 'annual') {
    errors.push('age-17-18/public-failure-rejection: canonical cadence must be annual.');
  }

  for (const [phaseId, expectedByDomain] of Object.entries(CANONICAL_STRUCTURED_REQUIREMENTS)) {
    const phase = phaseById.get(phaseId);
    if (!phase) {
      errors.push(`${phaseId}: missing phase required by structured hardship semantics.`);
      continue;
    }
    for (const [domainId, expectedRequirements] of Object.entries(expectedByDomain)) {
      const actualRequirements = phaseRequirements(phase, domainId);
      if (!isDeepStrictEqual(actualRequirements, expectedRequirements)) {
        errors.push(
          `${phaseId}/${domainId}: structured requirements must exactly equal `
          + `${JSON.stringify(expectedRequirements)}.`
        );
      }
    }
  }
}

export function validateModel(model) {
  const errors = [];
  const warnings = [];

  if (model.version !== 2) errors.push(`Unsupported hardship model version: ${model.version}.`);
  if (!Array.isArray(model.domains) || model.domains.length !== EXPECTED_DOMAIN_COUNT) {
    errors.push(`Hardship model must define exactly ${EXPECTED_DOMAIN_COUNT} domains.`);
  }

  const domains = Array.isArray(model.domains) ? model.domains : [];
  const domainSet = new Set(domains);
  if (domainSet.size !== domains.length) errors.push('Hardship model contains duplicate domain ids.');
  for (const domainId of domains) {
    if (typeof domainId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(domainId)) {
      errors.push(`Invalid hardship domain id: ${String(domainId)}.`);
    }
  }

  if (model.domainDefaults?.substitution !== 'within-domain-only') {
    errors.push('Hardship model must preserve within-domain-only substitution.');
  }
  if (!isSubstantive(model.contracts?.nonSubstitution?.en, 20)) {
    errors.push('Hardship model requires a substantive English non-substitution contract.');
  }

  const phaseIds = new Set();
  if (!Array.isArray(model.phases) || model.phases.length === 0) {
    errors.push('Hardship model must define phases.');
    return { errors, warnings };
  }

  for (const phase of model.phases) {
    if (!isObject(phase) || typeof phase.phaseId !== 'string') {
      errors.push('Every hardship phase requires phaseId.');
      continue;
    }
    if (phaseIds.has(phase.phaseId)) errors.push(`Duplicate hardship phase id: ${phase.phaseId}.`);
    phaseIds.add(phase.phaseId);
    if (!isSubstantive(phase.stage, 3)) errors.push(`${phase.phaseId}: missing stage.`);

    const cadenceMap = isObject(phase.cadenceByDomain) ? phase.cadenceByDomain : {};
    const cadenceDomains = Object.keys(cadenceMap);
    const missingCadences = domains.filter((domainId) => !(domainId in cadenceMap));
    const unknownCadences = cadenceDomains.filter((domainId) => !domainSet.has(domainId));
    if (missingCadences.length > 0) {
      errors.push(`${phase.phaseId}: missing cadence for ${missingCadences.join(', ')}.`);
    }
    if (unknownCadences.length > 0) {
      errors.push(`${phase.phaseId}: cadence map contains unknown domains ${unknownCadences.join(', ')}.`);
    }
    for (const [domainId, cadence] of Object.entries(cadenceMap)) {
      if (!isSubstantive(cadence, 3)) errors.push(`${phase.phaseId}/${domainId}: invalid cadence.`);
    }

    const minimumsByDomain = phase.minimumAttributesByDomain ?? {};
    if (!isObject(minimumsByDomain)) {
      errors.push(`${phase.phaseId}: minimumAttributesByDomain must be an object.`);
      continue;
    }
    for (const [domainId, attributes] of Object.entries(minimumsByDomain)) {
      if (!domainSet.has(domainId)) {
        errors.push(`${phase.phaseId}: minimum attributes reference unknown domain ${domainId}.`);
        continue;
      }
      if (!isObject(attributes) || Object.keys(attributes).length === 0) {
        errors.push(`${phase.phaseId}/${domainId}: minimum attributes must be a non-empty object.`);
        continue;
      }
      for (const [attribute, value] of Object.entries(attributes)) {
        if (!/^data-min-[a-z0-9-]+$/.test(attribute) || typeof value !== 'string' || value.trim() === '') {
          errors.push(`${phase.phaseId}/${domainId}: invalid minimum attribute ${attribute}.`);
        }
      }
    }

    const requirementsByDomain = phase.requirementsByDomain;
    if (!isObject(requirementsByDomain)) {
      errors.push(`${phase.phaseId}: requirementsByDomain must be an object.`);
      continue;
    }
    for (const [domainId, requirements] of Object.entries(requirementsByDomain)) {
      if (!domainSet.has(domainId)) {
        errors.push(`${phase.phaseId}: structured requirements reference unknown domain ${domainId}.`);
        continue;
      }
      if (!Array.isArray(requirements) || requirements.length === 0) {
        errors.push(`${phase.phaseId}/${domainId}: structured requirements must be a non-empty array.`);
        continue;
      }
      const ids = new Set();
      for (const requirement of requirements) {
        validateRequirementDefinition(requirement, `${phase.phaseId}/${domainId}`, errors);
        if (isObject(requirement) && typeof requirement.id === 'string') {
          if (ids.has(requirement.id)) {
            errors.push(`${phase.phaseId}/${domainId}: duplicate requirement id ${requirement.id}.`);
          }
          ids.add(requirement.id);
        }
      }
    }
  }

  validateCanonicalStructuredRequirements(model, errors);

  return { errors, warnings };
}

function validatePhysicalProtocol(record, prefix, errors) {
  const protocol = record.oneStressorProtocol;
  if (!isObject(protocol)) {
    errors.push(`${prefix}: physical-exhaustion requires oneStressorProtocol.`);
    return;
  }
  if (protocol.controlled !== true) {
    errors.push(`${prefix}: physical-exhaustion must be explicitly controlled.`);
  }
  if (protocol.readilyExtractable !== true) {
    errors.push(`${prefix}: physical-exhaustion must be readily extractable.`);
  }
  for (const key of ['emergencyRoute', 'preparation', 'recovery']) {
    if (!isSubstantive(protocol[key])) {
      errors.push(`${prefix}: oneStressorProtocol.${key} must be substantive.`);
    }
  }
  if (!Array.isArray(protocol.stopCriteria) || protocol.stopCriteria.length < 3
      || protocol.stopCriteria.some((criterion) => !isSubstantive(criterion, 12))) {
    errors.push(`${prefix}: physical-exhaustion requires at least three substantive stop criteria.`);
  }
  const coCredits = protocol.coCreditDomains;
  if (!Array.isArray(coCredits)) {
    errors.push(`${prefix}: oneStressorProtocol.coCreditDomains must be an explicit array.`);
  } else {
    const prohibited = coCredits.filter((domainId) => PHYSICAL_CO_CREDIT_BLOCKLIST.has(domainId));
    if (prohibited.length > 0) {
      errors.push(`${prefix}: physical-exhaustion cannot co-credit ${prohibited.join(', ')} under the one-stressor rule.`);
    }
  }
}

function validateSchedule(record, prefix, errors) {
  const schedule = record.schedule;
  if (!isObject(schedule)) {
    errors.push(`${prefix}: missing schedule.`);
    return;
  }
  const allowedKinds = new Set(['episodic', 'recurring', 'sustained', 'natural-case-capture']);
  if (!allowedKinds.has(schedule.kind)) {
    errors.push(`${prefix}: schedule.kind must be episodic, recurring, sustained, or natural-case-capture.`);
  }
  if (!Array.isArray(schedule.windows)) {
    errors.push(`${prefix}: schedule.windows must be an array.`);
  } else if (schedule.kind !== 'natural-case-capture'
      && (schedule.windows.length === 0 || schedule.windows.some((window) => !isSubstantive(window, 12)))) {
    errors.push(`${prefix}: scheduled domains require at least one substantive window.`);
  }

  if (record.domainId === 'moral-courage-integrity') {
    if (schedule.kind !== 'natural-case-capture') {
      errors.push(`${prefix}: moral-courage incidents must use natural-case-capture, not manufactured scheduling.`);
    }
    if (Array.isArray(schedule.windows) && schedule.windows.length > 0) {
      errors.push(`${prefix}: moral-courage incidents must not have manufactured date windows.`);
    }
    if (!isSubstantive(schedule.captureProtocol)) {
      errors.push(`${prefix}: moral-courage natural-case capture requires a substantive captureProtocol.`);
    }
  } else if (schedule.kind === 'natural-case-capture') {
    errors.push(`${prefix}: natural-case-capture is reserved for moral-courage-integrity.`);
  }
}

function validatePlannedDuration(plannedDuration, requirement, prefix, errors) {
  if (!isObject(plannedDuration)) {
    errors.push(`${prefix}: plannedDuration must be an object.`);
    return;
  }
  if (plannedDuration.unit !== requirement.duration.unit) {
    errors.push(`${prefix}: plannedDuration.unit must be ${requirement.duration.unit}.`);
  }
  if (typeof plannedDuration.value !== 'number' || !Number.isFinite(plannedDuration.value)) {
    errors.push(`${prefix}: plannedDuration.value must be a number.`);
    return;
  }
  if (plannedDuration.value < requirement.duration.minimum) {
    errors.push(`${prefix}: plannedDuration.value must be at least ${requirement.duration.minimum}.`);
  }
  if (requirement.duration.maximum !== undefined
      && plannedDuration.value > requirement.duration.maximum) {
    errors.push(`${prefix}: plannedDuration.value must be at most ${requirement.duration.maximum}.`);
  }
}

function validateRequirementCommitment(requirement, commitment, prefix, errors) {
  if (!isObject(commitment)) {
    errors.push(`${prefix}/${requirement.id}: commitment must be an object.`);
    return;
  }
  const requirementPrefix = `${prefix}/${requirement.id}`;

  if (requirement.type === 'recurring-duration') {
    if (!isPositiveInteger(commitment.plannedOccurrencesPerYear)
        || commitment.plannedOccurrencesPerYear < requirement.minimumOccurrencesPerPlanYear) {
      errors.push(
        `${requirementPrefix}: plannedOccurrencesPerYear must be at least `
        + `${requirement.minimumOccurrencesPerPlanYear}.`
      );
    }
    validatePlannedDuration(commitment.plannedDuration, requirement, requirementPrefix, errors);
  }

  if (requirement.type === 'sustained-duration') {
    validatePlannedDuration(commitment.plannedDuration, requirement, requirementPrefix, errors);
  }

  if (requirement.type === 'evidence') {
    if (!isPositiveInteger(commitment.targetRecordsPerYear)
        || commitment.targetRecordsPerYear < requirement.minimumRecordsPerPlanYear) {
      errors.push(
        `${requirementPrefix}: targetRecordsPerYear must be at least `
        + `${requirement.minimumRecordsPerPlanYear}.`
      );
    }
    if (commitment.caseSource !== requirement.caseSource) {
      errors.push(`${requirementPrefix}: caseSource must be ${requirement.caseSource}.`);
    }
    if (commitment.manufacturedCasesForbidden !== true) {
      errors.push(`${requirementPrefix}: manufacturedCasesForbidden must be true.`);
    }
  }

  if (requirement.type === 'milestone') {
    if (!isPositiveInteger(commitment.plannedOccurrences)) {
      errors.push(`${requirementPrefix}: plannedOccurrences must be at least 1.`);
    }
    validatePlannedDuration(commitment.plannedDuration, requirement, requirementPrefix, errors);
    if (!isPositiveInteger(commitment.plannedCompletionAge)
        || commitment.plannedCompletionAge > requirement.deadlineAge) {
      errors.push(`${requirementPrefix}: plannedCompletionAge must be no later than ${requirement.deadlineAge}.`);
    }
    if (commitment.setting !== requirement.setting) {
      errors.push(`${requirementPrefix}: setting must be ${requirement.setting}.`);
    }
    if (commitment.communicationMode !== requirement.communicationMode) {
      errors.push(`${requirementPrefix}: communicationMode must be ${requirement.communicationMode}.`);
    }
  }
}

function validateRequirementCommitments(record, requirements, prefix, errors) {
  if (!Array.isArray(record.requirementCommitments)) {
    errors.push(`${prefix}: requirementCommitments must be an explicit array.`);
    return;
  }

  const expectedById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const seen = new Set();
  for (const commitment of record.requirementCommitments) {
    const requirementId = commitment?.requirementId;
    if (typeof requirementId !== 'string' || !expectedById.has(requirementId)) {
      errors.push(`${prefix}/${String(requirementId)}: unknown structured requirement commitment.`);
      continue;
    }
    if (seen.has(requirementId)) {
      errors.push(`${prefix}/${requirementId}: duplicate structured requirement commitment.`);
      continue;
    }
    seen.add(requirementId);
    validateRequirementCommitment(expectedById.get(requirementId), commitment, prefix, errors);
  }

  const missing = requirements
    .map((requirement) => requirement.id)
    .filter((requirementId) => !seen.has(requirementId));
  if (missing.length > 0) {
    errors.push(`${prefix}: missing structured requirement commitments ${missing.join(', ')}.`);
  }
}

function validateObservedDuration(observedDuration, requirement, prefix, errors, label) {
  if (!isObject(observedDuration)) {
    errors.push(`${prefix}: ${label} must be an object.`);
    return;
  }
  if (observedDuration.unit !== requirement.duration.unit) {
    errors.push(`${prefix}: ${label}.unit must be ${requirement.duration.unit}.`);
  }
  if (typeof observedDuration.value !== 'number' || !Number.isFinite(observedDuration.value)) {
    errors.push(`${prefix}: ${label}.value must be a number.`);
    return;
  }
  if (observedDuration.value < requirement.duration.minimum) {
    errors.push(`${prefix}: ${label}.value must be at least ${requirement.duration.minimum}.`);
  }
  if (requirement.duration.maximum !== undefined
      && observedDuration.value > requirement.duration.maximum) {
    errors.push(`${prefix}: ${label}.value must be at most ${requirement.duration.maximum}.`);
  }
}

function validateRequirementResult(requirement, result, prefix, errors) {
  if (!isObject(result)) {
    errors.push(`${prefix}/${requirement.id}: result must be an object.`);
    return;
  }
  const requirementPrefix = `${prefix}/${requirement.id}`;

  if (requirement.type === 'recurring-duration') {
    if (!isPositiveInteger(result.completedOccurrencesInEvidenceYear)
        || result.completedOccurrencesInEvidenceYear < requirement.minimumOccurrencesPerPlanYear) {
      errors.push(
        `${requirementPrefix}: completedOccurrencesInEvidenceYear must be at least `
        + `${requirement.minimumOccurrencesPerPlanYear}.`
      );
    }
    validateObservedDuration(
      result.shortestCompletedDuration,
      requirement,
      requirementPrefix,
      errors,
      'shortestCompletedDuration'
    );
    if (requirement.duration.maximum !== undefined) {
      validateObservedDuration(
        result.longestCompletedDuration,
        requirement,
        requirementPrefix,
        errors,
        'longestCompletedDuration'
      );
    }
  }

  if (requirement.type === 'sustained-duration') {
    validateObservedDuration(result.observedDuration, requirement, requirementPrefix, errors, 'observedDuration');
  }

  if (requirement.type === 'evidence') {
    if (!isPositiveInteger(result.verifiedRecordsInEvidenceYear)
        || result.verifiedRecordsInEvidenceYear < requirement.minimumRecordsPerPlanYear) {
      errors.push(
        `${requirementPrefix}: verifiedRecordsInEvidenceYear must be at least `
        + `${requirement.minimumRecordsPerPlanYear}.`
      );
    }
    if (result.caseSource !== requirement.caseSource) {
      errors.push(`${requirementPrefix}: caseSource must be ${requirement.caseSource}.`);
    }
    if (result.manufacturedCasesUsed !== false) {
      errors.push(`${requirementPrefix}: manufacturedCasesUsed must be false.`);
    }
  }

  if (requirement.type === 'milestone') {
    if (!isPositiveInteger(result.completedOccurrences)) {
      errors.push(`${requirementPrefix}: completedOccurrences must be at least 1.`);
    }
    validateObservedDuration(result.observedDuration, requirement, requirementPrefix, errors, 'observedDuration');
    if (!isPositiveInteger(result.completionAge) || result.completionAge > requirement.deadlineAge) {
      errors.push(`${requirementPrefix}: completionAge must be no later than ${requirement.deadlineAge}.`);
    }
    if (result.setting !== requirement.setting) {
      errors.push(`${requirementPrefix}: setting must be ${requirement.setting}.`);
    }
    if (result.communicationMode !== requirement.communicationMode) {
      errors.push(`${requirementPrefix}: communicationMode must be ${requirement.communicationMode}.`);
    }
  }
}

function validateRequirementResults(completion, requirements, prefix, errors) {
  if (!Array.isArray(completion.requirementResults)) {
    errors.push(`${prefix}: completionRecord.requirementResults must be an explicit array.`);
    return;
  }

  const expectedById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const seen = new Set();
  for (const result of completion.requirementResults) {
    const requirementId = result?.requirementId;
    if (typeof requirementId !== 'string' || !expectedById.has(requirementId)) {
      errors.push(`${prefix}/${String(requirementId)}: unknown structured requirement result.`);
      continue;
    }
    if (seen.has(requirementId)) {
      errors.push(`${prefix}/${requirementId}: duplicate structured requirement result.`);
      continue;
    }
    seen.add(requirementId);
    validateRequirementResult(expectedById.get(requirementId), result, prefix, errors);
  }

  const missing = requirements
    .map((requirement) => requirement.id)
    .filter((requirementId) => !seen.has(requirementId));
  if (missing.length > 0) {
    errors.push(`${prefix}: completionRecord missing structured requirement results ${missing.join(', ')}.`);
  }
}

function validateLedgerState(record, requirements, prefix, errors) {
  if (!LEDGER_STATUSES.has(record.status)) {
    errors.push(`${prefix}: status must be planned, preparing, in-progress, completed, deferred, or invalidated.`);
    return;
  }

  if (record.status === 'completed') {
    const completion = record.completionRecord;
    if (!isObject(completion)) {
      errors.push(`${prefix}: completed status requires completionRecord.`);
      return;
    }
    for (const key of ['actualWindow', 'actualStimulus', 'evidence', 'recoveryObserved', 'reflection']) {
      if (!isSubstantive(completion[key])) {
        errors.push(`${prefix}: completionRecord.${key} must be substantive.`);
      }
    }
    if (!hasNamedOwner(completion.verifier)) {
      errors.push(`${prefix}: completionRecord requires a named verifier.`);
    }
    validateRequirementResults(completion, requirements, prefix, errors);
  } else if (record.completionRecord !== null) {
    errors.push(`${prefix}: completionRecord must be null until status is completed.`);
  }

  if (record.status === 'deferred') {
    if (!isSubstantive(record.deferralReason)) {
      errors.push(`${prefix}: deferred status requires a substantive deferralReason.`);
    }
    if (!isSubstantive(record.rescheduledWindow)) {
      errors.push(`${prefix}: deferred status requires a substantive rescheduledWindow.`);
    }
  }
}

export function validatePlan(model, plan, sourceName = 'plan') {
  const errors = [];
  const prefix = sourceName;
  if (plan.schemaVersion !== 2) errors.push(`${prefix}: schemaVersion must be 2.`);

  const phase = model.phases?.find((entry) => entry.phaseId === plan.phaseId);
  if (!phase) return { errors: [...errors, `${prefix}: unknown phaseId ${String(plan.phaseId)}.`] };

  if (plan.nonSubstitutionAccepted !== true) {
    errors.push(`${prefix}: nonSubstitutionAccepted must be true; domains cannot substitute for one another.`);
  }
  if (!isObject(plan.planWindow)) {
    errors.push(`${prefix}: missing planWindow.`);
  } else {
    for (const key of ['start', 'end', 'reviewCadence']) {
      if (!isSubstantive(plan.planWindow[key], 8)) {
        errors.push(`${prefix}: planWindow.${key} must be substantive.`);
      }
    }
    if (!hasNamedOwner(plan.planWindow.owner)) {
      errors.push(`${prefix}: planWindow requires a named owner.`);
    }
  }

  const records = Array.isArray(plan.domains) ? plan.domains : [];
  if (!Array.isArray(plan.domains)) errors.push(`${prefix}: domains must be an array.`);
  const canonicalDomains = model.domains;
  const canonicalSet = new Set(canonicalDomains);
  const seen = new Set();

  for (const record of records) {
    const domainId = record?.domainId;
    const recordPrefix = `${prefix}/${String(domainId)}`;
    if (!canonicalSet.has(domainId)) {
      errors.push(`${recordPrefix}: unknown domain.`);
      continue;
    }
    if (seen.has(domainId)) {
      errors.push(`${recordPrefix}: duplicate domain.`);
      continue;
    }
    seen.add(domainId);

    if (record.required !== true) errors.push(`${recordPrefix}: required must be true.`);
    const expectedCadence = phase.cadenceByDomain[domainId];
    if (record.cadence !== expectedCadence) {
      errors.push(`${recordPrefix}: cadence must exactly equal ${expectedCadence}.`);
    }
    const expectedMinimums = phaseMinimums(phase, domainId);
    if (!sameStringMap(record.minimumAttributes, expectedMinimums)) {
      errors.push(`${recordPrefix}: minimumAttributes must exactly equal ${JSON.stringify(expectedMinimums)}.`);
    }
    if (record.creditDomain !== domainId) {
      errors.push(`${recordPrefix}: creditDomain must equal its own domainId; cross-domain substitution is forbidden.`);
    }
    if (!Array.isArray(record.substitutesFor) || record.substitutesFor.length !== 0) {
      errors.push(`${recordPrefix}: substitutesFor must be an empty array.`);
    }
    const requirements = phaseRequirements(phase, domainId);
    validateRequirementCommitments(record, requirements, recordPrefix, errors);
    if (!hasNamedOwner(record.owner)) errors.push(`${recordPrefix}: requires a named owner.`);
    if (!hasNamedOwner(record.verifier)) errors.push(`${recordPrefix}: requires a named verifier.`);
    for (const key of [
      'route',
      'minimumStimulus',
      'prerequisites',
      'evidencePlan',
      'displacementPlan',
      'emergencyOrEscalationRoute',
      'recoveryPlan',
    ]) {
      if (!isSubstantive(record[key])) errors.push(`${recordPrefix}: ${key} must be substantive.`);
    }
    validateSchedule(record, recordPrefix, errors);
    validateLedgerState(record, requirements, recordPrefix, errors);
    if (domainId === 'physical-exhaustion') validatePhysicalProtocol(record, recordPrefix, errors);
  }

  const missing = canonicalDomains.filter((domainId) => !seen.has(domainId));
  if (missing.length > 0) errors.push(`${prefix}: missing required domains ${missing.join(', ')}.`);
  if (records.length !== canonicalDomains.length) {
    errors.push(`${prefix}: plan must contain exactly ${canonicalDomains.length} domain records; found ${records.length}.`);
  }

  return {
    errors,
    summary: {
      phaseId: phase.phaseId,
      stage: phase.stage,
      domainsCovered: seen.size,
      requiredDomains: canonicalDomains.length,
    },
  };
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, 'utf8'));
}

async function examplePaths() {
  const entries = await readdir(examplesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith('hardship-plan.') && entry.name.endsWith('.json'))
    .map((entry) => path.join(examplesDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function requestedPlanPaths(args) {
  const filenames = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--plan') {
      const filename = args[index + 1];
      if (!filename) throw new Error('--plan requires a path.');
      filenames.push(path.resolve(process.cwd(), filename));
      index += 1;
    }
  }
  return filenames;
}

async function main() {
  const args = process.argv.slice(2);
  const model = await readJson(modelPath);
  const modelAudit = validateModel(model);

  console.log('\nHardship model integrity');
  for (const warning of modelAudit.warnings) console.log(`WARN  ${warning}`);
  if (modelAudit.errors.length === 0) {
    console.log(`PASS  ${model.domains.length} non-substitutable domains across ${model.phases.length} phases.`);
  } else {
    for (const error of modelAudit.errors) console.error(`FAIL  ${error}`);
  }

  let filenames = requestedPlanPaths(args);
  if (args.includes('--examples')) filenames = [...filenames, ...(await examplePaths())];
  const uniqueFilenames = [...new Set(filenames)];
  const planErrors = [];

  if (uniqueFilenames.length > 0) console.log('\nHardship plan audits');
  for (const filename of uniqueFilenames) {
    const plan = await readJson(filename);
    const relativeName = path.relative(repoRoot, filename);
    const audit = validatePlan(model, plan, relativeName);
    if (audit.errors.length > 0) {
      planErrors.push(...audit.errors);
      for (const error of audit.errors) console.error(`FAIL  ${error}`);
    } else {
      console.log(
        `PASS  ${relativeName}: ${audit.summary.domainsCovered}/${audit.summary.requiredDomains} domains, `
        + `${audit.summary.phaseId} (${audit.summary.stage}).`
      );
    }
  }

  if (modelAudit.errors.length > 0 || planErrors.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) await main();
