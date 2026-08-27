import { normalizeResourceTier, tierLabel, uiText } from './uiLocale.js';
import { getCanonicalTargetNames, inferTrailingResourceTargets } from './resources.js';

function getResourceTierSeparator(row) {
  const cells = Array.from(row.querySelectorAll('td'));
  const cell = cells.length === 1 && cells[0].colSpan > 1 ? cells[0] : null;
  if (cell) return normalizeResourceTier(cell.textContent);
  if (
    cells.length === 3
    && cells[0].textContent.trim()
    && cells.slice(1).every((candidate) => !candidate.textContent.trim())
  ) {
    return normalizeResourceTier(cells[0].textContent);
  }
  return '';
}

function getRowTargets(row, canonicalTargetNames) {
  const names = new Set();
  row.querySelectorAll('.tag-target').forEach((tag) => {
    const name = tag.textContent.trim();
    if (name) names.add(name);
  });

  const cells = row.querySelectorAll('td');
  const description = cells.length >= 3 ? cells[cells.length - 1] : cells[1];
  if (description) {
    inferTrailingResourceTargets(description.textContent, canonicalTargetNames)
      .forEach((name) => names.add(name));
  }
  return names;
}

export function initResourceFilters() {
  const canonicalTargetNames = getCanonicalTargetNames();
  document.querySelectorAll('.phase-content table').forEach(table => {
    if (table.dataset.resourceFiltersInitialized === 'true') return;

    const tierRows = Array.from(table.querySelectorAll('tr')).filter(tr => {
      return Boolean(getResourceTierSeparator(tr));
    });
    if (tierRows.length === 0) return;
    table.dataset.resourceFiltersInitialized = 'true';

    let currentTier = '';
    Array.from(table.querySelectorAll('tr')).forEach(tr => {
      if (tr.querySelector('th')) return;
      const parsedTier = getResourceTierSeparator(tr);
      if (parsedTier) {
        currentTier = parsedTier;
        tr.setAttribute('data-tier-header', currentTier);
        return;
      }
      if (!currentTier) return;
      tr.setAttribute('data-tier', currentTier);
      tr.classList.add('resource-row');
      const cells = tr.querySelectorAll('td');
      if (cells.length >= 2) {
        const typeText = cells[1].textContent.trim().toLowerCase();
        if (/book|online|libro|en línea|ensayo|documento/u.test(typeText)) tr.setAttribute('data-type', 'book');
        else if (/film|película|pelicula/u.test(typeText)) tr.setAttribute('data-type', 'film');
        else if (/game|juego/u.test(typeText)) tr.setAttribute('data-type', 'game');
        else if (/equipment|equipamiento|equipo/u.test(typeText)) tr.setAttribute('data-type', 'equipment');
        else if (/service|servicio|suscripción|suscripcion/u.test(typeText)) tr.setAttribute('data-type', 'service');
        else if (/\bapp\b|application|aplicación|aplicacion/u.test(typeText)) tr.setAttribute('data-type', 'app');
        else if (/toy|juguete/u.test(typeText)) tr.setAttribute('data-type', 'toy');
        else tr.setAttribute('data-type', 'other');
      }
    });

    const types = new Set();
    const targets = new Set();
    table.querySelectorAll('.resource-row').forEach(r => {
      const t = r.getAttribute('data-type');
      if (t && t !== 'other') types.add(t);
      const rowTargets = getRowTargets(r, canonicalTargetNames);
      if (rowTargets.size > 0) {
        r.setAttribute('data-targets', `|${Array.from(rowTargets).join('|')}|`);
      }
      rowTargets.forEach((name) => {
        targets.add(name);
      });
    });

    const filterDiv = document.createElement('div');
    filterDiv.className = 'resource-filters';

    // Tier pills
    const tierGroup = document.createElement('div');
    tierGroup.className = 'filter-group';
    tierGroup.innerHTML = `<span class="filter-label">${uiText('tier')}</span>`;
    ['all', 'foundational', 'core', 'recommended'].forEach(val => {
      const pill = document.createElement('button');
      pill.className = 'filter-pill' + (val === 'all' ? ' active' : '');
      pill.setAttribute('data-filter', 'tier');
      pill.setAttribute('data-val', val);
      pill.textContent = val === 'all' ? uiText('all') : tierLabel(val);
      tierGroup.appendChild(pill);
    });
    filterDiv.appendChild(tierGroup);

    // Type pills
    if (types.size > 1) {
      const typeGroup = document.createElement('div');
      typeGroup.className = 'filter-group';
      typeGroup.innerHTML = `<span class="filter-label">${uiText('type')}</span>`;
      const typeBtn = document.createElement('button');
      typeBtn.className = 'filter-pill active';
      typeBtn.setAttribute('data-filter', 'type');
      typeBtn.setAttribute('data-val', 'all');
      typeBtn.textContent = uiText('all');
      typeGroup.appendChild(typeBtn);
      Array.from(types).sort().forEach(t => {
        const pill = document.createElement('button');
        pill.className = 'filter-pill';
        pill.setAttribute('data-filter', 'type');
        pill.setAttribute('data-val', t);
        pill.textContent = uiText(t);
        typeGroup.appendChild(pill);
      });
      filterDiv.appendChild(typeGroup);
    }

    // Target pills
    if (targets.size > 0) {
      const targetGroup = document.createElement('div');
      targetGroup.className = 'filter-group';
      targetGroup.innerHTML = `<span class="filter-label">${uiText('target')}</span>`;
      const allBtn = document.createElement('button');
      allBtn.className = 'filter-pill active';
      allBtn.setAttribute('data-filter', 'target');
      allBtn.setAttribute('data-val', 'all');
      allBtn.textContent = uiText('all');
      targetGroup.appendChild(allBtn);
      Array.from(targets).sort().forEach(t => {
        const pill = document.createElement('button');
        pill.className = 'filter-pill';
        pill.setAttribute('data-filter', 'target');
        pill.setAttribute('data-val', t);
        pill.textContent = t;
        targetGroup.appendChild(pill);
      });
      filterDiv.appendChild(targetGroup);
    }

    const wrapper = table.closest('.table-scroll') || table;
    wrapper.parentNode.insertBefore(filterDiv, wrapper);

    filterDiv.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      const filterType = pill.getAttribute('data-filter');
      const val = pill.getAttribute('data-val');
      const allPill = filterDiv.querySelector(`.filter-pill[data-filter="${filterType}"][data-val="all"]`);

      if (val === 'all') {
        filterDiv.querySelectorAll(`.filter-pill[data-filter="${filterType}"]`).forEach(p => p.classList.remove('active'));
        allPill.classList.add('active');
      } else {
        pill.classList.toggle('active');
        allPill.classList.remove('active');
        const anyActive = filterDiv.querySelector(`.filter-pill[data-filter="${filterType}"].active:not([data-val="all"])`);
        if (!anyActive) allPill.classList.add('active');
      }
      applyResourceFilter(table, filterDiv);
    });
  });
}

