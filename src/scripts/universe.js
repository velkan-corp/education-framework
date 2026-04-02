import { state } from './state.js';
import { updateAllNavs } from './navigation.js';

let currentTabTag = 'all';
let currentAge = 'all';
let currentTier = 'all';
let currentLanguage = 'all';
let currentKind = 'all';
let currentTarget = 'all';
let currentModel = 'all';
let currentMode = 'all';

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

  bindSingleSelectFilter('age-filters', 'age', (value) => {
    currentAge = value;
  });
  bindSingleSelectFilter('tier-filters', 'tier', (value) => {
    currentTier = value;
  });
  bindSingleSelectFilter('language-filters', 'language', (value) => {
    currentLanguage = value;
  });
  bindSingleSelectFilter('kind-filters', 'kind', (value) => {
    currentKind = value;
  });
  bindSingleSelectFilter('target-filters', 'target', (value) => {
    currentTarget = value;
  });
  bindSingleSelectFilter('model-filters', 'model', (value) => {
    currentModel = value;
  });
  bindSingleSelectFilter('mode-filters', 'mode', (value) => {
    currentMode = value;
  });

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
    const matchesLanguage = currentLanguage === 'all' || languages.includes(currentLanguage);
    const matchesKind = currentKind === 'all' || card.dataset.kind === currentKind;
    const matchesTarget = currentTarget === 'all' || targets.includes(currentTarget);
    const matchesModel = currentModel === 'all' || models.includes(currentModel);
    const matchesMode = currentMode === 'all'
      || (currentAge === 'all'
        ? modes.includes(currentMode)
        : phaseModes.includes(`${currentAge}:${currentMode}`));

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
