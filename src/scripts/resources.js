import { updateAllNavs } from './navigation.js';

let resourceMap = null;

function buildResourceMap() {
  const map = new Map(); // key: resource name (lowercase) → { name, category, tier, targets[], phases[] }
  const agePhases = ['age-0-1', 'age-1-3', 'age-4-7', 'age-8-10', 'age-11-13', 'age-14-16', 'age-17-18'];

  agePhases.forEach(phaseId => {
    const phaseEl = document.querySelector(`.phase-content[data-phase="${phaseId}"]`);
    if (!phaseEl) return;
    const phaseLabel = phaseEl.dataset.label;

    // IDs get scoped by scopePhaseAnchors() — use data-anchor-base
    const resourceSection = phaseEl.querySelector('[data-anchor-base="s-resources"]')
      || phaseEl.querySelector('#s-resources');
    if (!resourceSection) return;

    // Collect all tables after the resource heading
    let el = resourceSection.nextElementSibling;
    while (el && el.tagName !== 'H2') {
      if (el.tagName === 'TABLE') {
        parseResourceTable(el, phaseId, phaseLabel, map);
      } else if (el.querySelector && el.querySelector('table')) {
        const table = el.querySelector('table');
        if (table) parseResourceTable(table, phaseId, phaseLabel, map);
      }
      el = el.nextElementSibling;
    }
  });

  return map;
}

function parseResourceTable(table, phaseId, phaseLabel, map) {
  let currentTier = 'recommended';
  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');

    // Tier separator row (colspan)
    if (cells.length === 1 && cells[0].colSpan > 1) {
      const text = cells[0].textContent.toLowerCase();
      if (text.includes('foundational')) currentTier = 'foundational';
      else if (text.includes('core')) currentTier = 'core';
      else if (text.includes('recommended')) currentTier = 'recommended';
      return;
    }

    // Skip header rows and rows with < 2 cells
    if (cells.length < 2) return;
    if (row.querySelector('th')) return;

    const name = cells[0].textContent.trim();
    if (!name) return;

    const has3Cols = cells.length >= 3;
    const category = has3Cols ? normalizeCategory(cells[1].textContent.trim()) : 'equipment';
    const descCell = has3Cols ? cells[2] : cells[1];
    const description = descCell.innerHTML;

    // Extract target tags
    const targetTags = [];
    descCell.querySelectorAll('.tag-target').forEach(tag => {
      targetTags.push(tag.textContent.trim());
    });

    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { name, category, tier: currentTier, targets: new Set(), phases: [] });
    }
    const entry = map.get(key);
    targetTags.forEach(t => entry.targets.add(t));
    // Use highest tier if resource appears in multiple phases with different tiers
    const tierRank = { foundational: 3, core: 2, recommended: 1 };
    if ((tierRank[currentTier] || 0) > (tierRank[entry.tier] || 0)) {
      entry.tier = currentTier;
    }
    entry.phases.push({ phaseId, phaseLabel, description, tier: currentTier });
  });
}

function normalizeCategory(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes('book') || lower.includes('libro')) return 'books';
  if (lower.includes('toy') || lower.includes('juguete')) return 'toys';
  if (lower.includes('game') || lower.includes('juego')) return 'games';
  if (lower.includes('service') || lower.includes('servicio') || lower.includes('subscription') || lower.includes('app')) return 'services';
  if (lower.includes('media') || lower.includes('film') || lower.includes('show') || lower.includes('serie')) return 'media';
  return 'equipment';
}

function renderResourceCards(filter = {}) {
  if (!resourceMap) return;
  const container = document.getElementById('resources-card-container');
  if (!container) return;

  const { category = 'all', age = 'all', tier = 'all', target = 'all' } = filter;

  let entries = Array.from(resourceMap.entries());

  if (category !== 'all') {
    entries = entries.filter(([, data]) => data.category === category);
  }
  if (age !== 'all') {
    entries = entries.filter(([, data]) => data.phases.some(p => p.phaseId === age));
  }
  if (tier !== 'all') {
    entries = entries.filter(([, data]) => data.tier === tier || data.phases.some(p => p.tier === tier));
  }
  if (target !== 'all') {
    entries = entries.filter(([, data]) => data.targets.has(target));
  }

  // Sort: foundational first, then by number of phases, then alphabetically
  const tierRank = { foundational: 3, core: 2, recommended: 1 };
  entries.sort((a, b) => (tierRank[b[1].tier] || 0) - (tierRank[a[1].tier] || 0)
    || b[1].phases.length - a[1].phases.length
    || a[1].name.localeCompare(b[1].name));

  if (entries.length === 0) {
    container.innerHTML = '<p class="browse-empty">No resources match the current filters.</p>';
    return;
  }

  const tierClass = { foundational: 'tier-foundational', core: 'tier-core', recommended: 'tier-recommended' };
  container.innerHTML = `<div class="table-scroll"><table class="resource-master-table">
    <tr>
      <th>Resource</th>
      <th>Type</th>
      <th>Tier</th>
      <th>Ages</th>
      <th>Targets</th>
    </tr>
    ${entries.map(([key, data]) => `
      <tr class="resource-row" data-browse-id="${key}" data-category="${data.category}" data-tier="${data.tier}">
        <td class="resource-name">${data.name}</td>
        <td><span class="resource-type-badge">${data.category}</span></td>
        <td><span class="tier-badge ${tierClass[data.tier] || ''}">${data.tier}</span></td>
        <td>${data.phases.map(p => p.phaseLabel).join(', ')}</td>
        <td class="resource-targets">${data.targets.size > 0 ? Array.from(data.targets).map(t => `<span class="tag tag-target">${t}</span>`).join(' ') : ''}</td>
      </tr>
    `).join('')}
  </table></div>`;
}