function getActiveFilterVals(filterDiv, filterType) {
  const allActive = filterDiv.querySelector(`.filter-pill[data-filter="${filterType}"][data-val="all"].active`);
  if (allActive) return null;
  return Array.from(filterDiv.querySelectorAll(`.filter-pill[data-filter="${filterType}"].active`)).map(p => p.getAttribute('data-val'));
}

function applyResourceFilter(table, filterDiv) {
  const tiers = getActiveFilterVals(filterDiv, 'tier');
  const types = getActiveFilterVals(filterDiv, 'type');
  const targets = getActiveFilterVals(filterDiv, 'target');

  table.querySelectorAll('.resource-row').forEach(tr => {
    const tier = tr.getAttribute('data-tier');
    const type = tr.getAttribute('data-type');
    const rowTargets = tr.getAttribute('data-targets') || '';
    const tierMatch = !tiers || tiers.includes(tier);
    const typeMatch = !types || types.includes(type);
    const targetMatch = !targets || targets.some(t => rowTargets.includes('|' + t + '|'));
    tr.style.display = (tierMatch && typeMatch && targetMatch) ? '' : 'none';
  });

  table.querySelectorAll('tr[data-tier-header]').forEach(tr => {
    const tier = tr.getAttribute('data-tier-header');
    if (tiers && !tiers.includes(tier)) { tr.style.display = 'none'; return; }
    let hasVisible = false;
    let sibling = tr.nextElementSibling;
    while (sibling && !sibling.hasAttribute('data-tier-header')) {
      if (sibling.style.display !== 'none') hasVisible = true;
      sibling = sibling.nextElementSibling;
    }
    tr.style.display = hasVisible ? '' : 'none';
  });
}

export function initSectionFilters() {
  document.querySelectorAll('.program-elements').forEach(container => {
    if (container.dataset.sectionFiltersInitialized === 'true') return;
    const sections = Array.from(container.querySelectorAll('h2[data-tier]'));
    if (!sections.length) return;
    container.dataset.sectionFiltersInitialized = 'true';

    sections.forEach(h2 => {
      const tier = h2.dataset.tier;
      if (h2.querySelector('.tier-badge')) return;
      const badge = document.createElement('span');
      badge.className = `tier-badge ${tier}`;
      badge.textContent = tierLabel(tier);
      h2.appendChild(badge);
    });

    const headerDiv = document.createElement('div');
    headerDiv.className = 'section-filters-header';
    headerDiv.innerHTML = `<h2 class="section-filters-title"><span class="material-symbols-rounded" aria-hidden="true">school</span>${uiText('curriculumThreads')}</h2><p class="section-filters-desc">${uiText('curriculumThreadsDescription')}</p>`;
    container.insertBefore(headerDiv, container.firstChild);

    const filterDiv = document.createElement('div');
    filterDiv.className = 'section-filters';
    filterDiv.innerHTML = '';
    ['all', 'foundational', 'core', 'recommended'].forEach(val => {
      const pill = document.createElement('button');
      pill.className = 'filter-pill' + (val === 'all' ? ' active' : '');
      pill.setAttribute('data-val', val);
      pill.textContent = val === 'all' ? uiText('all') : tierLabel(val);
      filterDiv.appendChild(pill);
    });
    headerDiv.appendChild(filterDiv);

    filterDiv.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      filterDiv.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applySectionFilter(container, pill.dataset.val);
    });
  });
}

function applySectionFilter(container, tierVal) {
  const allH2s = Array.from(container.querySelectorAll('h2[data-tier]'));
  allH2s.forEach(h2 => {
    const tier = h2.dataset.tier;
    const show = tierVal === 'all' || tier === tierVal;
    let el = h2;
    while (el) {
      el.style.display = show ? '' : 'none';
      el = el.nextElementSibling;
      if (el && el.tagName === 'H2') break;
    }
  });
}
