export function initResourceFilters() {
  document.querySelectorAll('.phase-content table').forEach(table => {
    const tierRows = Array.from(table.querySelectorAll('tr')).filter(tr => {
      const cell = tr.querySelector('td[colspan]');
      return cell && /FOUNDATIONAL|CORE|RECOMMENDED/.test(cell.textContent);
    });
    if (tierRows.length === 0) return;

    let currentTier = '';
    Array.from(table.querySelectorAll('tr')).forEach(tr => {
      if (tr.querySelector('th')) return;
      const tierCell = tr.querySelector('td[colspan]');
      if (tierCell && /FOUNDATIONAL|CORE|RECOMMENDED/.test(tierCell.textContent)) {
        if (/FOUNDATIONAL/.test(tierCell.textContent)) currentTier = 'foundational';
        else if (/CORE/.test(tierCell.textContent)) currentTier = 'core';
        else currentTier = 'recommended';
        tr.setAttribute('data-tier-header', currentTier);
        return;
      }
      if (!currentTier) return;
      tr.setAttribute('data-tier', currentTier);
      tr.classList.add('resource-row');
      const cells = tr.querySelectorAll('td');
      if (cells.length >= 2) {
        const typeText = cells[1].textContent.trim().toLowerCase();
        if (/book|online/.test(typeText)) tr.setAttribute('data-type', 'book');
        else if (/film/.test(typeText)) tr.setAttribute('data-type', 'film');
        else if (/game/.test(typeText)) tr.setAttribute('data-type', 'game');
        else if (/equipment/.test(typeText)) tr.setAttribute('data-type', 'equipment');
        else if (/service/.test(typeText)) tr.setAttribute('data-type', 'service');
        else if (/app/.test(typeText)) tr.setAttribute('data-type', 'app');
        else if (/toy/.test(typeText)) tr.setAttribute('data-type', 'toy');
        else if (/essay|document/.test(typeText)) tr.setAttribute('data-type', 'book');
        else tr.setAttribute('data-type', 'other');
      }
    });

    const types = new Set();
    const targets = new Set();
    table.querySelectorAll('.resource-row').forEach(r => {
      const t = r.getAttribute('data-type');
      if (t && t !== 'other') types.add(t);
      r.querySelectorAll('.tag-target').forEach(tag => {
        const name = tag.textContent.trim();
        if (name) { r.setAttribute('data-targets', (r.getAttribute('data-targets') || '') + '|' + name + '|'); targets.add(name); }
      });
    });

    const filterDiv = document.createElement('div');
    filterDiv.className = 'resource-filters';

    // Tier pills
    const tierGroup = document.createElement('div');
    tierGroup.className = 'filter-group';
    tierGroup.innerHTML = '<span class="filter-label">Tier</span>';
    ['all', 'foundational', 'core', 'recommended'].forEach(val => {
      const pill = document.createElement('button');
      pill.className = 'filter-pill' + (val === 'all' ? ' active' : '');
      pill.setAttribute('data-filter', 'tier');
      pill.setAttribute('data-val', val);
      pill.textContent = val === 'all' ? 'All' : val.charAt(0).toUpperCase() + val.slice(1);
      tierGroup.appendChild(pill);
    });
    filterDiv.appendChild(tierGroup);

    // Type pills
    if (types.size > 1) {
      const typeGroup = document.createElement('div');
      typeGroup.className = 'filter-group';
      typeGroup.innerHTML = '<span class="filter-label">Type</span>';
      const typeBtn = document.createElement('button');
      typeBtn.className = 'filter-pill active';
      typeBtn.setAttribute('data-filter', 'type');
      typeBtn.setAttribute('data-val', 'all');
      typeBtn.textContent = 'All';
      typeGroup.appendChild(typeBtn);
      const typeLabels = { book: 'Books', film: 'Film', game: 'Games', equipment: 'Equipment', service: 'Services', app: 'Apps', toy: 'Toys' };
      Array.from(types).sort().forEach(t => {
        const pill = document.createElement('button');
        pill.className = 'filter-pill';
        pill.setAttribute('data-filter', 'type');
        pill.setAttribute('data-val', t);
        pill.textContent = typeLabels[t] || t;
        typeGroup.appendChild(pill);
      });
      filterDiv.appendChild(typeGroup);
    }

    // Target pills
    if (targets.size > 0) {
      const targetGroup = document.createElement('div');
      targetGroup.className = 'filter-group';
      targetGroup.innerHTML = '<span class="filter-label">Target</span>';
      const allBtn = document.createElement('button');
      allBtn.className = 'filter-pill active';
      allBtn.setAttribute('data-filter', 'target');
      allBtn.setAttribute('data-val', 'all');
      allBtn.textContent = 'All';
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
    const sections = Array.from(container.querySelectorAll('h2[data-tier]'));
    if (!sections.length) return;

    sections.forEach(h2 => {
      const tier = h2.dataset.tier;
      const badge = document.createElement('span');
      badge.className = `tier-badge ${tier}`;
      badge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
      h2.appendChild(badge);
    });

    const filterDiv = document.createElement('div');
    filterDiv.className = 'section-filters';
    filterDiv.innerHTML = '<span class="filter-label">Show</span>';
    ['all', 'foundational', 'core', 'recommended'].forEach(val => {
      const pill = document.createElement('button');
      pill.className = 'filter-pill' + (val === 'all' ? ' active' : '');
      pill.setAttribute('data-val', val);
      pill.textContent = val === 'all' ? 'All' : val.charAt(0).toUpperCase() + val.slice(1);
      filterDiv.appendChild(pill);
    });
    container.insertBefore(filterDiv, container.firstChild);

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
