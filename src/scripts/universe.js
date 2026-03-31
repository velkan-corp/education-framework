import { state } from './state.js';
import { updateAllNavs } from './navigation.js';

let currentTabTag = 'all';
let currentFilter = 'all';
let currentAge = 'all';

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

    universeTabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));

    if (tabId === 'framework') {
      showFrameworkInUniverse();
    } else {
      currentTabTag = tabId;
      showUniverseGrid();
      applyFilters();
    }
  });

  // Age filter clicks
  document.querySelectorAll('#age-filters .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#age-filters .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentAge = pill.dataset.age;
      applyFilters();
    });
  });

  // Attribute filter clicks
  document.querySelectorAll('#attr-filters .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#attr-filters .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      applyFilters();
    });
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
    const tags = card.dataset.tags.split(',');
    const phases = card.dataset.phases.split(',');
    const matchesTab = currentTabTag === 'all' || tags.includes(currentTabTag);
    const matchesFilter = currentFilter === 'all' || tags.includes(currentFilter);
    const matchesAge = currentAge === 'all' || phases.includes(currentAge);
    card.classList.toggle('hidden', !(matchesTab && matchesFilter && matchesAge));
  });
}

function hideControls() {
  const legend = document.querySelector('.universe-legend');
  const ageFilters = document.getElementById('age-filters');
  const attrFilters = document.getElementById('attr-filters');
  if (legend) legend.classList.add('hidden');
  if (ageFilters) ageFilters.classList.add('hidden');
  if (attrFilters) attrFilters.classList.add('hidden');
}

function showControls() {
  const legend = document.querySelector('.universe-legend');
  const ageFilters = document.getElementById('age-filters');
  const attrFilters = document.getElementById('attr-filters');
  if (legend) legend.classList.remove('hidden');
  if (ageFilters) ageFilters.classList.remove('hidden');
  if (attrFilters) attrFilters.classList.remove('hidden');
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
