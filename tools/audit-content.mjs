import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdownToMdast } from 'satteri';
import { normalizeUniverseId } from '../src/scripts/universeRefs.js';
import { formatAgeLabel, normalizeResourceTier } from '../src/scripts/uiLocale.js';
import { mergeResourceRecord } from '../src/scripts/resources.js';
import { validateModel as validateHardshipModel } from './audit-hardship.mjs';
import {
  auditBilingualResourceLinkParity,
  auditLocaleUniverseLinks,
} from './lib/universeLinkAudit.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const contentRoot = path.join(repoRoot, 'src/content');
const capacityModelPath = path.join(repoRoot, 'config/capacity-model.json');
const hardshipModelPath = path.join(repoRoot, 'config/hardship-model.json');

const LOCALES = [
  {
    id: 'en',
    phases: path.join(contentRoot, 'phases'),
    universes: path.join(contentRoot, 'universes'),
    models: path.join(contentRoot, 'models'),
    targets: path.join(contentRoot, 'targets'),
  },
  {
    id: 'es',
    phases: path.join(contentRoot, 'phases-es'),
    universes: path.join(contentRoot, 'universes-es'),
    models: path.join(contentRoot, 'models-es'),
    targets: path.join(contentRoot, 'targets-es'),
  },
];

const EXPECTED_COUNTS = {
  phases: 8,
  universes: 219,
  models: 19,
  targets: 11,
};

const EXPANDED_UNIVERSE_FIELDS = [
  'kind',
  'summary',
  'whyItBelongs',
  'targets',
  'models',
  'intensity',
  'socialValue',
];

const TARGET_MAP_PHASE_IDS = new Set([
  'framework',
  'age-0-1',
  'age-1-3',
  'age-4-7',
  'age-8-10',
  'age-11-13',
  'age-14-16',
  'age-17-18',
]);

// These fields define the shared entity graph. Descriptive and evaluative
// metadata may legitimately differ by locale and is therefore not forced into
// byte-for-byte parity here.
const STRUCTURAL_UNIVERSE_FIELDS = ['kind', 'models'];

const EXPECTED_TARGET_NUMBERS = Array.from({ length: 11 }, (_, index) => index + 1);

const CAPACITY_HEADINGS = {
  en: {
    operations: 'Operations',
    execution: 'Capacity-Governed Execution',
    application: 'The Application Architecture',
    blocks: [
      '1. Select the Delivery Mode',
      '2. Select the Operating Mode',
      '3. Choose, Rotate, and Displace',
      '4. Weekly Capacity',
      '5. Weekly Loop',
      '6. Term Evaluation Loop',
      '7. Ownership',
      '8. Stop and Reset Conditions',
    ],
    rhythm: 'Weekly Rhythm',
  },
  es: {
    operations: 'Operaciones',
    execution: 'Ejecución Gobernada por la Capacidad',
    application: 'La Arquitectura de Aplicación',
    blocks: [
      '1. Selecciona el Modo de Provisión',
      '2. Selecciona el Modo Operativo',
      '3. Elige, Rota y Desplaza',
      '4. Capacidad Semanal',
      '5. Bucle Semanal',
      '6. Bucle de Evaluación Trimestral',
      '7. Responsabilidad',
      '8. Condiciones de Parada y Reinicio',
    ],
    rhythm: 'Ritmo Semanal',
  },
};

const CAPACITY_DELIVERY_MODES = ['overlay', 'hybrid', 'fullSchool'];

const EXPECTED_HARDSHIP_DOMAIN_IDS = [
  'physical-exhaustion',
  'strength-load',
  'adverse-weather',
  'austere-living',
  'digital-abstinence',
  'solitude-separation-navigation',
  'material-constraint',
  'real-responsibility',
  'low-status-entry',
  'public-failure-rejection',
  'service-reality',
  'moral-courage-integrity',
];

const EXPECTED_HARDSHIP_PHASE_IDS = [
  'age-4-7',
  'age-8-10',
  'age-11-13',
  'age-14-16',
  'age-17-18',
];

const TARGET_MAP_HEADINGS = new Set([
  'Activity Map',
  'The Eleven Targets',
  'Mapa de Actividades',
  'Los Once Objetivos',
  'Eleven-Target Progression',
  'Progresión de los Once Objetivos',
]);

const HARDSHIP_HEADINGS = {
  en: {
    framework: /^Hardship Architecture\b/u,
    domains: /^Twelve Required Domains\b/u,
    safety: /^Safety Contracts\b/u,
    evidence: /^Evidence Boundary\b/u,
    phase: /\bHardship\b/u,
  },
  es: {
    framework: /^Arquitectura de la Dificultad\b/u,
    domains: /^Doce Dominios Requeridos\b/u,
    safety: /^Contrato Estrecho de Seguridad\b/u,
    evidence: /^Límite de la Evidencia\b/u,
    phase: /Arquitectura de la Dificultad/u,
  },
};

const REQUIRED_HARDSHIP_SOURCE_HOSTS = [
  'developingchild.harvard.edu',
  'unicef.org',
  'hse.gov.uk',
  'publications.aap.org',
];

function getFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/u);
  return match?.[1] ?? '';
}

function getSlug(filename) {
  return filename.replace(/\.md$/u, '');
}

function getFrontmatterScalar(frontmatter, field) {
  return frontmatter.match(new RegExp(`^${field}:\\s*["']?([^\\n"']+)["']?\\s*$`, 'mu'))?.[1]?.trim() ?? '';
}

