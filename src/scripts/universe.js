import { state } from './state.js';
import { updateAllNavs, showTab, renderTabs } from './navigation.js';

let currentFilter = 'all';

export function initUniverseView() {
  const grid = document.getElementById('universe-grid');
  const detail = document.getElementById('universe-detail');
  const backBtn = document.getElementById('universe-back');
  const universeTabs = document.getElementById('universe-tabs');
  if (!grid || !detail || !universeTabs) return;

  // Tab clicks — filter grid or show framework
  universeTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    const tabId = tab.dataset.universeTab;
    if (!tabId) return;

    // Update active tab
    universeTabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));

    if (tabId === 'framework') {
      showFrameworkInUniverse();
    } else {
      showUniverseGrid();
      filterGrid(tabId);
    }
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
      filterGrid(currentFilter);
    });
  }
}

function filterGrid(tag) {
  currentFilter = tag;
  document.querySelectorAll('.universe-card').forEach(card => {
    if (tag === 'all') {
      card.classList.remove('hidden');
    } else {
      const tags = card.dataset.tags.split(',');
      card.classList.toggle('hidden', !tags.includes(tag));
    }
  });
}

function showFrameworkInUniverse() {
  const grid = document.getElementById('universe-grid');
  const detail = document.getElementById('universe-detail');
  const legend = document.querySelector('.universe-legend');

  grid.classList.add('hidden');
  detail.classList.add('hidden');
  if (legend) legend.classList.add('hidden');

  // Show framework phase content
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

  // Hide framework if showing
  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

  grid.classList.add('hidden');
  if (legend) legend.classList.add('hidden');
  detail.classList.remove('hidden');

  // Show only the selected universe timeline
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

  // Hide framework if showing
  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

  detail.classList.add('hidden');
  grid.classList.remove('hidden');
  if (legend) legend.classList.remove('hidden');

  updateAllNavs();
}
