import { state } from './state.js';
import { updateAllNavs } from './navigation.js';

let currentTabTag = 'all';
// Single-select filters (primary)
let currentAge = 'all';
let currentTier = 'all';
// Multi-select filters (advanced) — empty Set means "all"
let selectedLanguages = new Set();
let selectedKinds = new Set();
let selectedTargets = new Set();
let selectedModels = new Set();
let selectedModes = new Set();

function splitCsv(value) {
  if (!value) return [];
  return value.split(',').filter(Boolean);
}

function bindSingleSelectFilter(containerId, datasetKey, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.filter-pill').forEach((other) => other.classList.remove('active'));
      pill.classList.add('active');
      onChange(pill.dataset[datasetKey] ?? 'all');
      applyFilters();
    });
  });
}

function bindMultiSelectFilter(containerId, datasetKey, selectionSet) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const allPill = container.querySelector(`.filter-pill[data-${datasetKey}="all"]`);
  const valuePills = container.querySelectorAll(`.filter-pill:not([data-${datasetKey}="all"])`);

  function syncAllPill() {
    if (allPill) allPill.classList.toggle('active', selectionSet.size === 0);
  }

  if (allPill) {
    allPill.addEventListener('click', () => {
      selectionSet.clear();
      valuePills.forEach((p) => p.classList.remove('active'));
      syncAllPill();
      applyFilters();
    });
  }

  valuePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const val = pill.dataset[datasetKey];
      if (selectionSet.has(val)) {
        selectionSet.delete(val);
        pill.classList.remove('active');
      } else {
        selectionSet.add(val);
        pill.classList.add('active');
      }
      syncAllPill();
      applyFilters();
    });
  });
}

function setMatchesMulti(cardValues, selectionSet) {
  if (selectionSet.size === 0) return true;
  return cardValues.some((v) => selectionSet.has(v));
}

export function initUniverseView() {
  const grid = document.getElementById('universe-grid');
  const detail = document.getElementById('universe-detail');
  const backBtn = document.getElementById('universe-back');
  const universeTabs = document.getElementById('universe-tabs');
  if (!grid || !detail || !universeTabs) return;

  // Tab clicks — filter by medium/type
  universeTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    const tabId = tab.dataset.universeTab;
    if (!tabId) return;

    universeTabs.querySelectorAll('.tab').forEach(t => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });

    if (tabId === 'framework') {
      showFrameworkInUniverse();
    } else {
      currentTabTag = tabId;
      showUniverseGrid();
      applyFilters();
    }
  });

  // Primary filters — single-select
  bindSingleSelectFilter('age-filters', 'age', (value) => {
    currentAge = value;
  });
  bindSingleSelectFilter('tier-filters', 'tier', (value) => {
    currentTier = value;
  });

  // Advanced filters — multi-select (OR within, AND across)
  bindMultiSelectFilter('language-filters', 'language', selectedLanguages);
  bindMultiSelectFilter('kind-filters', 'kind', selectedKinds);
  bindMultiSelectFilter('target-filters', 'target', selectedTargets);
  bindMultiSelectFilter('model-filters', 'model', selectedModels);
  bindMultiSelectFilter('mode-filters', 'mode', selectedModes);

  // Collapsible advanced filters
  const toggle = document.getElementById('advanced-filters-toggle');
  const body = document.getElementById('advanced-filters-body');
  if (toggle && body) {
    toggle.addEventListener('click', () => {
      const isCollapsed = body.classList.toggle('collapsed');
      toggle.classList.toggle('collapsed', isCollapsed);
      toggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
  }

  // Card clicks → show detail
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.universe-card');
    if (!card) return;
    showUniverseDetail(card.dataset.universe);
  });

  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showUniverseGrid();
      applyFilters();
    });
  }
}

function applyFilters() {
  document.querySelectorAll('.universe-card').forEach(card => {
    const tags = splitCsv(card.dataset.tags);
    const phases = splitCsv(card.dataset.phases);
    const languages = splitCsv(card.dataset.languages);
    const targets = splitCsv(card.dataset.targets);
    const models = splitCsv(card.dataset.models);
    const modes = splitCsv(card.dataset.modes);
    const tiers = splitCsv(card.dataset.tiers);
    const phaseModes = splitCsv(card.dataset.phaseModes);
    const phaseTiers = splitCsv(card.dataset.phaseTiers);

    const matchesTab = currentTabTag === 'all' || tags.includes(currentTabTag);
    const matchesAge = currentAge === 'all' || phases.includes(currentAge);
    const matchesTier = currentTier === 'all'
      || (currentAge === 'all'
        ? tiers.includes(currentTier)
        : phaseTiers.includes(`${currentAge}:${currentTier}`));
    const matchesLanguage = setMatchesMulti(languages, selectedLanguages);
    const matchesKind = selectedKinds.size === 0 || selectedKinds.has(card.dataset.kind);
    const matchesTarget = setMatchesMulti(targets, selectedTargets);
    const matchesModel = setMatchesMulti(models, selectedModels);
    const matchesMode = selectedModes.size === 0
      || (currentAge === 'all'
        ? modes.some((m) => selectedModes.has(m))
        : phaseModes.some((pm) => {
            const mode = pm.split(':')[1];
            return selectedModes.has(mode);
          }));

    card.classList.toggle('hidden', !(
      matchesTab
      && matchesAge
      && matchesTier
      && matchesLanguage
      && matchesKind
      && matchesTarget
      && matchesModel
      && matchesMode
    ));
  });
}

function hideControls() {
  const legend = document.querySelector('.universe-legend');
  if (legend) legend.classList.add('hidden');
  document.querySelectorAll('.universe-filters').forEach((filterRow) => filterRow.classList.add('hidden'));
}

function showControls() {
  const legend = document.querySelector('.universe-legend');
  if (legend) legend.classList.remove('hidden');
  document.querySelectorAll('.universe-filters').forEach((filterRow) => filterRow.classList.remove('hidden'));
}

function showFrameworkInUniverse() {
  const grid = document.getElementById('universe-grid');
  const detail = document.getElementById('universe-detail');

  grid.classList.add('hidden');
  detail.classList.add('hidden');
  hideControls();

  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));
  const fw = document.querySelector('.phase-content[data-phase="framework"]');
  if (fw) fw.classList.add('active');

  updateAllNavs();
  window.scrollTo(0, 0);
}

function showUniverseDetail(universeId) {
  const grid = document.getElementById('universe-grid');
  const detail = document.getElementById('universe-detail');

  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

  grid.classList.add('hidden');
  hideControls();
  detail.classList.remove('hidden');

  detail.querySelectorAll('.universe-timeline').forEach(el => {
    el.classList.toggle('hidden', el.dataset.universeDetail !== universeId);
  });

  updateAllNavs();
  window.scrollTo(0, 0);
}

function showUniverseGrid() {
  const grid = document.getElementById('universe-grid');
  const detail = document.getElementById('universe-detail');

  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

  detail.classList.add('hidden');
  grid.classList.remove('hidden');
  showControls();

  updateAllNavs();
}