function getInlineList(frontmatter, field) {
  const raw = frontmatter.match(new RegExp(`^${field}:\\s*\\[([^\\]]*)\\]`, 'mu'))?.[1] ?? '';
  return raw
    .split(',')
    .map((value) => value.trim().replace(/^["']|["']$/gu, ''))
    .filter(Boolean);
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
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

function headingText(node) {
  return node?.type === 'heading' ? textContent(node).trim() : '';
}

function findHeadings(tree, depth, matcher) {
  if (!tree) return [];
  return tree.children
    .map((node, index) => ({ node, index, text: headingText(node) }))
    .filter(({ node, text }) => node.type === 'heading'
      && node.depth === depth
      && (typeof matcher === 'string' ? text === matcher : matcher.test(text)));
}

function sectionNodes(tree, headingIndex) {
  if (!tree || headingIndex < 0) return [];
  const depth = tree.children[headingIndex]?.depth;
  const nodes = [];
  for (const node of tree.children.slice(headingIndex + 1)) {
    if (node.type === 'heading' && node.depth <= depth) break;
    nodes.push(node);
  }
  return nodes;
}

function firstMeaningfulChild(listItem) {
  const firstBlock = listItem?.children?.[0];
  if (!firstBlock) return null;
  return firstBlock.children?.find((child) => child.type !== 'text' || child.value.trim() !== '') ?? null;
}

function tableCells(table) {
  if (table?.type !== 'table') return [];
  return table.children.map((row) => row.children.map((cell) => textContent(cell).replace(/\s+/gu, ' ').trim()));
}

function numericValues(value) {
  return [...value.matchAll(/\d+(?:\.\d+)?/gu)].map((match) => Number(match[0]));
}

function nodeLine(node) {
  return node?.position?.start?.line ?? '?';
}

function countFieldCoverage(frontmatters) {
  return Object.fromEntries(
    EXPANDED_UNIVERSE_FIELDS.map((field) => [
      field,
      frontmatters.filter((frontmatter) => new RegExp(`^${field}:`, 'mu').test(frontmatter)).length,
    ])
  );
}

async function readMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(filenames.map(async (filename) => {
    const fullPath = path.join(dir, filename);
    const source = await readFile(fullPath, 'utf8');
    try {
      return { filename, fullPath, source, tree: markdownToMdast(source), parseError: null };
    } catch (error) {
      return { filename, fullPath, source, tree: null, parseError: error };
    }
  }));
}

function auditTargetMaps(localeId, phaseFiles) {
  const errors = [];
  const phaseSummary = new Map();

  for (const file of phaseFiles) {
    const frontmatter = getFrontmatter(file.source);
    const phaseId = getFrontmatterScalar(frontmatter, 'phaseId');
    const headings = findHeadings(file.tree, 2, { test: (value) => TARGET_MAP_HEADINGS.has(value) });
    const expectedMapCount = TARGET_MAP_PHASE_IDS.has(phaseId) ? 1 : 0;
    if (headings.length !== expectedMapCount) {
      errors.push(`${localeId}/${file.filename}: expected ${expectedMapCount} semantic target map(s), found ${headings.length}`);
    }

    const maps = [];
    for (const heading of headings) {
      const orderedLists = sectionNodes(file.tree, heading.index)
        .filter((node) => node.type === 'list' && node.ordered);
      if (orderedLists.length !== 1) {
        errors.push(`${localeId}/${file.filename}:${nodeLine(heading.node)}: target-map section must contain one ordered list, found ${orderedLists.length}`);
        continue;
      }
      const list = orderedLists[0];
      if (list.start != null && list.start !== 1) {
        errors.push(`${localeId}/${file.filename}:${nodeLine(list)}: target map must start at 1`);
      }
      if (list.children.length !== EXPECTED_TARGET_NUMBERS.length) {
        errors.push(`${localeId}/${file.filename}:${nodeLine(list)}: target map must contain exactly 11 items, found ${list.children.length}`);
      }
      const canonical = [];
      for (const [index, item] of list.children.entries()) {
        const first = firstMeaningfulChild(item);
        if (!first || first.type !== 'strong' || textContent(first).trim().length < 2) {
          errors.push(`${localeId}/${file.filename}:${nodeLine(item)}: target ${index + 1} must begin with a bold target name`);
        }
        if (textContent(item).trim().length < 20) {
          errors.push(`${localeId}/${file.filename}:${nodeLine(item)}: target ${index + 1} needs a substantive visible explanation`);
        }
        canonical.push(index + 1);
      }
      maps.push(canonical);
    }
    phaseSummary.set(phaseId, maps);
  }

  return { errors, phaseSummary };
}

function auditPhaseAgeLabels(localeId, phaseFiles) {
  const errors = [];
  const expectedPattern = localeId === 'es'
    ? /^\d{1,2}–\d{1,2} años de edad$/u
    : /^\d{1,2}–\d{1,2} yr old$/u;

  for (const file of phaseFiles) {
    const frontmatter = getFrontmatter(file.source);
    const phaseId = getFrontmatterScalar(frontmatter, 'phaseId');
    if (!phaseId.startsWith('age-')) continue;
    const label = getFrontmatterScalar(frontmatter, 'label');
    if (!expectedPattern.test(label)) {
      errors.push(`${localeId}/${file.filename}: age label must explicitly identify the range as ${localeId === 'es' ? 'años de edad' : 'yr old'}; found '${label}'`);
    }
  }

  return errors;
}

function auditUniverses(localeId, universeFiles) {
  const universeIds = new Set(universeFiles.map((file) => getSlug(file.filename)));
  const frontmatters = universeFiles.map((file) => getFrontmatter(file.source));
  const errors = [];
  const thinUniverses = [];

  for (const file of universeFiles) {
    const frontmatter = getFrontmatter(file.source);
    const missingFields = EXPANDED_UNIVERSE_FIELDS.filter(
      (field) => !new RegExp(`^${field}:`, 'mu').test(frontmatter)
    );

    if (missingFields.length > 0) {
      thinUniverses.push({ filename: file.filename, missingFields });
    }

    const substituteIds = getInlineList(frontmatter, 'substitutes');
    const unknownSubstitutes = substituteIds.filter((substituteId) => !universeIds.has(normalizeUniverseId(substituteId)));
    if (unknownSubstitutes.length > 0) {
      errors.push(`${localeId}/${file.filename}: unknown substitutes ${unknownSubstitutes.join(', ')}`);
    }

    const phaseIds = [];
    const phaseBlocks = frontmatter.split(/^\s*-\s*phaseId:\s*/gmu).slice(1);
    for (const block of phaseBlocks) {
      const phaseId = block.match(/^([a-z0-9-]+)/u)?.[1] ?? '';
      if (phaseId) phaseIds.push(phaseId);
    }
    const duplicateEntries = phaseIds.filter((phaseId, index) => phaseIds.indexOf(phaseId) !== index);
    if (duplicateEntries.length > 0) {
      errors.push(`${localeId}/${file.filename}: duplicate phaseId entries ${[...new Set(duplicateEntries)].join(', ')}`);
    }
  }

  return {
    coverage: countFieldCoverage(frontmatters),
    total: universeFiles.length,
    universeIds,
    thinUniverses,
    errors,
  };
}

function auditUniverseReferences(localeId, phaseFiles, universeIds) {
  return auditLocaleUniverseLinks({ localeId, phaseFiles, universeIds });
}

function auditUniverseReferenceNormalizer() {
  const cases = new Map([
    ['borges', 'borges'],
    ['borges.md', 'borges'],
    ['universe-borges', 'borges'],
    ['#universe-borges', 'borges'],
    ['  #universe-borges.md  ', 'borges'],
  ]);
  const errors = [];
  for (const [input, expected] of cases) {
    const actual = normalizeUniverseId(input);
    if (actual !== expected) {
      errors.push(`universe reference normalizer: expected '${input}' -> '${expected}', found '${actual}'`);
    }
  }
  return errors;
}

function setDifference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort((a, b) => a.localeCompare(b));
}

function auditFilenameParity(collectionName, englishFiles, spanishFiles) {
  const english = new Set(englishFiles.map((file) => file.filename));
  const spanish = new Set(spanishFiles.map((file) => file.filename));
  const errors = [];
  const missingSpanish = setDifference(english, spanish);
  const missingEnglish = setDifference(spanish, english);

  if (missingSpanish.length > 0) errors.push(`${collectionName}: missing Spanish files ${missingSpanish.join(', ')}`);
  if (missingEnglish.length > 0) errors.push(`${collectionName}: missing English files ${missingEnglish.join(', ')}`);
  return errors;
}

function getStructuralValue(frontmatter, field) {
  const list = getInlineList(frontmatter, field);
  if (list.length > 0 || new RegExp(`^${field}:\\s*\\[`, 'mu').test(frontmatter)) {
    return JSON.stringify(list);
  }
  return getFrontmatterScalar(frontmatter, field);
}

function getPhaseStructure(frontmatter) {
  return [...frontmatter.matchAll(/^\s*-\s*phaseId:\s*([a-z0-9-]+)/gmu)]
    .map((match) => match[1]);
}

function auditUniverseLocaleStructure(englishFiles, spanishFiles) {
  const errors = [];
  const spanishByName = new Map(spanishFiles.map((file) => [file.filename, file]));

  for (const englishFile of englishFiles) {
    const spanishFile = spanishByName.get(englishFile.filename);
    if (!spanishFile) continue;
    const englishFrontmatter = getFrontmatter(englishFile.source);
    const spanishFrontmatter = getFrontmatter(spanishFile.source);

    for (const field of STRUCTURAL_UNIVERSE_FIELDS) {
      const englishValue = getStructuralValue(englishFrontmatter, field);
      const spanishValue = getStructuralValue(spanishFrontmatter, field);
      if (englishValue !== spanishValue) {
        errors.push(`universes/${englishFile.filename}: structural field '${field}' differs between English and Spanish`);
      }
    }

    if (JSON.stringify(getPhaseStructure(englishFrontmatter)) !== JSON.stringify(getPhaseStructure(spanishFrontmatter))) {
      errors.push(`universes/${englishFile.filename}: phase coverage differs between English and Spanish`);
    }
  }

  return errors;
}

function auditTargetMapLocaleParity(englishSummary, spanishSummary) {
  const errors = [];
  const allPhaseIds = new Set([...englishSummary.keys(), ...spanishSummary.keys()]);
  for (const phaseId of allPhaseIds) {
    const english = englishSummary.get(phaseId) ?? [];
    const spanish = spanishSummary.get(phaseId) ?? [];
    if (JSON.stringify(english) !== JSON.stringify(spanish)) {
      errors.push(`phase ${phaseId}: target-map structure differs between English and Spanish`);
    }
  }
  return errors;
}

function expectedCapacityValues(phase, deliveryMode) {
  const capacity = phase.capacity[deliveryMode];
  return [
    capacity.guaranteeHours,
    capacity.standard.capHours,
    capacity.intensive.capHours,
    capacity.hardCapHours,
  ];
}

function auditCapacityTable(localeId, filename, table, capacityModel, context) {
  const errors = [];
  const matrix = [];
  const rows = tableCells(table);
  if (rows.length !== capacityModel.phases.length + 1) {
    errors.push(`${localeId}/${filename}:${nodeLine(table)}: ${context} capacity table must contain one header and ${capacityModel.phases.length} phase rows, found ${rows.length}`);
    return { errors, phaseCount: 0, matrix };
  }
  if (rows[0]?.length !== 4) {
    errors.push(`${localeId}/${filename}:${nodeLine(table)}: ${context} capacity table header must contain four columns`);
  }

  for (const [index, phase] of capacityModel.phases.entries()) {
    const row = rows[index + 1] ?? [];
    if (row.length !== 4) {
      errors.push(`${localeId}/${filename}:${nodeLine(table)}: ${phase.id} capacity row must contain four cells, found ${row.length}`);
      continue;
    }
    const observedAge = numericValues(row[0]).slice(0, 2);
    const expectedAge = numericValues(phase.id).slice(0, 2);
    if (JSON.stringify(observedAge) !== JSON.stringify(expectedAge)) {
      errors.push(`${localeId}/${filename}:${nodeLine(table)}: capacity row ${index + 1} must describe ${phase.id}, found '${row[0]}'`);
    }
    const rowValues = [];
    for (const [modeIndex, deliveryMode] of CAPACITY_DELIVERY_MODES.entries()) {
      const observed = numericValues(row[modeIndex + 1] ?? '');
      const expected = expectedCapacityValues(phase, deliveryMode);
      rowValues.push(observed);
      if (JSON.stringify(observed) !== JSON.stringify(expected)) {
        errors.push(`${localeId}/${filename}:${nodeLine(table)}: ${phase.id}/${deliveryMode} capacity must be ${expected.join(' / ')}, found ${observed.join(' / ') || 'none'}`);
      }
    }
    matrix.push([phase.id, ...rowValues]);
  }
  return { errors, phaseCount: matrix.length, matrix };
}

function auditCapacityExecution(localeId, frameworkFile, capacityModel) {
  const errors = [];
  if (!frameworkFile) {
    return { errors: [`${localeId}/framework.md: missing framework source`], phaseCount: 0, matrix: [], blocks: [] };
  }
  const labels = CAPACITY_HEADINGS[localeId];
  const tree = frameworkFile.tree;
  const operations = findHeadings(tree, 2, labels.operations);
  const execution = findHeadings(tree, 3, labels.execution);
  const application = findHeadings(tree, 2, labels.application);
  if (operations.length !== 1) errors.push(`${localeId}/framework.md: expected one '${labels.operations}' H2, found ${operations.length}`);
  if (execution.length !== 1) errors.push(`${localeId}/framework.md: expected one '${labels.execution}' H3, found ${execution.length}`);
  if (application.length !== 1) errors.push(`${localeId}/framework.md: expected one '${labels.application}' H2, found ${application.length}`);
  if (!operations[0] || !execution[0] || !application[0]
      || !(operations[0].index < execution[0].index && execution[0].index < application[0].index)) {
    errors.push(`${localeId}/framework.md: capacity execution must appear within Operations before Application Architecture`);
    return { errors, phaseCount: 0, matrix: [], blocks: [] };
  }

  const nodes = sectionNodes(tree, execution[0].index);
  const blocks = nodes.filter((node) => node.type === 'heading' && node.depth === 4).map(headingText);
  if (JSON.stringify(blocks) !== JSON.stringify(labels.blocks)) {
    errors.push(`${localeId}/framework.md: capacity H4 sequence must be ${labels.blocks.join(' | ')}; found ${blocks.join(' | ') || 'none'}`);
  }
  const blockquote = nodes.find((node) => node.type === 'blockquote');
  const completeness = textContent(blockquote).replace(/\s+/gu, ' ').trim();
  const entiretyTerms = localeId === 'es'
    ? [/longitudinal/iu, /garant[ií]as/iu, /no simult[aá]nea/iu, /dificultad/iu]
    : [/longitudinal/iu, /guarantees/iu, /not simultaneous/iu, /hardship/iu];
  if (!blockquote || completeness.length < 300 || entiretyTerms.some((term) => !term.test(completeness))) {
    errors.push(`${localeId}/framework.md: capacity execution needs a substantive longitudinal-completeness blockquote covering guarantees and hardship`);
  }

  const tables = nodes.filter((node) => node.type === 'table');
  if (tables.length !== 1) {
    errors.push(`${localeId}/framework.md: capacity execution must contain exactly one semantic table, found ${tables.length}`);
    return { errors, phaseCount: 0, matrix: [], blocks };
  }
  const tableAudit = auditCapacityTable(localeId, frameworkFile.filename, tables[0], capacityModel, 'master');
  errors.push(...tableAudit.errors);

  const executionText = textContent({ children: nodes });
  for (const required of ['config/capacity-model.json', 'config/hardship-model.json', 'audit:capacity', 'audit:hardship']) {
    if (!executionText.includes(required)) errors.push(`${localeId}/framework.md: capacity documentation must visibly name '${required}'`);
  }
  return { errors, phaseCount: tableAudit.phaseCount, matrix: tableAudit.matrix, blocks };
}

function auditPhaseCapacityMenus(localeId, phaseFiles, capacityModel) {
  const errors = [];
  const summary = new Map();
  for (const phaseId of ['age-14-16', 'age-17-18']) {
    const file = phaseFiles.find((entry) => getFrontmatterScalar(getFrontmatter(entry.source), 'phaseId') === phaseId);
    const phase = capacityModel.phases.find((entry) => entry.id === phaseId);
    if (!file || !phase) {
      errors.push(`${localeId}/${phaseId}: missing phase capacity source or model`);
      continue;
    }
    const headings = findHeadings(file.tree, 2, CAPACITY_HEADINGS[localeId].rhythm);
    if (headings.length !== 1) {
      errors.push(`${localeId}/${file.filename}: expected one weekly-rhythm capacity section, found ${headings.length}`);
      continue;
    }
    const nodes = sectionNodes(file.tree, headings[0].index);
    const tables = nodes.filter((node) => node.type === 'table');
    if (tables.length !== 1) {
      errors.push(`${localeId}/${file.filename}: weekly-rhythm section must contain one semantic capacity table, found ${tables.length}`);
      continue;
    }
    const rows = tableCells(tables[0]);
    if (rows.length !== 4 || rows.some((row) => row.length !== 5)) {
      errors.push(`${localeId}/${file.filename}:${nodeLine(tables[0])}: phase capacity table must have one header plus three five-cell delivery rows`);
      continue;
    }
    const observedMatrix = [];
    for (const [index, deliveryMode] of CAPACITY_DELIVERY_MODES.entries()) {
      const observed = rows[index + 1].slice(1).flatMap(numericValues);
      const expected = expectedCapacityValues(phase, deliveryMode);
      observedMatrix.push([deliveryMode, observed]);
      if (JSON.stringify(observed) !== JSON.stringify(expected)) {
        errors.push(`${localeId}/${file.filename}:${nodeLine(tables[0])}: ${deliveryMode} capacity must be ${expected.join(' / ')}, found ${observed.join(' / ') || 'none'}`);
      }
    }
    const visible = textContent({ children: nodes });
    const requiredConcepts = localeId === 'es'
      ? [/men[uú]/iu, /no.*aditiv/iu, /sustituye/iu, /evaluaci[oó]n/iu, /privacidad/iu]
      : [/menu/iu, /not an additive/iu, /replaces/iu, /evaluation/iu, /privacy/iu];
    for (const concept of requiredConcepts) {
      if (!concept.test(visible)) errors.push(`${localeId}/${file.filename}: weekly-rhythm section is missing required concept ${concept}`);
    }
    summary.set(phaseId, observedMatrix);
  }
  return { errors, summary };
}

function auditPublicProfilePrivacy(files) {
  const errors = [];
  const forbiddenPatterns = [
    { pattern: /\bNico\b/gu, label: 'named child profile Nico' },
    { pattern: /\bMaia\b/gu, label: 'named child profile Maia' },
    { pattern: /export\s+const\s+childProfiles\s*=\s*\{(?!\s*\})/gu, label: 'bundled named child profile data' },
    { pattern: /uses\s+three\s+validated\s+psychometric\s+instruments/giu, label: 'false claim that custom controls administer validated instruments' },
    { pattern: /usa\s+tres\s+instrumentos\s+psicom[eé]tricos\s+validados/giu, label: 'false claim that custom controls administer validated instruments' },
    { pattern: /complete\s+published\s+structure/giu, label: 'false claim that custom controls reproduce a complete instrument' },
    { pattern: /estructura\s+publicada\s+completa/giu, label: 'false claim that custom controls reproduce a complete instrument' },
  ];

  for (const file of files) {
    for (const { pattern, label } of forbiddenPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(file.source);
      if (match) errors.push(`${file.filename}:${lineNumberAt(file.source, match.index)}: public bundle contains ${label}`);
    }
  }
  return errors;
}

function auditProfileControlAccessibility(files) {
  const errors = [];
  const byFilename = new Map(files.map((file) => [file.filename, file.source]));
  const sidebar = byFilename.get('src/components/Sidebar.astro') ?? '';
  const navigation = byFilename.get('src/scripts/navigation.js') ?? '';
  const app = byFilename.get('src/scripts/app.js') ?? '';

  if (!sidebar.includes('aria-label={ui.resetLabel}')) {
    errors.push('src/components/Sidebar.astro: reset control must render its localized aria-label as an Astro expression');
  }
  if (!navigation.includes("header.setAttribute('aria-expanded', String(!isInitiallyCollapsed));")) {
    errors.push('src/scripts/navigation.js: collapsed-section initialization must synchronize aria-expanded');
  }
  if (!navigation.includes("header.setAttribute('aria-expanded', String(!isCollapsed));")) {
    errors.push('src/scripts/navigation.js: collapsed-section toggle must synchronize aria-expanded');
  }
  if (
    !app.includes("document.querySelectorAll('.material-symbols-rounded')")
    || !app.includes("icon.setAttribute('aria-hidden', 'true')")
  ) {
    errors.push('src/scripts/app.js: decorative material icons must be hidden from assistive technology');
  }

  return errors;
}

function auditDynamicUiParity(files) {
  const errors = [];
  const byFilename = new Map(files.map((file) => [file.filename, file.source]));
  const requiredSourceFragments = {
    'src/scripts/filters.js': [
      "normalizeResourceTier(cell.textContent)",
      "uiText('curriculumThreads')",
      'película|pelicula',
    ],
    'src/scripts/domain.js': [
      'formatAgeLabel(phase.phaseLabel)',
      "uiText('allDomains')",
      'aria-hidden="true"',
    ],
    'src/scripts/models.js': [
      'formatAgeLabel(phase.phaseLabel)',
      "uiText('noModelContent')",
      "uiText('layer5Fallback')",
    ],
    'src/scripts/targets.js': [
      'formatAgeLabel(phase.phaseLabel)',
      "uiText('seed')",
      'semilla',
    ],
    'src/scripts/resources.js': [
      'normalizeResourceTier(cells[0].textContent)',
      'formatAgeLabel(p.phaseLabel)',
      "uiText('noResources')",
      'categoryLabel(data.category)',
      'tierLabel(data.tier)',
    ],
    'src/scripts/search.js': [
      'formatAgeLabel(label)',
      'normalizeUniverseId(slug)',
      "window.history.replaceState(null, '', `#universe-${universeId}`)",
    ],
  };

  for (const [filename, fragments] of Object.entries(requiredSourceFragments)) {
    const source = byFilename.get(filename) ?? '';
    for (const fragment of fragments) {
      if (!source.includes(fragment)) errors.push(`${filename}: missing dynamic-UI integrity fragment '${fragment}'`);
    }
  }

  const localeSource = byFilename.get('src/scripts/uiLocale.js') ?? '';
  for (const label of [
    'Hilos Curriculares',
    'Todos los Dominios',
    'No hay recursos que coincidan con los filtros actuales.',
    'Parte de un universo más amplio',
    'años de edad',
  ]) {
    if (!localeSource.includes(label)) errors.push(`src/scripts/uiLocale.js: missing representative Spanish UI text '${label}'`);
  }

  const tierCases = [
    ['FOUNDATIONAL — Integral', 'foundational'],
    ['FUNDACIONAL — Integral al programa', 'foundational'],
    ['FUNDAMENTAL — Integral al programa', 'foundational'],
    ['CORE — Strongly recommended', 'core'],
    ['CENTRAL — Muy recomendado', 'core'],
    ['RECOMMENDED — Good defaults', 'recommended'],
    ['RECOMENDADO — Buenos valores', 'recommended'],
    ['Unrelated heading', ''],
  ];
  for (const [input, expected] of tierCases) {
    const actual = normalizeResourceTier(input);
    if (actual !== expected) errors.push(`dynamic resource tier parser: '${input}' must resolve to '${expected}', found '${actual}'`);
  }

  for (const [input, language, expected] of [
    ['14–16', 'en', '14–16 yr old'],
    ['14–16', 'es', '14–16 años de edad'],
    ['framework', 'es', 'framework'],
  ]) {
    const actual = formatAgeLabel(input, language);
    if (actual !== expected) errors.push(`dynamic age formatter: '${input}'/${language} must render '${expected}', found '${actual}'`);
  }

  for (const file of files.filter((entry) => entry.filename.startsWith('src/scripts/'))) {
    const iconTags = file.source.match(/<span\b[^>]*\bclass=(['"])[^'"]*\bmaterial-symbols-rounded\b[^'"]*\1[^>]*>/gu) ?? [];
    for (const tag of iconTags) {
      if (!/\baria-hidden=(['"])true\1/u.test(tag)) {
        errors.push(`${file.filename}:${lineNumberAt(file.source, file.source.indexOf(tag))}: generated material icon must be aria-hidden`);
      }
    }
  }

  const mobileSearchIds = ['mobile-search-overlay', 'mobile-search-bar', 'mobile-search-input', 'mobile-search-close', 'mobile-search-results'];
  for (const id of mobileSearchIds) {
    const count = files.reduce((total, file) => total + (file.source.match(new RegExp(`id=["']${id}["']`, 'gu')) ?? []).length, 0);
    if (count !== 1) errors.push(`public source: expected one #${id}, found ${count}`);
  }

  return errors;
}

function auditResourceMergeSemantics() {
  const errors = [];
  const map = new Map();
  mergeResourceRecord(map, {
    key: 'dune',
    name: 'Dune',
    category: 'equipment',
    tier: 'recommended',
    targets: ['Deep Curiosity'],
    universeId: null,
    phaseId: 'age-14-16',
    phaseLabel: '14–16',
    description: '<p>Short two-column recommendation.</p>',
    sourceColumns: 2,
  });
  mergeResourceRecord(map, {
    key: 'dune',
    name: 'Dune',
    category: 'books',
    tier: 'core',
    targets: ['First-Principles Reasoning'],
    universeId: 'dune',
    phaseId: 'age-14-16',
    phaseLabel: '14–16',
    description: '<p>Richer three-column description.</p>',
    sourceColumns: 3,
  });
  // A later sparse duplicate may raise priority, but must not erase the richer
  // category or description or create another phase entry.
  mergeResourceRecord(map, {
    key: 'dune',
    name: 'Dune',
    category: 'equipment',
    tier: 'foundational',
    targets: ['Creative Production'],
    universeId: null,
    phaseId: 'age-14-16',
    phaseLabel: '14–16',
    description: '<p>Another sparse duplicate.</p>',
    sourceColumns: 2,
  });

  const entry = map.get('dune');
  if (!entry) return ['resource merge helper: failed to create a merged resource'];
  if (entry.category !== 'books') errors.push(`resource merge helper: richer category must be books, found ${entry.category}`);
  if (entry.tier !== 'foundational') errors.push(`resource merge helper: highest tier must be foundational, found ${entry.tier}`);
  if (entry.universeId !== 'dune') errors.push(`resource merge helper: universe ID must be retained, found ${entry.universeId}`);
  if (entry.phases.length !== 1) errors.push(`resource merge helper: expected one age-14-16 phase, found ${entry.phases.length}`);
  if (entry.phases[0]?.description !== '<p>Richer three-column description.</p>') {
    errors.push('resource merge helper: sparse duplicate overwrote richer three-column description');
  }
  if (entry.phases[0]?.tier !== 'foundational') errors.push(`resource merge helper: phase must retain highest tier, found ${entry.phases[0]?.tier}`);
  for (const target of ['Deep Curiosity', 'First-Principles Reasoning', 'Creative Production']) {
    if (!entry.targets.has(target)) errors.push(`resource merge helper: missing unioned target '${target}'`);
  }
  return errors;
}

function auditHardshipModelConfig(model) {
  const audit = validateHardshipModel(model);
  const errors = audit.errors.map((error) => `hardship model: ${error}`);

  if (JSON.stringify(model.domains ?? []) !== JSON.stringify(EXPECTED_HARDSHIP_DOMAIN_IDS)) {
    errors.push('hardship model: domain IDs must match the canonical twelve-domain order');
  }
  if (JSON.stringify((model.phases ?? []).map((phase) => phase.phaseId)) !== JSON.stringify(EXPECTED_HARDSHIP_PHASE_IDS)) {
    errors.push('hardship model: phase IDs must match the canonical five-phase order');
  }
  const expectedDefaults = {
    tier: 'foundational',
    requiredBy: '18',
    substitution: 'within-domain-only',
  };
  for (const [field, expected] of Object.entries(expectedDefaults)) {
    if (model.domainDefaults?.[field] !== expected) {
      errors.push(`hardship model: domainDefaults.${field} must be '${expected}'`);
    }
  }
  if (typeof model.contracts?.nonSubstitution?.es !== 'string'
      || model.contracts.nonSubstitution.es.trim().length < 20) {
    errors.push('hardship model: requires a substantive Spanish non-substitution contract');
  }
  return errors;
}

const HARDSHIP_DOMAIN_LABELS = {
  en: [
    /(?:physical.*(?:exhaustion|limit)|very-hard physical)/iu,
    /strength.*(?:load|work capacity)/iu,
    /(?:cold.*weather|adverse.?weather|^weather)/iu,
    /austere living/iu,
    /digital abstinence/iu,
    /(?:solitude.*)?separation(?:.*navigation)?/iu,
    /material constraint/iu,
    /real (?:responsibility|work)/iu,
    /(?:entering without status|low.status)/iu,
    /(?:(?:public )?failure.*(?:rejection|retry)|visible imperfection)/iu,
    /service/iu,
    /(?:moral courage|truth.*repair)/iu,
  ],
  es: [
    /agotamiento fisico/iu,
    /fuerza.*carga/iu,
    /clima adverso/iu,
    /vida austera/iu,
    /abstinencia digital/iu,
    /soledad.*separacion.*navegacion/iu,
    /restriccion material/iu,
    /responsabilidad real/iu,
    /entrada.*estatus cero/iu,
    /fracaso publico.*rechazo/iu,
    /realidad del servicio/iu,
    /coraje moral.*integridad/iu,
  ],
};

const NUMBER_WORDS = {
  en: new Map([[1, 'one'], [2, 'two'], [3, 'three'], [4, 'four'], [5, 'five'], [6, 'six'], [7, 'seven'], [8, 'eight'], [12, 'twelve']]),
  es: new Map([[1, 'un'], [2, 'dos'], [3, 'tres'], [4, 'cuatro'], [5, 'cinco'], [6, 'seis'], [7, 'siete'], [8, 'ocho'], [12, 'doce']]),
};

function normalizedText(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/gu, ' ').trim();
}

function valueIsVisible(value, text, localeId) {
  const normalized = normalizedText(text).toLowerCase();
  const numeric = new RegExp(`(^|\\D)${String(value)}(\\D|$)`, 'u');
  if (numeric.test(normalized)) return true;
  const word = NUMBER_WORDS[localeId].get(Number(value));
  return word ? new RegExp(`\\b${word}\\b`, 'u').test(normalized) : false;
}

function validateHardshipRowLabel(localeId, value, domainIndex, context, errors) {
  const normalized = normalizedText(value);
  const matcher = HARDSHIP_DOMAIN_LABELS[localeId][domainIndex];
  if (!matcher.test(normalized)) {
    errors.push(`${context}: row ${domainIndex + 1} must represent ${EXPECTED_HARDSHIP_DOMAIN_IDS[domainIndex]}, found '${value}'`);
  }
}

function auditHardshipFramework(localeId, frameworkFile, model) {
  const errors = [];
  const summary = { domains: [], safety: [], sources: [] };
  const headings = HARDSHIP_HEADINGS[localeId];
  const hardship = findHeadings(frameworkFile.tree, 2, headings.framework);
  const domains = findHeadings(frameworkFile.tree, 3, headings.domains);
  const safety = findHeadings(frameworkFile.tree, 3, headings.safety);
  const evidence = findHeadings(frameworkFile.tree, 3, headings.evidence);
  const operations = findHeadings(frameworkFile.tree, 2, CAPACITY_HEADINGS[localeId].operations);

  for (const [label, matches] of Object.entries({ hardship, domains, safety, evidence })) {
    if (matches.length !== 1) errors.push(`${localeId}/framework.md: expected one semantic hardship ${label} heading, found ${matches.length}`);
  }
  if (!hardship[0] || !domains[0] || !safety[0] || !evidence[0] || !operations[0]
      || !(hardship[0].index < domains[0].index
        && domains[0].index < safety[0].index
        && safety[0].index < evidence[0].index
        && evidence[0].index < operations[0].index)) {
    errors.push(`${localeId}/framework.md: hardship domains, safety, and evidence must remain ordered before Operations`);
    return { errors, summary };
  }

  const hardshipText = textContent({ children: sectionNodes(frameworkFile.tree, hardship[0].index) });
  const contract = model.contracts?.nonSubstitution?.[localeId] ?? '';
  if (!hardshipText.includes(contract)) {
    errors.push(`${localeId}/framework.md: hardship architecture must visibly include the canonical non-substitution contract`);
  }

  const domainTables = sectionNodes(frameworkFile.tree, domains[0].index).filter((node) => node.type === 'table');
  if (domainTables.length !== 1) {
    errors.push(`${localeId}/framework.md: hardship-domain section must contain one semantic table, found ${domainTables.length}`);
  } else {
    const rows = tableCells(domainTables[0]);
    if (rows.length !== model.domains.length + 1) {
      errors.push(`${localeId}/framework.md:${nodeLine(domainTables[0])}: hardship table must contain one header plus ${model.domains.length} domain rows, found ${rows.length}`);
    }
    const width = rows[0]?.length ?? 0;
    if (width < 3) errors.push(`${localeId}/framework.md:${nodeLine(domainTables[0])}: hardship-domain table must expose at least three columns`);
    for (const [index, domainId] of model.domains.entries()) {
      const row = rows[index + 1] ?? [];
      if (row.length !== width) errors.push(`${localeId}/framework.md: ${domainId} row has ${row.length} cells; expected ${width}`);
      validateHardshipRowLabel(localeId, row[0] ?? '', index, `${localeId}/framework.md`, errors);
      if ((row[0] ?? '').trim().length < 5 || row.slice(1).some((cell) => cell.trim().length < 20)) {
        errors.push(`${localeId}/framework.md: ${domainId} row must contain substantive visible explanations`);
      }
      summary.domains.push(domainId);
    }
  }

  const safetyLists = sectionNodes(frameworkFile.tree, safety[0].index).filter((node) => node.type === 'list');
  if (safetyLists.length !== 1) {
    errors.push(`${localeId}/framework.md: hardship-safety section must contain one semantic list, found ${safetyLists.length}`);
  } else {
    const items = safetyLists[0].children;
    if (items.length !== model.domains.length) {
      errors.push(`${localeId}/framework.md:${nodeLine(safetyLists[0])}: safety list must contain ${model.domains.length} contracts, found ${items.length}`);
    }
    for (const [index, domainId] of model.domains.entries()) {
      const item = items[index];
      validateHardshipRowLabel(localeId, textContent(item), index, `${localeId}/framework.md safety`, errors);
      if (textContent(item).trim().length < 60) {
        errors.push(`${localeId}/framework.md: ${domainId} needs a substantive visible safety contract`);
      }
      summary.safety.push(domainId);
    }
  }

  const evidenceNodes = sectionNodes(frameworkFile.tree, evidence[0].index);
  const links = [];
  for (const node of evidenceNodes) {
    walk(node, (child) => {
      if (child.type === 'link' && /^https?:\/\//u.test(child.url)) links.push(child);
    });
  }
  if (links.length < 4) {
    errors.push(`${localeId}/framework.md: evidence boundary must expose at least four external sources, found ${links.length}`);
  }
  const hosts = links.flatMap((link) => {
    try { return [new URL(link.url).hostname]; } catch { return []; }
  });
  for (const requiredHost of REQUIRED_HARDSHIP_SOURCE_HOSTS) {
    if (!hosts.some((host) => host === requiredHost || host.endsWith(`.${requiredHost}`))) {
      errors.push(`${localeId}/framework.md: evidence boundary is missing a visible source from ${requiredHost}`);
    }
  }
  summary.sources = hosts.sort((left, right) => left.localeCompare(right));
  return { errors, summary };
}

function auditRequirementVisibility(localeId, phaseSpec, domainId, rowText, context) {
  const errors = [];
  for (const expected of Object.values(phaseSpec.minimumAttributesByDomain?.[domainId] ?? {})) {
    if (!valueIsVisible(expected, rowText, localeId)) {
      errors.push(`${context}/${domainId}: configured minimum ${expected} is not visible in the semantic table row`);
    }
  }
  for (const requirement of phaseSpec.requirementsByDomain?.[domainId] ?? []) {
    for (const value of [requirement.duration?.minimum, requirement.duration?.maximum].filter((entry) => entry != null && entry > 1)) {
      if (!valueIsVisible(value, rowText, localeId)) {
        errors.push(`${context}/${domainId}: structured requirement ${requirement.id} must visibly state ${value}`);
      }
    }
    if (requirement.deadlineAge != null
        && !valueIsVisible(requirement.deadlineAge, rowText, localeId)
        && !valueIsVisible(requirement.deadlineAge + 1, rowText, localeId)) {
      errors.push(`${context}/${domainId}: milestone ${requirement.id} must visibly state its age boundary`);
    }
    if (requirement.communicationMode?.includes('emergency')
        && !/(?:emergency|emergencia)/iu.test(rowText)) {
      errors.push(`${context}/${domainId}: milestone ${requirement.id} must visibly preserve emergency communication`);
    }
    if (requirement.type === 'evidence'
        && !/(?:naturally occurring|real (?:situation|life)|do not stage|vida real|surgid[oa].*natural|no se fabrica)/iu.test(rowText)) {
      errors.push(`${context}/${domainId}: evidence requirement ${requirement.id} must visibly prohibit manufactured cases`);
    }
  }
  return errors;
}

function auditHardshipLocale(localeId, phaseFiles, model) {
  const errors = [];
  const summary = { domains: [], safety: [], sources: [], phases: new Map() };
  const frameworkFile = phaseFiles.find((file) => file.filename === 'framework.md');
  if (!frameworkFile) return { errors: [`${localeId}/framework.md: missing hardship framework`], summary };

  const frameworkAudit = auditHardshipFramework(localeId, frameworkFile, model);
  errors.push(...frameworkAudit.errors);
  summary.domains = frameworkAudit.summary.domains;
  summary.safety = frameworkAudit.summary.safety;
  summary.sources = frameworkAudit.summary.sources;

  for (const phaseSpec of model.phases ?? []) {
    const phaseFile = phaseFiles.find((file) => getFrontmatterScalar(getFrontmatter(file.source), 'phaseId') === phaseSpec.phaseId);
    if (!phaseFile) {
      errors.push(`${localeId}/${phaseSpec.phaseId}: missing phase file for hardship minimums`);
      continue;
    }
    const headings = findHeadings(phaseFile.tree, 3, HARDSHIP_HEADINGS[localeId].phase);
    if (headings.length !== 1) {
      errors.push(`${localeId}/${phaseFile.filename}: expected one semantic hardship phase section, found ${headings.length}`);
      continue;
    }
    const tables = sectionNodes(phaseFile.tree, headings[0].index).filter((node) => node.type === 'table');
    if (tables.length !== 1) {
      errors.push(`${localeId}/${phaseFile.filename}: hardship phase section must contain one semantic table, found ${tables.length}`);
      continue;
    }
    const rows = tableCells(tables[0]);
    if (rows.length !== model.domains.length + 1) {
      errors.push(`${localeId}/${phaseFile.filename}:${nodeLine(tables[0])}: hardship table must contain one header plus ${model.domains.length} rows, found ${rows.length}`);
    }
    const width = rows[0]?.length ?? 0;
    if (width < 2) errors.push(`${localeId}/${phaseFile.filename}: hardship table must expose domain and minimum columns`);
    const phaseSummary = [];
    for (const [index, domainId] of model.domains.entries()) {
      const row = rows[index + 1] ?? [];
      if (row.length !== width) errors.push(`${localeId}/${phaseFile.filename}/${domainId}: row has ${row.length} cells; expected ${width}`);
      validateHardshipRowLabel(localeId, row[0] ?? '', index, `${localeId}/${phaseFile.filename}`, errors);
      if ((row[0] ?? '').trim().length < 5 || row.slice(1).some((cell) => cell.trim().length < 30)) {
        errors.push(`${localeId}/${phaseFile.filename}/${domainId}: minimum row must contain a substantive visible explanation`);
      }
      errors.push(...auditRequirementVisibility(localeId, phaseSpec, domainId, row.join(' '), `${localeId}/${phaseFile.filename}`));
      phaseSummary.push([domainId, phaseSpec.stage, phaseSpec.cadenceByDomain?.[domainId] ?? '']);
    }
    summary.phases.set(phaseSpec.phaseId, phaseSummary);
  }
  return { errors, summary };
}

function auditHardshipLocaleParity(englishSummary, spanishSummary) {
  const errors = [];
  const compare = (label, englishValue, spanishValue) => {
    if (JSON.stringify(englishValue) !== JSON.stringify(spanishValue)) {
      errors.push(`hardship locale parity: ${label} differs between EN and ES`);
    }
  };
  compare('domain registry', englishSummary.domains, spanishSummary.domains);
  compare('safety contracts', englishSummary.safety, spanishSummary.safety);
  for (const phaseId of EXPECTED_HARDSHIP_PHASE_IDS) {
    compare(`${phaseId} minimums`, englishSummary.phases.get(phaseId) ?? [], spanishSummary.phases.get(phaseId) ?? []);
  }
  return errors;
}
function auditUnsafeMandatoryWording(files) {
  const errors = [];
  const rules = [
    {
      label: 'collapse treated as the objective',
      pattern: /\b(?:collapse|fainting|loss\s+of\s+consciousness)\s+(?:is|becomes|remains)\s+(?:the\s+)?(?:goal|target|proof)\b/giu,
    },
    {
      label: 'collapse treated as the objective',
      pattern: /\b(?:colapso|desmayo|p[eé]rdida\s+de\s+consciencia)\s+(?:es|se\s+convierte\s+en|sigue\s+siendo)\s+(?:el\s+)?(?:objetivo|meta|prueba)\b/giu,
    },
    {
      label: 'required continuation through a medical stop signal',
      pattern: /\b(?:must|should|required\s+to)\s+(?:continue|push|keep\s+going)\b.{0,80}\b(?:through|despite)\b.{0,80}\b(?:injury|chest\s+pain|breathing\s+difficulty|disorientation|heat\s+illness|cold\s+illness|collapse)\b/gisu,
    },
    {
      label: 'required continuation through a medical stop signal',
      pattern: /\b(?:debe|deber[ií]a|se\s+exige)\s+(?:continuar|seguir|forzar)\b.{0,80}\b(?:con|pese\s+a|a\s+pesar\s+de)\b.{0,80}\b(?:lesi[oó]n|dolor\s+tor[aá]cico|dificultad\s+respiratoria|desorientaci[oó]n|golpe\s+de\s+calor|hipotermia|colapso)\b/gisu,
    },
    {
      label: 'essential needs prescribed as deprivation',
      pattern: /\b(?:must|should|required\s+to)\s+(?:go\s+without|be\s+denied)\s+(?:food|water|medication|necessary\s+warmth)\b/gisu,
    },
    {
      label: 'essential needs prescribed as deprivation',
      pattern: /\b(?:debe|deber[ií]a|se\s+exige)\s+(?:pasar\s+sin|ser\s+privad[oa]\s+de)\s+(?:comida|agua|medicaci[oó]n|abrigo\s+necesario)\b/gisu,
    },
    {
      label: 'removal of emergency access',
      pattern: /\b(?:must|should|required\s+to)\s+(?:lose|surrender|remove)\s+(?:all\s+)?(?:emergency\s+access|emergency\s+communication|access\s+to\s+help)\b/gisu,
    },
    {
      label: 'removal of emergency access',
      pattern: /\b(?:debe|deber[ií]a|se\s+exige)\s+(?:perder|entregar|eliminar)\s+(?:todo\s+)?(?:acceso\s+de\s+emergencia|comunicaci[oó]n\s+de\s+emergencia|acceso\s+a\s+ayuda)\b/gisu,
    },
    {
      label: 'service framed as exposure to genuine suffering',
      pattern: /\bservice\s+in\s+(?:contexts?\s+of\s+)?genuine\s+suffering\b/giu,
    },
    {
      label: 'service framed as exposure to genuine suffering',
      pattern: /\bservicio\s+en\s+(?:contextos?\s+de\s+)?sufrimiento\s+genuino\b/giu,
    },
    {
      label: 'required solo overnight without emergency contact',
      pattern: /\b(?:mandatory|required)\s+solo\s+overnight\b.{0,140}\bwithout\s+(?:an?\s+)?emergency\s+contact\b|\bsolo\s+overnight\b.{0,140}\bwithout\s+(?:an?\s+)?emergency\s+contact\b/gisu,
    },
    {
      label: 'required solo overnight without emergency contact',
      pattern: /\b(?:obligatoria|requerida)\s+noche\s+en\s+solitario\b.{0,140}\bsin\s+contacto\s+de\s+emergencia\b|\bnoche\s+en\s+solitario\b.{0,140}\bsin\s+contacto\s+de\s+emergencia\b/gisu,
    },
  ];

  for (const file of files) {
    for (const { pattern, label } of rules) {
      pattern.lastIndex = 0;
      const match = pattern.exec(file.source);
      if (match) {
        errors.push(`${file.filename}:${lineNumberAt(file.source, match.index)}: prohibited unsafe prescription (${label})`);
      }
    }
  }

  return errors;
}

function auditUnsafeHardshipWordingControls() {
  const errors = [];
  const allowed = [{
    filename: 'allowed-hardship.md',
    source: 'A mandatory physical exhaustion challenge targets genuine, temporary, recoverable exhaustion after progressive preparation.',
  }];
  const allowedErrors = auditUnsafeMandatoryWording(allowed);
  if (allowedErrors.length > 0) {
    errors.push(`unsafe-hardship wording controls: legitimate recoverable exhaustion was rejected (${allowedErrors[0]})`);
  }

  const prohibited = [
    'Collapse is the target.',
    'The learner must continue through chest pain.',
    'The learner must go without water.',
    'The learner must remove emergency communication.',
    'A required solo overnight must occur without emergency contact.',
    'El colapso es el objetivo.',
    'La persona debe continuar pese a una lesión.',
  ];
  for (const [index, source] of prohibited.entries()) {
    const fixtureErrors = auditUnsafeMandatoryWording([{
      filename: `unsafe-hardship-${index + 1}.md`,
      source,
    }]);
    if (fixtureErrors.length === 0) {
      errors.push(`unsafe-hardship wording controls: unsafe fixture was not rejected ('${source}')`);
    }
  }
  return errors;
}

function auditFalseCertaintyWording(files) {
  const errors = [];
  const scopedFiles = new Set([
    'src/components/Home.astro',
    'src/content/phases/framework.md',
    'src/content/phases-es/framework.md',
    'src/content/phases/age-0-1.md',
    'src/content/phases-es/age-0-1.md',
    'src/content/phases/age-11-13.md',
    'src/content/phases-es/age-11-13.md',
    'src/content/phases/age-14-16.md',
    'src/content/phases-es/age-14-16.md',
    'src/content/phases/age-17-18.md',
    'src/content/phases-es/age-17-18.md',
  ]);
  const rules = [
    { pattern: /\bevidence-based methods\b/giu, label: 'blanket evidence-based product claim' },
    { pattern: /\bm[eé]todos basados en (?:la )?evidencia\b/giu, label: 'blanket evidence-based product claim' },
    { pattern: /\bvalidated against\b/giu, label: 'conceptual cross-walk described as validation' },
    { pattern: /\bvalidad[oa]s? contra\b/giu, label: 'conceptual cross-walk described as validation' },
    { pattern: /\brobustly validated cognitive mechanisms\b/giu, label: 'component evidence described as package validation' },
    { pattern: /\bmecanismos cognitivos robustamente validados\b/giu, label: 'component evidence described as package validation' },
    { pattern: /\bquality of relationships at 50 is the single best predictor\b/giu, label: 'observational Grant Study superlative' },
    { pattern: /\bquality of relationships at midlife was the single strongest predictor\b/giu, label: 'observational Grant Study superlative' },
    { pattern: /\bla calidad de las relaciones a los 50 es el mejor predictor individual\b/giu, label: 'observational Grant Study superlative' },
    { pattern: /\bla calidad de las relaciones en la mediana edad fue el predictor m[aá]s fuerte\b/giu, label: 'observational Grant Study superlative' },
    { pattern: /\bmost robustly validated wellbeing interventions?\b/giu, label: 'gratitude evidence superlative' },
    { pattern: /\bmost robust positive psychology interventions?\b/giu, label: 'gratitude evidence superlative' },
    { pattern: /\bintervenciones? de bienestar m[aá]s robustamente validad[oa]s?\b/giu, label: 'gratitude evidence superlative' },
    { pattern: /\bintervenciones? de psicolog[ií]a positiva m[aá]s robust[oa]s?\b/giu, label: 'gratitude evidence superlative' },
    { pattern: /\bmaterial competence produces social independence\b/giu, label: 'material-literacy causal certainty' },
    { pattern: /\bla competencia material produce independencia social\b/giu, label: 'material-literacy causal certainty' },
    { pattern: /\b(?:are|est[aá]n) causally linked\b/giu, label: 'material-literacy causal certainty' },
    { pattern: /\b(?:est[aá]n) causalmente vinculad[oa]s\b/giu, label: 'material-literacy causal certainty' },
    { pattern: /\bthe prefrontal cortex is offline\b/giu, label: 'binary infant neurodevelopment claim' },
    { pattern: /\b(?:el )?c[oó]rtex prefrontal est[aá] desconectado\b/giu, label: 'binary infant neurodevelopment claim' },
    { pattern: /\bthe research is unambiguous\b/giu, label: 'unqualified research-certainty claim' },
    { pattern: /\bla investigaci[oó]n es inequ[ií]voca\b/giu, label: 'unqualified research-certainty claim' },
    { pattern: /\bsingle strongest predictor of language trajectory\b/giu, label: 'language-development predictor superlative' },
    { pattern: /\bpredictor m[aá]s fuerte de la trayectoria ling[uü][ií]stica\b/giu, label: 'language-development predictor superlative' },
    { pattern: /\bprerequisite for all subsequent social development\b/giu, label: 'attachment prerequisite overclaim' },
    { pattern: /\bprerrequisito .{0,40}para todo el desarrollo social posterior\b/gisu, label: 'attachment prerequisite overclaim' },
    { pattern: /\bresearch on adolescent social media use and mental health is unambiguous\b/giu, label: 'social-media evidence certainty overclaim' },
    { pattern: /\binvestigaci[oó]n sobre .{0,80}redes sociales.{0,80}salud mental es inequ[ií]voca\b/gisu, label: 'social-media evidence certainty overclaim' },
    { pattern: /\brequires a proven toolkit\b/giu, label: 'individual regulation toolkit described as proven' },
    { pattern: /\brequiere un arsenal probado\b/giu, label: 'individual regulation toolkit described as proven' },
    { pattern: /\bthe causal chain is complete\b/giu, label: 'completed causal-chain overclaim' },
    { pattern: /\bla cadena causal est[aá] completa\b/giu, label: 'completed causal-chain overclaim' },
    { pattern: /\binexhaustible fuel source\b/giu, label: 'inexhaustible outcome promise' },
    { pattern: /\bfuente de combustible inagotable\b/giu, label: 'inexhaustible outcome promise' },
    { pattern: /\bdevelopmental windows?.{0,80}\bnon-recoverable\b/gisu, label: 'developmental sensitive period described as non-recoverable' },
    { pattern: /\bventanas? de desarrollo.{0,80}\birrecuperables?\b/gisu, label: 'developmental sensitive period described as non-recoverable' },
    { pattern: /\bsecure attachment.{0,80}\bshapes all subsequent emotional regulation\b/gisu, label: 'attachment described as determining all later regulation' },
    { pattern: /\bel apego seguro.{0,80}\bmoldea toda la regulaci[oó]n emocional posterior\b/gisu, label: 'attachment described as determining all later regulation' },
    { pattern: /\bthe evidence is unambiguous\b/giu, label: 'unqualified evidence-certainty claim' },
    { pattern: /\bla evidencia es inequ[ií]voca\b/giu, label: 'unqualified evidence-certainty claim' },
  ];

  for (const file of files) {
    if (!scopedFiles.has(file.filename)) continue;
    for (const { pattern, label } of rules) {
      pattern.lastIndex = 0;
      const match = pattern.exec(file.source);
      if (match) {
        errors.push(`${file.filename}:${lineNumberAt(file.source, match.index)}: prohibited false-certainty wording (${label})`);
      }
    }
  }

  return errors;
}

async function readPublicSourceFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  const publicExtensions = new Set(['.astro', '.js', '.json', '.md', '.ts']);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await readPublicSourceFiles(fullPath));
    } else if (entry.isFile() && publicExtensions.has(path.extname(entry.name))) {
      files.push({
        filename: path.relative(repoRoot, fullPath),
        source: await readFile(fullPath, 'utf8'),
      });
    }
  }

  return files;
}

function printSection(title) {
  console.log(`\n${title}`);
}

async function loadLocale(locale) {
  const [phases, universes, models, targets] = await Promise.all([
    readMarkdownFiles(locale.phases),
    readMarkdownFiles(locale.universes),
    readMarkdownFiles(locale.models),
    readMarkdownFiles(locale.targets),
  ]);
  return { ...locale, phases, universes, models, targets };
}

async function main() {
  const [english, spanish, capacityModel, hardshipModel] = await Promise.all([
    ...LOCALES.map(loadLocale),
    readFile(capacityModelPath, 'utf8').then((source) => JSON.parse(source)),
    readFile(hardshipModelPath, 'utf8').then((source) => JSON.parse(source)),
  ]);
  const allErrors = [
    ...auditUniverseReferenceNormalizer(),
    ...auditHardshipModelConfig(hardshipModel),
    ...auditUnsafeHardshipWordingControls(),
  ];

  const localeResults = [];
  for (const locale of [english, spanish]) {
    const universeAudit = auditUniverses(locale.id, locale.universes);
    const targetMapAudit = auditTargetMaps(locale.id, locale.phases);
    const referenceAudit = auditUniverseReferences(locale.id, locale.phases, universeAudit.universeIds);
    const capacityExecutionAudit = auditCapacityExecution(
      locale.id,
      locale.phases.find((file) => file.filename === 'framework.md'),
      capacityModel
    );
    const phaseCapacityAudit = auditPhaseCapacityMenus(locale.id, locale.phases, capacityModel);
    const hardshipAudit = auditHardshipLocale(locale.id, locale.phases, hardshipModel);
    localeResults.push({
      locale,
      universeAudit,
      targetMapAudit,
      referenceAudit,
      capacityExecutionAudit,
      phaseCapacityAudit,
      hardshipAudit,
    });

    allErrors.push(
      ...universeAudit.errors,
      ...targetMapAudit.errors,
      ...auditPhaseAgeLabels(locale.id, locale.phases),
      ...referenceAudit.errors,
      ...capacityExecutionAudit.errors,
      ...phaseCapacityAudit.errors,
      ...hardshipAudit.errors
    );

    for (const collectionName of ['phases', 'universes', 'models', 'targets']) {
      for (const file of locale[collectionName]) {
        if (file.parseError) {
          allErrors.push(`${locale.id}/${collectionName}/${file.filename}: Markdown parse failed: ${file.parseError.message}`);
        }
      }
    }

    const counts = {
      phases: locale.phases.length,
      universes: locale.universes.length,
      models: locale.models.length,
      targets: locale.targets.length,
    };
    for (const [collectionName, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
      if (counts[collectionName] !== expectedCount) {
        allErrors.push(`${locale.id}/${collectionName}: expected ${expectedCount} entries, found ${counts[collectionName]}`);
      }
    }

    printSection(`${locale.id.toUpperCase()} content`);
    console.log(`Phases: ${counts.phases}/${EXPECTED_COUNTS.phases}`);
    console.log(`Universes: ${counts.universes}/${EXPECTED_COUNTS.universes}`);
    console.log(`Models: ${counts.models}/${EXPECTED_COUNTS.models}`);
    console.log(`Targets: ${counts.targets}/${EXPECTED_COUNTS.targets}`);
    console.log(`Resolved universe references: ${referenceAudit.referenceCount}`);
    console.log(`Recognizable universe mentions audited: ${referenceAudit.recognizableMentionCount}`);
    console.log(`Capacity execution table: ${capacityExecutionAudit.phaseCount}/${capacityModel.phases.length} phases`);
    console.log(`Phase capacity menus: ${phaseCapacityAudit.summary.size}/2`);
    console.log(`Hardship architecture: ${hardshipAudit.summary.domains.length}/${hardshipModel.domains.length} domains; ${hardshipAudit.summary.phases.size}/${hardshipModel.phases.length} phase tables; ${hardshipAudit.summary.sources.length} visible sources`);
    console.log('Universe metadata coverage:');
    for (const [field, count] of Object.entries(universeAudit.coverage)) {
      console.log(`- ${field}: ${count}/${universeAudit.total}`);
    }
    if (universeAudit.thinUniverses.length > 0) {
      for (const entry of universeAudit.thinUniverses) {
        allErrors.push(`${locale.id}/${entry.filename}: missing ${entry.missingFields.join(', ')}`);
      }
    }
  }

  const parityErrors = [
    ...auditFilenameParity('phases', english.phases, spanish.phases),
    ...auditFilenameParity('universes', english.universes, spanish.universes),
    ...auditFilenameParity('models', english.models, spanish.models),
    ...auditFilenameParity('targets', english.targets, spanish.targets),
    ...auditUniverseLocaleStructure(english.universes, spanish.universes),
    ...auditTargetMapLocaleParity(localeResults[0].targetMapAudit.phaseSummary, localeResults[1].targetMapAudit.phaseSummary),
    ...auditHardshipLocaleParity(localeResults[0].hardshipAudit.summary, localeResults[1].hardshipAudit.summary),
    ...auditBilingualResourceLinkParity(
      localeResults[0].referenceAudit,
      localeResults[1].referenceAudit
    ),
  ];
  if (JSON.stringify(localeResults[0].capacityExecutionAudit.matrix) !== JSON.stringify(localeResults[1].capacityExecutionAudit.matrix)) {
    parityErrors.push('capacity locale parity: master capacity matrices differ between EN and ES');
  }
  if (JSON.stringify([...localeResults[0].phaseCapacityAudit.summary]) !== JSON.stringify([...localeResults[1].phaseCapacityAudit.summary])) {
    parityErrors.push('capacity locale parity: age-14-16/age-17-18 capacity menus differ between EN and ES');
  }
  allErrors.push(...parityErrors);

  const publicSourceFiles = await readPublicSourceFiles(path.join(repoRoot, 'src'));
  allErrors.push(...auditPublicProfilePrivacy(publicSourceFiles));
  allErrors.push(...auditProfileControlAccessibility(publicSourceFiles));
  allErrors.push(...auditDynamicUiParity(publicSourceFiles));
  allErrors.push(...auditResourceMergeSemantics());
  allErrors.push(...auditFalseCertaintyWording(publicSourceFiles));
  allErrors.push(...auditUnsafeMandatoryWording([
    ...english.phases.map((file) => ({ ...file, filename: `src/content/phases/${file.filename}` })),
    ...spanish.phases.map((file) => ({ ...file, filename: `src/content/phases-es/${file.filename}` })),
  ]));

  printSection('Integrity result');
  if (allErrors.length === 0) {
    console.log('PASS: counts, content graph, target maps, universe references, EN/ES capacity and hardship integrity, locale structure, public-source privacy, psychometric claims, claim-certainty guards, and safety wording are valid.');
    return;
  }

  for (const error of allErrors) console.error(`- ${error}`);
  console.error(`FAIL: ${allErrors.length} integrity error(s).`);
  process.exitCode = 1;
}

await main();
