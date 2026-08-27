import { updateAllNavs } from './navigation.js';
import { getUniverseIdFromElement } from './universeRefs.js';
import { categoryLabel, formatAgeLabel, normalizeResourceTier, tierLabel, uiText } from './uiLocale.js';

let resourceMap = null;
const TIER_RANK = { foundational: 3, core: 2, recommended: 1 };

function normalizeTargetMatchText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function hasBoundedSuffix(text, suffix) {
  if (!suffix || !text.endsWith(suffix)) return false;
  const start = text.length - suffix.length;
  return start === 0 || !/[\p{L}\p{N}]/u.test(text[start - 1]);
}

export function getCanonicalTargetNames(root = document) {
  const names = Array.from(root.querySelectorAll('#targets-view .browse-card .browse-card-body'))
    .map((body) => body.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim())
    .filter(Boolean);
  return Array.from(new Set(names));
}

export function inferTrailingResourceTargets(plainText, targetNames) {
  const text = normalizeTargetMatchText(plainText)
    .replace(/[\s.!?\u2026,:;'"\u201c\u201d\u2018\u2019()[\]{}]+$/gu, '');

  return targetNames.filter((name) => {
    const target = normalizeTargetMatchText(name);
    return hasBoundedSuffix(text, target)
      || hasBoundedSuffix(text, `${target} seed`)
      || hasBoundedSuffix(text, `seed of ${target}`)
      || hasBoundedSuffix(text, `semilla de ${target}`);
  });
}

function collectResourceTargets(descCell, canonicalTargetNames) {
  const targets = new Set();
  descCell.querySelectorAll('.tag-target').forEach((tag) => {
    const name = tag.textContent.trim();
    if (name) targets.add(name);
  });
  inferTrailingResourceTargets(descCell.textContent, canonicalTargetNames)
    .forEach((name) => targets.add(name));
  return Array.from(targets);
}

function getResourceTierSeparator(row) {
  const cells = Array.from(row.querySelectorAll('td'));
  if (cells.length === 1 && cells[0].colSpan > 1) {
    return normalizeResourceTier(cells[0].textContent);
  }
  if (
    cells.length === 3
    && cells[0].textContent.trim()
    && cells.slice(1).every((cell) => !cell.textContent.trim())
  ) {
    return normalizeResourceTier(cells[0].textContent);
  }
  return '';
}

export function mergeResourceRecord(map, record) {
  const {
    key,
    name,
    category,
    tier,
    targets,
    universeId,
    phaseId,
    phaseLabel,
    description,
    sourceColumns,
  } = record;

  if (!map.has(key)) {
    map.set(key, {
      name,
      category,
      categorySourceColumns: sourceColumns,
      tier,
      targets: new Set(),
      universeId: null,
      phases: [],
    });
  }

  const entry = map.get(key);
  if (sourceColumns > entry.categorySourceColumns) {
    entry.category = category;
    entry.categorySourceColumns = sourceColumns;
  }
  if (universeId && !entry.universeId) entry.universeId = universeId;
  targets.forEach((target) => entry.targets.add(target));
  if ((TIER_RANK[tier] || 0) > (TIER_RANK[entry.tier] || 0)) entry.tier = tier;

  const existingPhase = entry.phases.find((phase) => phase.phaseId === phaseId);
  if (!existingPhase) {
    entry.phases.push({ phaseId, phaseLabel, description, tier, sourceColumns });
    return entry;
  }

  // Merge repeated “Start Here” and full-list rows without duplicating an age
  // in the generated table or timeline. Richness selects descriptive metadata;
  // tier priority remains an independent invariant.
  if (sourceColumns > existingPhase.sourceColumns) {
    existingPhase.description = description;
    existingPhase.sourceColumns = sourceColumns;
  }
  if ((TIER_RANK[tier] || 0) > (TIER_RANK[existingPhase.tier] || 0)) {
    existingPhase.tier = tier;
  }
  return entry;
}

function buildResourceMap() {
  const map = new Map(); // key: resource name (lowercase) → { name, category, tier, targets[], phases[] }
  const agePhases = ['age-0-1', 'age-1-3', 'age-4-7', 'age-8-10', 'age-11-13', 'age-14-16', 'age-17-18'];
  const canonicalTargetNames = getCanonicalTargetNames();

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
        parseResourceTable(el, phaseId, phaseLabel, map, canonicalTargetNames);
      } else if (el.querySelector && el.querySelector('table')) {
        const table = el.querySelector('table');
        if (table) parseResourceTable(table, phaseId, phaseLabel, map, canonicalTargetNames);
      }
      el = el.nextElementSibling;
    }
  });

  return map;
}

function parseResourceTable(table, phaseId, phaseLabel, map, canonicalTargetNames) {
  let currentTier = 'recommended';
  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');

    // Tier separators may be authored with colspan or rendered from Markdown
    // as three cells whose latter two cells are empty.
    const separatorTier = getResourceTierSeparator(row);
    if (separatorTier) {
      currentTier = separatorTier;
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

    // Preserve explicit target tags and recover Markdown-authored target names
    // that appear as plain trailing description text.
    const targetTags = collectResourceTargets(descCell, canonicalTargetNames);

    // Extract universe link from first cell if present
    const universeLink = cells[0].querySelector('[data-universe-nav], a[href^="#universe-"]');
    const universeId = getUniverseIdFromElement(universeLink) || null;

    const key = name.toLowerCase();
    mergeResourceRecord(map, {
      key,
      name,
      category,
      tier: currentTier,
      targets: targetTags,
      universeId,
      phaseId,
      phaseLabel,
      description,
      sourceColumns: has3Cols ? 3 : 2,
    });
  });
}

