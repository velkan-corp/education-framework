import { state } from './state.js';
import { updateAllNavs } from './navigation.js';

let currentTabTag = 'all';
let currentFilter = 'all';

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

  // Filter pill clicks — narrow by attribute
  document.querySelectorAll('.universe-filters .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const filter = pill.dataset.filter;
      document.querySelectorAll('.universe-filters .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = filter;
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
    const matchesTab = currentTabTag === 'all' || tags.includes(currentTabTag);
    const matchesFilter = currentFilter === 'all' || tags.includes(currentFilter);
    card.classList.toggle('hidden', !(matchesTab && matchesFilter));
  });
}

function showFrameworkInUniverse() {
  const grid = document.getElementById('universe-grid');
  const detail = document.getElementById('universe-detail');
  const legend = document.querySelector('.universe-legend');
  const filters = document.querySelector('.universe-filters');

  grid.classList.add('hidden');
  detail.classList.add('hidden');
  if (legend) legend.classList.add('hidden');
  if (filters) filters.classList.add('hidden');

  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));
  const fw = document.querySelector('.phase-content[data-phase="framework"]');
  if (fw) fw.classList.add('active');

  updateAllNavs();
  window.scrollTo(0, 0);
}

function showUniverseDetail(universeId) {
  const grid = document.getElementById('universe-grid');
  const detail = document.getElementById('universe-detail');
  const legend = document.querySelector('.universe-legend');
  const filters = document.querySelector('.universe-filters');

  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

  grid.classList.add('hidden');
  if (legend) legend.classList.add('hidden');
  if (filters) filters.classList.add('hidden');
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
  const legend = document.querySelector('.universe-legend');
  const filters = document.querySelector('.universe-filters');

  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

  detail.classList.add('hidden');
  grid.classList.remove('hidden');
  if (legend) legend.classList.remove('hidden');
  if (filters) filters.classList.remove('hidden');

  updateAllNavs();
}