function showResourceDetail(key) {
  if (!resourceMap) return;
  const data = resourceMap.get(key);
  if (!data) return;

  const grid = document.getElementById('resources-grid');
  const detail = document.getElementById('resources-detail');
  if (!grid || !detail) return;

  grid.classList.add('hidden');
  detail.classList.remove('hidden');

  const header = document.getElementById('resources-detail-header');
  header.innerHTML = `
    <div class="browse-detail-title">
      <h1>${data.name}</h1>
      <span class="category-badge">${data.category}</span>
    </div>
  `;

  const timeline = document.getElementById('resources-timeline');
  timeline.innerHTML = data.phases.map(phase => `
    <div class="timeline-phase">
      <div class="timeline-header">
        <span class="timeline-age">${phase.phaseLabel}</span>
      </div>
      <div class="timeline-content">${phase.description}</div>
    </div>
  `).join('');

  updateAllNavs();
  window.scrollTo(0, 0);
}

function showResourcesGrid() {
  document.getElementById('resources-detail')?.classList.add('hidden');
  document.getElementById('resources-grid')?.classList.remove('hidden');
  updateAllNavs();
}

let currentCategory = 'all';
let currentAge = 'all';
let currentTier = 'all';
let currentTarget = 'all';

function applyResourceFilters() {
  renderResourceCards({ category: currentCategory, age: currentAge, tier: currentTier, target: currentTarget });
}

function setupFilterRow(containerId, dataAttr, setter) {
  const row = document.getElementById(containerId);
  if (!row) return;
  row.addEventListener('click', (e) => {
    const pill = e.target.closest('.browse-filter-pill');
    if (!pill) return;
    row.querySelectorAll('.browse-filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    setter(pill.dataset[dataAttr]);
    applyResourceFilters();
  });
}

function setupResourceFilters() {
  // Category filters
  setupFilterRow('resource-category-filters', 'category', v => { currentCategory = v; });

  // Age filters — populate from phase data
  const ageRow = document.getElementById('resource-age-filters');
  if (ageRow && window.__phaseData) {
    let html = '<button type="button" class="browse-filter-pill active" data-age="all">All Ages</button>';
    window.__phaseData.forEach(p => {
      html += `<button type="button" class="browse-filter-pill" data-age="${p.id}">${p.label}</button>`;
    });
    ageRow.innerHTML = html;
    setupFilterRow('resource-age-filters', 'age', v => { currentAge = v; });
  }

  // Tier filters — populate dynamically
  const tierRow = document.getElementById('resource-tier-filters');
  if (tierRow) {
    setupFilterRow('resource-tier-filters', 'tier', v => { currentTier = v; });
  }

  // Target filters — populate from discovered targets
  const targetRow = document.getElementById('resource-target-filters');
  if (targetRow && resourceMap) {
    const allTargets = new Set();
    resourceMap.forEach(data => data.targets.forEach(t => allTargets.add(t)));
    const sorted = Array.from(allTargets).sort();
    let html = '<button type="button" class="browse-filter-pill active" data-target="all">All Targets</button>';
    sorted.forEach(t => {
      html += `<button type="button" class="browse-filter-pill" data-target="${t}">${t}</button>`;
    });
    targetRow.innerHTML = html;
    setupFilterRow('resource-target-filters', 'target', v => { currentTarget = v; });
  }
}

export function initResourcesView() {
  resourceMap = buildResourceMap();
  setupResourceFilters();
  renderResourceCards();

  const container = document.getElementById('resources-card-container');
  if (container) {
    container.addEventListener('click', (e) => {
      const row = e.target.closest('.resource-row');
      if (!row) return;
      showResourceDetail(row.dataset.browseId);
    });
  }

  document.getElementById('resources-back')?.addEventListener('click', () => showResourcesGrid());
}