function normalizeCategory(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes('book') || lower.includes('libro') || lower.includes('essay') || lower.includes('ensayo') || lower.includes('document') || lower.includes('online')) return 'books';
  if (lower.includes('toy') || lower.includes('juguete')) return 'toys';
  if (lower.includes('game') || lower.includes('juego')) return 'games';
  if (lower.includes('service') || lower.includes('servicio') || lower.includes('subscription') || lower.includes('suscripción') || lower.includes('app') || lower.includes('aplicación')) return 'services';
  if (lower.includes('media') || lower.includes('film') || lower.includes('película') || lower.includes('pelicula') || lower.includes('show') || lower.includes('serie')) return 'media';
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
  entries.sort((a, b) => (TIER_RANK[b[1].tier] || 0) - (TIER_RANK[a[1].tier] || 0)
    || b[1].phases.length - a[1].phases.length
    || a[1].name.localeCompare(b[1].name));

  if (entries.length === 0) {
    container.innerHTML = `<p class="browse-empty">${uiText('noResources')}</p>`;
    return;
  }

  const tierClass = { foundational: 'tier-foundational', core: 'tier-core', recommended: 'tier-recommended' };
  container.innerHTML = `<div class="table-scroll"><table class="resource-master-table">
    <tr>
      <th>${uiText('resource')}</th>
      <th>${uiText('type')}</th>
      <th>${uiText('tier')}</th>
      <th>${uiText('ages')}</th>
      <th>${uiText('targets')}</th>
    </tr>
    ${entries.map(([key, data]) => `
      <tr class="resource-row" data-section="resource" data-slug="${key}" data-label="${data.name.replace(/"/g,'&quot;')}" data-browse-id="${key}" data-category="${data.category}" data-tier="${data.tier}" data-phases="${Array.from(new Set(data.phases.map(p => p.phaseId))).join(',')}">
        <td class="resource-name">${data.name}</td>
        <td><span class="resource-type-badge">${categoryLabel(data.category)}</span></td>
        <td><span class="tier-badge ${tierClass[data.tier] || ''}">${tierLabel(data.tier)}</span></td>
        <td>${data.phases.map(p => formatAgeLabel(p.phaseLabel)).join(', ')}</td>
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

  // If resource has a universe, pull summary + full timeline from the universe card
  let universeBlock = '';
  if (data.universeId) {
    const uCard = document.querySelector(`.universe-card[data-universe="${data.universeId}"]`);
    const uTitle = uCard?.querySelector('.universe-card-title')?.textContent || '';
    const uSummary = uCard?.querySelector('.universe-card-summary')?.textContent || '';
    universeBlock = `
      <div class="resource-universe-block">
        <a data-universe-nav="${data.universeId}" class="resource-universe-card">
          <div class="resource-universe-icon">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </div>
          <div class="resource-universe-body">
            <span class="resource-universe-label">${uiText('partOfUniverse')}</span>
            <strong>${uTitle || data.universeId}</strong>
            ${uSummary ? `<p>${uSummary}</p>` : ''}
          </div>
          <span class="resource-universe-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    `;
  }

  header.innerHTML = `
    <div class="browse-detail-title">
      <h1>${data.name}</h1>
      <span class="category-badge">${categoryLabel(data.category)}</span>
    </div>
    ${universeBlock}
  `;

  const timeline = document.getElementById('resources-timeline');
  timeline.innerHTML = `
    <h3 class="resource-timeline-label">${uiText('recommendedAt')}</h3>
    ${data.phases.map(phase => `
      <div class="timeline-phase">
        <div class="timeline-header">
          <span class="timeline-age">${formatAgeLabel(phase.phaseLabel)}</span>
          <span class="tier-badge ${phase.tier ? 'tier-' + phase.tier : ''}">${phase.tier ? tierLabel(phase.tier) : ''}</span>
        </div>
        <div class="timeline-content">${phase.description}</div>
      </div>
    `).join('')}
  `;

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
  if (!row || row.dataset.resourceFilterInitialized === 'true') return;
  row.dataset.resourceFilterInitialized = 'true';
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
    let html = `<button type="button" class="browse-filter-pill active" data-age="all">${uiText('allAges')}</button>`;
    window.__phaseData.forEach(p => {
      html += `<button type="button" class="browse-filter-pill" data-age="${p.id}">${formatAgeLabel(p.label)}</button>`;
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
    let html = `<button type="button" class="browse-filter-pill active" data-target="all">${uiText('allTargets')}</button>`;
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
  if (container && container.dataset.resourcesViewInitialized !== 'true') {
    container.dataset.resourcesViewInitialized = 'true';
    container.addEventListener('click', (e) => {
      const row = e.target.closest('.resource-row');
      if (!row) return;
      showResourceDetail(row.dataset.browseId);
    });
  }

  const back = document.getElementById('resources-back');
  if (back && back.dataset.resourcesViewInitialized !== 'true') {
    back.dataset.resourcesViewInitialized = 'true';
    back.addEventListener('click', () => showResourcesGrid());
  }
}
