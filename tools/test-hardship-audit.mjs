import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateModel, validatePlan } from './audit-hardship.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), 'utf8'));
}

function clone(value) {
  return structuredClone(value);
}

function domain(plan, domainId) {
  return plan.domains.find((entry) => entry.domainId === domainId);
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

function expectModelRejected(name, model, expectedPatterns) {
  const audit = validateModel(model);
  const missingPatterns = expectedPatterns.filter(
    (pattern) => !audit.errors.some((error) => pattern.test(error))
  );

  if (audit.errors.length === 0 || missingPatterns.length > 0) {
    const details = audit.errors.length > 0 ? audit.errors.join('\n  ') : 'validator returned no errors';
    throw new Error(
      `${name}: model negative control was not rejected as specified.\n`
      + `Missing diagnostics: ${missingPatterns.join(', ') || 'any rejection'}\n`
      + `Observed:\n  ${details}`
    );
  }

  console.log(`PASS  Rejected model mutation ${name}: ${expectedPatterns.length} required diagnostic(s) observed.`);
}

async function main() {
  const model = await readJson('config/hardship-model.json');
  const control = await readJson('docs/examples/hardship-plan.age-14-16.json');

  const modelAudit = validateModel(model);
  if (modelAudit.errors.length > 0) {
    throw new Error(`Cannot test against an invalid hardship model:\n${modelAudit.errors.join('\n')}`);
  }

  const positiveAudit = validatePlan(model, control, 'positive-control:age-14-16');
  if (positiveAudit.errors.length > 0) {
    throw new Error(`Positive hardship plan must validate:\n${positiveAudit.errors.join('\n')}`);
  }
  console.log('PASS  Accepted complete age-14-16 positive control with all 12 domains.');

  const completedLedgerControl = clone(control);
  const completedDigital = domain(completedLedgerControl, 'digital-abstinence');
  completedDigital.status = 'completed';
  completedDigital.completionRecord = {
    actualWindow: 'Completed four quarterly periods and one seven-day period across the 2026-09-01 through 2027-08-31 evidence year.',
    actualStimulus: 'All four quarterly periods reached forty-eight hours and the annual period reached seven days with only the sealed emergency route available.',
    verifier: 'family-digital-abstinence-custodian',
    evidence: 'Handover and return times, exceptions log, activity record, and sleep observations were retained in the ledger.',
    recoveryObserved: 'Routine digital access returned in stages after a review of urges, attention, sleep, and any emergency exceptions.',
    reflection: 'The learner distinguished habitual checking from necessary communication and selected the next analogue replacement strategy.',
    requirementResults: [
      {
        requirementId: 'quarterly-48h',
        completedOccurrencesInEvidenceYear: 4,
        shortestCompletedDuration: { value: 48, unit: 'hours' },
      },
      {
        requirementId: 'annual-5-7d',
        completedOccurrencesInEvidenceYear: 1,
        shortestCompletedDuration: { value: 7, unit: 'days' },
        longestCompletedDuration: { value: 7, unit: 'days' },
      },
    ],
  };
  const completedLedgerAudit = validatePlan(model, completedLedgerControl, 'positive-control:completed-ledger-entry');
  if (completedLedgerAudit.errors.length > 0) {
    throw new Error(`Completed ledger entry must validate:\n${completedLedgerAudit.errors.join('\n')}`);
  }
  console.log('PASS  Accepted a completed domain ledger record with verifier, evidence, recovery, and reflection.');

  console.log('\nHardship validator negative controls');

  const missingCadenceModel = clone(model);
  delete missingCadenceModel.phases[0].cadenceByDomain['physical-exhaustion'];
  const missingCadenceAudit = validateModel(missingCadenceModel);
  if (!missingCadenceAudit.errors.some((error) => /missing cadence for physical-exhaustion/.test(error))) {
    throw new Error('Model mutation without a canonical cadence was not rejected.');
  }
  console.log('PASS  Rejected model phase missing a canonical domain cadence.');

  const weakenedPublicFailureCadence = clone(model);
  weakenedPublicFailureCadence.phases
    .find((phase) => phase.phaseId === 'age-17-18')
    .cadenceByDomain['public-failure-rejection'] = 'once-per-phase';
  expectModelRejected('17–18 public failure below annual cadence', weakenedPublicFailureCadence, [
    /age-17-18\/public-failure-rejection: canonical cadence must be annual/,
  ]);

  const missingAnnualMoralEvidence = clone(model);
  delete missingAnnualMoralEvidence.phases
    .find((phase) => phase.phaseId === 'age-11-13')
    .requirementsByDomain['moral-courage-integrity'];
  expectModelRejected('11–13 annual moral-courage evidence removed', missingAnnualMoralEvidence, [
    /age-11-13\/moral-courage-integrity: structured requirements must exactly equal/,
  ]);

  const weakenedSoloMilestone = clone(model);
  const soloRequirement = weakenedSoloMilestone.phases
    .find((phase) => phase.phaseId === 'age-14-16')
    .requirementsByDomain['solitude-separation-navigation'][0];
  soloRequirement.deadlineAge = 17;
  soloRequirement.duration.minimum = 0.5;
  soloRequirement.setting = 'back-garden';
  soloRequirement.communicationMode = 'continuous-messaging';
  expectModelRejected('solo wilderness overnight milestone weakened', weakenedSoloMilestone, [
    /age-14-16\/solitude-separation-navigation: structured requirements must exactly equal/,
  ]);

  const shortenedCompletionService = clone(model);
  shortenedCompletionService.phases
    .find((phase) => phase.phaseId === 'age-17-18')
    .requirementsByDomain['service-reality'][0].duration.minimum = 3;
  expectModelRejected('17–18 service shortened below six months', shortenedCompletionService, [
    /age-17-18\/service-reality: structured requirements must exactly equal/,
  ]);

  const weakenedEightToTenDigital = clone(model);
  const eightToTenDigital = weakenedEightToTenDigital.phases
    .find((phase) => phase.phaseId === 'age-8-10')
    .requirementsByDomain['digital-abstinence'];
  eightToTenDigital[0].minimumOccurrencesPerPlanYear = 6;
  eightToTenDigital[1].duration.minimum = 24;
  expectModelRejected('8–10 composite digital minimum weakened', weakenedEightToTenDigital, [
    /age-8-10\/digital-abstinence: structured requirements must exactly equal/,
  ]);

  const weakenedSeventeenToEighteenDigital = clone(model);
  const seventeenToEighteenDigital = weakenedSeventeenToEighteenDigital.phases
    .find((phase) => phase.phaseId === 'age-17-18')
    .requirementsByDomain['digital-abstinence'];
  seventeenToEighteenDigital[0].duration.minimum = 12;
  seventeenToEighteenDigital[1].duration.minimum = 3;
  expectModelRejected('17–18 composite digital minimum weakened', weakenedSeventeenToEighteenDigital, [
    /age-17-18\/digital-abstinence: structured requirements must exactly equal/,
  ]);

  const missingDomain = clone(control);
  missingDomain.domains = missingDomain.domains.filter((entry) => entry.domainId !== 'adverse-weather');
  expectRejected(model, 'missing domain', missingDomain, [
    /missing required domains adverse-weather/,
    /exactly 12 domain records; found 11/,
  ]);

  const duplicateDomain = clone(control);
  duplicateDomain.domains.push(clone(domain(duplicateDomain, 'strength-load')));
  expectRejected(model, 'duplicate domain', duplicateDomain, [
    /strength-load: duplicate domain/,
    /exactly 12 domain records; found 13/,
  ]);

  const unknownDomain = clone(control);
  domain(unknownDomain, 'low-status-entry').domainId = 'comfortable-proxy';
  expectRejected(model, 'unknown domain', unknownDomain, [
    /comfortable-proxy: unknown domain/,
    /missing required domains low-status-entry/,
  ]);

  const wrongCadence = clone(control);
  domain(wrongCadence, 'digital-abstinence').cadence = 'whenever-convenient';
  expectRejected(model, 'wrong cadence', wrongCadence, [
    /digital-abstinence: cadence must exactly equal quarterly-48h\+annual-5-7d/,
  ]);

  const missingStructuredCommitment = clone(control);
  domain(missingStructuredCommitment, 'digital-abstinence').requirementCommitments = [];
  expectRejected(model, 'missing structured composite commitments', missingStructuredCommitment, [
    /digital-abstinence: missing structured requirement commitments quarterly-48h, annual-5-7d/,
  ]);

  const weakenedDigitalCommitment = clone(control);
  const digitalCommitments = domain(weakenedDigitalCommitment, 'digital-abstinence').requirementCommitments;
  digitalCommitments.find((entry) => entry.requirementId === 'quarterly-48h').plannedOccurrencesPerYear = 3;
  digitalCommitments.find((entry) => entry.requirementId === 'annual-5-7d').plannedDuration.value = 4;
  expectRejected(model, 'weakened structured digital commitment', weakenedDigitalCommitment, [
    /quarterly-48h: plannedOccurrencesPerYear must be at least 4/,
    /annual-5-7d: plannedDuration.value must be at least 5/,
  ]);

  const overlongBoundedDigitalCommitment = clone(control);
  domain(overlongBoundedDigitalCommitment, 'digital-abstinence')
    .requirementCommitments
    .find((entry) => entry.requirementId === 'annual-5-7d')
    .plannedDuration.value = 8;
  expectRejected(model, 'digital commitment outside configured upper bound', overlongBoundedDigitalCommitment, [
    /annual-5-7d: plannedDuration.value must be at most 7/,
  ]);

  const weakenedSoloCommitment = clone(control);
  const soloCommitment = domain(weakenedSoloCommitment, 'solitude-separation-navigation')
    .requirementCommitments[0];
  soloCommitment.plannedDuration.value = 0.5;
  soloCommitment.plannedCompletionAge = 17;
  soloCommitment.setting = 'back-garden';
  soloCommitment.communicationMode = 'continuous-messaging';
  expectRejected(model, 'weakened solo wilderness milestone commitment', weakenedSoloCommitment, [
    /solo-wilderness-overnight-by-16: plannedDuration.value must be at least 1/,
    /solo-wilderness-overnight-by-16: plannedCompletionAge must be no later than 16/,
    /solo-wilderness-overnight-by-16: setting must be wilderness/,
    /solo-wilderness-overnight-by-16: communicationMode must be emergency-only/,
  ]);

  const shortenedServiceCommitment = clone(control);
  domain(shortenedServiceCommitment, 'service-reality')
    .requirementCommitments[0].plannedDuration.value = 5;
  expectRejected(model, 'service commitment below six months', shortenedServiceCommitment, [
    /minimum-six-month-service: plannedDuration.value must be at least 6/,
  ]);

  const manufacturedMoralCommitment = clone(control);
  const moralCommitment = domain(manufacturedMoralCommitment, 'moral-courage-integrity')
    .requirementCommitments[0];
  moralCommitment.targetRecordsPerYear = 0;
  moralCommitment.caseSource = 'scheduled-simulation';
  moralCommitment.manufacturedCasesForbidden = false;
  expectRejected(model, 'weakened annual moral-courage evidence commitment', manufacturedMoralCommitment, [
    /annual-natural-case-evidence: targetRecordsPerYear must be at least 1/,
    /annual-natural-case-evidence: caseSource must be naturally-occurring/,
    /annual-natural-case-evidence: manufacturedCasesForbidden must be true/,
  ]);

  const optionalDomain = clone(control);
  domain(optionalDomain, 'service-reality').required = false;
  expectRejected(model, 'optionalised required domain', optionalDomain, [
    /service-reality: required must be true/,
  ]);

  const wrongNumericThreshold = clone(control);
  domain(wrongNumericThreshold, 'service-reality').minimumAttributes['data-min-months'] = '3';
  expectRejected(model, 'lowered numeric threshold', wrongNumericThreshold, [
    /service-reality: minimumAttributes must exactly equal.*data-min-months.*6/,
  ]);

  const extraNumericThreshold = clone(control);
  domain(extraNumericThreshold, 'strength-load').minimumAttributes['data-min-hours'] = '1';
  expectRejected(model, 'invented numeric threshold', extraNumericThreshold, [
    /strength-load: minimumAttributes must exactly equal \{\}/,
  ]);

  const missingOwner = clone(control);
  domain(missingOwner, 'real-responsibility').owner = 'TBD';
  expectRejected(model, 'missing named owner', missingOwner, [
    /real-responsibility: requires a named owner/,
  ]);

  const missingOperationalFields = clone(control);
  const operationalRecord = domain(missingOperationalFields, 'adverse-weather');
  operationalRecord.verifier = 'TBD';
  operationalRecord.prerequisites = '';
  operationalRecord.emergencyOrEscalationRoute = 'none';
  expectRejected(model, 'missing verifier, prerequisites, and emergency route', missingOperationalFields, [
    /adverse-weather: requires a named verifier/,
    /adverse-weather: prerequisites must be substantive/,
    /adverse-weather: emergencyOrEscalationRoute must be substantive/,
  ]);

  const unsupportedLedgerStatus = clone(control);
  domain(unsupportedLedgerStatus, 'material-constraint').status = 'probably-done';
  expectRejected(model, 'unsupported ledger status', unsupportedLedgerStatus, [
    /material-constraint: status must be planned, preparing, in-progress, completed, deferred, or invalidated/,
  ]);

  const falseCompletion = clone(control);
  const falseCompletionRecord = domain(falseCompletion, 'public-failure-rejection');
  falseCompletionRecord.status = 'completed';
  falseCompletionRecord.completionRecord = null;
  expectRejected(model, 'completed status without evidence record', falseCompletion, [
    /public-failure-rejection: completed status requires completionRecord/,
  ]);

  const incompleteStructuredResult = clone(completedLedgerControl);
  const incompleteDigitalResult = domain(incompleteStructuredResult, 'digital-abstinence').completionRecord;
  incompleteDigitalResult.requirementResults = incompleteDigitalResult.requirementResults
    .filter((entry) => entry.requirementId !== 'annual-5-7d');
  incompleteDigitalResult.requirementResults[0].completedOccurrencesInEvidenceYear = 3;
  incompleteDigitalResult.requirementResults[0].shortestCompletedDuration.value = 36;
  expectRejected(model, 'completed ledger with unmet structured minima', incompleteStructuredResult, [
    /quarterly-48h: completedOccurrencesInEvidenceYear must be at least 4/,
    /quarterly-48h: shortestCompletedDuration.value must be at least 48/,
    /completionRecord missing structured requirement results annual-5-7d/,
  ]);

  const weakCoreFields = clone(control);
  const weakRecord = domain(weakCoreFields, 'austere-living');
  weakRecord.route = 'camp';
  weakRecord.minimumStimulus = 'be uncomfortable';
  weakRecord.evidencePlan = 'photo';
  expectRejected(model, 'non-substantive route, minimum, and evidence', weakCoreFields, [
    /austere-living: route must be substantive/,
    /austere-living: minimumStimulus must be substantive/,
    /austere-living: evidencePlan must be substantive/,
  ]);

  const rejectedContract = clone(control);
  rejectedContract.nonSubstitutionAccepted = false;
  expectRejected(model, 'rejected non-substitution contract', rejectedContract, [
    /nonSubstitutionAccepted must be true/,
  ]);

  const crossDomainSubstitution = clone(control);
  const publicFailure = domain(crossDomainSubstitution, 'public-failure-rejection');
  publicFailure.creditDomain = 'real-responsibility';
  publicFailure.substitutesFor = ['real-responsibility'];
  expectRejected(model, 'cross-domain substitution', crossDomainSubstitution, [
    /public-failure-rejection: creditDomain must equal its own domainId/,
    /public-failure-rejection: substitutesFor must be an empty array/,
  ]);

  const incompleteOperations = clone(control);
  const responsibility = domain(incompleteOperations, 'real-responsibility');
  delete responsibility.schedule;
  responsibility.displacementPlan = '';
  responsibility.recoveryPlan = 'none';
  expectRejected(model, 'missing schedule, displacement, and recovery', incompleteOperations, [
    /real-responsibility: missing schedule/,
    /real-responsibility: displacementPlan must be substantive/,
    /real-responsibility: recoveryPlan must be substantive/,
  ]);

  const unsafePhysical = clone(control);
  const physical = domain(unsafePhysical, 'physical-exhaustion').oneStressorProtocol;
  physical.controlled = false;
  physical.readilyExtractable = false;
  physical.emergencyRoute = 'none';
  physical.stopCriteria = ['keep going'];
  physical.preparation = 'show up';
  physical.recovery = 'walk it off';
  physical.coCreditDomains = [
    'adverse-weather',
    'austere-living',
    'solitude-separation-navigation'
  ];
  expectRejected(model, 'unsafe physical-exhaustion protocol', unsafePhysical, [
    /physical-exhaustion must be explicitly controlled/,
    /physical-exhaustion must be readily extractable/,
    /oneStressorProtocol.emergencyRoute must be substantive/,
    /at least three substantive stop criteria/,
    /oneStressorProtocol.preparation must be substantive/,
    /oneStressorProtocol.recovery must be substantive/,
    /cannot co-credit adverse-weather, austere-living, solitude-separation-navigation/,
  ]);

  const missingPhysicalProtocol = clone(control);
  delete domain(missingPhysicalProtocol, 'physical-exhaustion').oneStressorProtocol;
  expectRejected(model, 'missing one-stressor protocol', missingPhysicalProtocol, [
    /physical-exhaustion requires oneStressorProtocol/,
  ]);

  const manufacturedMoralIncident = clone(control);
  const moral = domain(manufacturedMoralIncident, 'moral-courage-integrity');
  moral.schedule.kind = 'episodic';
  moral.schedule.windows = ['Manufactured dilemma scheduled for 2027-03-03.'];
  expectRejected(model, 'manufactured moral-courage incident', manufacturedMoralIncident, [
    /moral-courage incidents must use natural-case-capture/,
    /moral-courage incidents must not have manufactured date windows/,
  ]);
}

await main();
