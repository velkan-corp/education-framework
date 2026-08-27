import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distRoot = path.join(repoRoot, 'dist');

function countOccurrences(source, value) {
  return source.split(value).length - 1;
}

function assertExactCount(errors, filename, source, marker, expected, label) {
  const actual = countOccurrences(source, marker);
  if (actual !== expected) {
    errors.push(`${filename}: expected ${expected} rendered ${label}, found ${actual}`);
  }
}

function assertPatternCount(errors, filename, source, pattern, expected, label) {
  const actual = [...source.matchAll(pattern)].length;
  if (actual !== expected) {
    errors.push(`${filename}: expected ${expected} rendered ${label}, found ${actual}`);
  }
}

async function readTextFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  const textExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml']);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await readTextFiles(fullPath));
    } else if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      files.push({
        filename: path.relative(distRoot, fullPath),
        source: await readFile(fullPath, 'utf8'),
      });
    }
  }

  return files;
}

async function main() {
  const errors = [];
  const [english, spanish, publicFiles] = await Promise.all([
    readFile(path.join(distRoot, 'index.html'), 'utf8'),
    readFile(path.join(distRoot, 'es/index.html'), 'utf8'),
    readTextFiles(distRoot),
  ]);

  for (const [filename, source] of [['index.html', english], ['es/index.html', spanish]]) {
    assertExactCount(errors, filename, source, 'data-universe-detail=', 219, 'universe details');
    assertExactCount(errors, filename, source, 'data-section="target"', 11, 'target cards');
    assertExactCount(errors, filename, source, 'data-section="mental-model"', 38, 'mental-model cards');
    assertExactCount(errors, filename, source, 'class="phase-content"', 8, 'phase documents');
    assertExactCount(errors, filename, source, 'data-target-map', 8, 'explicit phase target maps');
    assertPatternCount(
      errors,
      filename,
      source,
      /<h2\b[^>]*\bclass="[^"]*\bphase-section-heading\b[^"]*"/gu,
      107,
      'registered phase section headings'
    );
    assertPatternCount(
      errors,
      filename,
      source,
      /<h2\b[^>]*\bclass="[^"]*\bfw-section-header\b[^"]*"/gu,
      3,
      'framework hierarchy headings'
    );
    assertExactCount(errors, filename, source, 'class="target-card"', 88, 'phase target cards');
    assertExactCount(errors, filename, source, 'class="target-card-title"', 88, 'phase target titles');
    assertExactCount(errors, filename, source, 'data-profile=', 475, 'profile adjustments');
    assertExactCount(errors, filename, source, 'data-callout="evidence"', 19, 'evidence callouts');
    assertExactCount(errors, filename, source, 'data-callout="principle-thesis"', 10, 'principle theses');
    assertExactCount(errors, filename, source, 'data-callout="repair-script"', 3, 'repair-script callouts');
    assertPatternCount(
      errors,
      filename,
      source,
      /<table\b[^>]*\bclass="[^"]*\bpraise-antipattern\b[^"]*"/gu,
      2,
      'praise anti-pattern tables'
    );
    assertPatternCount(
      errors,
      filename,
      source,
      /<h2\b[^>]*\bclass="phase-section-heading"[^>]*\bdata-tier="(?:foundational|core|recommended)"/gu,
      59,
      'tiered phase section headings'
    );
    if (/<blockquote class="t-adjust"(?:\s|>)/gu.test(source)) {
      errors.push(`${filename}: at least one profile adjustment lacks a resolved profile class`);
    }
    for (const id of ['mobile-search-overlay', 'mobile-search-bar', 'mobile-search-input', 'mobile-search-close', 'mobile-search-results']) {
      assertExactCount(errors, filename, source, `id="${id}"`, 1, `#${id} element`);
    }
  }

  const requiredSpanishLabels = [
    'Contenido y Universos',
    'Autoeficacia Resiliente',
    'Causa y Efecto',
    'Absorber',
    'Universo Ficticio',
    'Inglés',
    'Intensidad Media',
    'Valor Social de Nicho',
    'no un test, cribado ni diagnóstico',
    'BRIEF-P, 2–5 años de edad',
    'Restablecer todas las dimensiones a valores base',
    'Energía',
    'Resolución de problemas',
    'Motricidad gruesa',
    'Control emocional',
    'Memoria de trabajo',
    'Planificación/organización',
    'Las transiciones resultan difíciles',
    'Vocabulario de dominio inspirado en ASQ-3',
    'no infieras un resultado estandarizado a ninguna edad',
    'aria-label="Navegación principal"',
    'aria-label="Ir a inicio"',
    'aria-label="Cambiar idioma"',
    'aria-label="Buscar"',
    'aria-label="Menú"',
    'placeholder="Buscar…"',
    'aria-label="Cerrar búsqueda"',
  ];
  for (const label of requiredSpanishLabels) {
    if (!spanish.includes(label)) errors.push(`es/index.html: missing required Spanish UI text '${label}'`);
  }
  if (!publicFiles.some((file) => file.source.includes('Secciones'))) {
    errors.push('public JavaScript: missing localized Spanish sections heading');
  }

  for (const label of [
    'not a test, screen, or diagnosis',
    'BRIEF-P, 2–5 yr olds',
    'aria-label="Reset all dimensions to balanced"',
    'Transitions are hard',
    'Domain vocabulary inspired by ASQ-3',
    'Research inspiration: planning/organization concepts',
    'placeholder="Search…"',
    'aria-label="Close search"',
  ]) {
    if (!english.includes(label)) errors.push(`index.html: missing profile-integrity notice '${label}'`);
  }

  const forbiddenProfilePatterns = [
    { pattern: /\bNico\b/gu, label: 'identifiable profile name Nico' },
    { pattern: /\bMaia\b/gu, label: 'identifiable profile name Maia' },
    { pattern: /childProfiles/gu, label: 'bundled named-profile registry' },
    { pattern: /\{isEs\b/gu, label: 'unrendered Astro localization expression' },
  ];
  for (const file of publicFiles) {
    for (const { pattern, label } of forbiddenProfilePatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(file.source)) errors.push(`${file.filename}: public artifact contains ${label}`);
    }
  }

  const publicJavaScript = publicFiles
    .filter((file) => file.filename.endsWith('.js'))
    .map((file) => file.source)
    .join('\n');
  for (const label of [
    'Hilos Curriculares',
    'Todos los Dominios',
    'No hay recursos que coincidan con los filtros actuales.',
    'Parte de un universo más amplio',
    'yr old',
    'años de edad',
  ]) {
    if (!publicJavaScript.includes(label)) errors.push(`public JavaScript: missing dynamic localization text '${label}'`);
  }
  for (const parserFragment of ['foundational|fundacional|fundamental', 'core|central', 'recommended|recomendad']) {
    if (!publicJavaScript.includes(parserFragment)) errors.push(`public JavaScript: missing resource-tier parser fragment '${parserFragment}'`);
  }

  const dynamicMaterialIcons = publicJavaScript.match(/<span\b[^>]*\bclass=(['"])[^'"]*\bmaterial-symbols-rounded\b[^'"]*\1[^>]*>/gu) ?? [];
  if (dynamicMaterialIcons.length === 0) {
    errors.push('public JavaScript: expected dynamically generated material icons');
  }
  for (const tag of dynamicMaterialIcons) {
    if (!/\baria-hidden=(['"])true\1/u.test(tag)) {
      errors.push(`public JavaScript: generated material icon lacks aria-hidden (${tag})`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    console.error(`FAIL: ${errors.length} public-build integrity error(s).`);
    process.exitCode = 1;
    return;
  }

  console.log('PASS: rendered EN/ES collection counts, dynamic localization, accessibility, unique mobile search, and public-build profile privacy are valid.');
}

await main();
