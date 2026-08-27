const UI_COPY = {
  en: {
    all: 'All',
    tier: 'Tier',
    type: 'Type',
    target: 'Target',
    foundational: 'Foundational',
    core: 'Core',
    recommended: 'Recommended',
    books: 'Books',
    book: 'Books',
    film: 'Film',
    games: 'Games',
    game: 'Games',
    equipment: 'Equipment',
    services: 'Services',
    service: 'Services',
    apps: 'Apps',
    app: 'Apps',
    toys: 'Toys',
    toy: 'Toys',
    media: 'Media',
    curriculumThreads: 'Curriculum Threads',
    curriculumThreadsDescription: 'Each thread runs across all ages. Filter by priority tier.',
    domains: 'Domains',
    domainsDescription: 'Curriculum threads — each tracked across all age phases.',
    allDomains: 'All Domains',
    domainDetailDescription: 'Tracking this domain across all age brackets — from earliest foundations to 17–18 yr old synthesis.',
    model: 'Model',
    layer5Name: 'Layer 5: Critique',
    layer5Fallback: 'Layer 5: Critique — all 19 models are reviewed, stress-tested, and critiqued. The goal: automatic deployment of 12–15 models in conversation and analysis. “All models are wrong; some are useful” — internalized as habit, not slogan.',
    noModelContent: 'No teaching content found for this model across age phases.',
    seed: 'Seed',
    full: 'Full',
    noResources: 'No resources match the current filters.',
    resource: 'Resource',
    ages: 'Ages',
    targets: 'Targets',
    partOfUniverse: 'Part of a larger universe',
    recommendedAt: 'Recommended at',
    allAges: 'All Ages',
    allTargets: 'All Targets',
  },
  es: {
    all: 'Todos',
    tier: 'Nivel',
    type: 'Tipo',
    target: 'Objetivo',
    foundational: 'Fundacional',
    core: 'Central',
    recommended: 'Recomendado',
    books: 'Libros',
    book: 'Libros',
    film: 'Películas',
    games: 'Juegos',
    game: 'Juegos',
    equipment: 'Equipamiento',
    services: 'Servicios',
    service: 'Servicios',
    apps: 'Aplicaciones',
    app: 'Aplicaciones',
    toys: 'Juguetes',
    toy: 'Juguetes',
    media: 'Medios',
    curriculumThreads: 'Hilos Curriculares',
    curriculumThreadsDescription: 'Cada hilo recorre todas las edades. Filtra por nivel de prioridad.',
    domains: 'Dominios',
    domainsDescription: 'Hilos curriculares, cada uno seguido a través de todas las fases de edad.',
    allDomains: 'Todos los Dominios',
    domainDetailDescription: 'Seguimiento de este dominio a través de todas las edades, desde los fundamentos iniciales hasta la síntesis de los 17–18 años de edad.',
    model: 'Modelo',
    layer5Name: 'Capa 5: Criticar',
    layer5Fallback: 'Capa 5: Criticar — los 19 modelos se revisan, se someten a pruebas de estrés y se critican. El objetivo es desplegar automáticamente 12–15 modelos en la conversación y el análisis. «Todos los modelos son erróneos; algunos son útiles» queda interiorizado como hábito, no como eslogan.',
    noModelContent: 'No se encontró contenido didáctico para este modelo a través de las fases de edad.',
    seed: 'Semilla',
    full: 'Completo',
    noResources: 'No hay recursos que coincidan con los filtros actuales.',
    resource: 'Recurso',
    ages: 'Edades',
    targets: 'Objetivos',
    partOfUniverse: 'Parte de un universo más amplio',
    recommendedAt: 'Recomendado en',
    allAges: 'Todas las Edades',
    allTargets: 'Todos los Objetivos',
  },
};

export function getUiLanguage() {
  return typeof document !== 'undefined' && document.documentElement.lang === 'es' ? 'es' : 'en';
}

export function uiText(key, language = getUiLanguage()) {
  return UI_COPY[language]?.[key] ?? UI_COPY.en[key] ?? key;
}

export function tierLabel(tier, language = getUiLanguage()) {
  return uiText(tier, language);
}

export function tierCountLabel(tier, count, language = getUiLanguage()) {
  if (language !== 'es') return `${count} ${tierLabel(tier, language).toLowerCase()}`;
  const forms = {
    foundational: count === 1 ? 'fundacional' : 'fundacionales',
    core: count === 1 ? 'central' : 'centrales',
    recommended: count === 1 ? 'recomendado' : 'recomendados',
  };
  return `${count} ${forms[tier] ?? tier}`;
}

export function phaseCountLabel(count, language = getUiLanguage()) {
  if (language === 'es') return `${count} ${count === 1 ? 'fase' : 'fases'}`;
  return `${count} ${count === 1 ? 'phase' : 'phases'}`;
}

export function categoryLabel(category, language = getUiLanguage()) {
  return uiText(category, language);
}

export function formatAgeLabel(rawLabel, language = getUiLanguage()) {
  const label = String(rawLabel ?? '').trim();
  if (!/^\d{1,2}\s*[–—-]\s*\d{1,2}$/u.test(label)) return label;
  return language === 'es' ? `${label} años de edad` : `${label} yr old`;
}

export function normalizeResourceTier(rawLabel) {
  const label = String(rawLabel ?? '').toLocaleLowerCase('es');
  if (/\b(?:foundational|fundacional|fundamental)\b/u.test(label)) return 'foundational';
  // Check core/central before recommended: both English and Spanish core-tier
  // separator descriptions commonly contain “recommended/recomendado”.
  if (/\b(?:core|central)\b/u.test(label)) return 'core';
  if (/\b(?:recommended|recomendad[oa]s?)\b/u.test(label)) return 'recommended';
  return '';
}
