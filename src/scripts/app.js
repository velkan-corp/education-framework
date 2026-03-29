// ===========================
// APP LOGIC
// ===========================
let currentTab = 'philosophy';
let profile = { energy: 'balanced', processing: 'balanced', sensitivity: 'balanced', novelty: 'balanced' };

function init() {
  setupTabClicks();
  renderTabs();
  showTab(currentTab);
  setupProfileToggles();
  setupNavLinks();
  wrapTablesForMobile();

  // Combined mobile FAB
  const fabMenu = document.getElementById('fab-menu');
  if (fabMenu) fabMenu.addEventListener('click', toggleFloatMenu);

  // Search icon — overlay on mobile, focus on desktop
  document.getElementById('search-icon').addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      openMobileSearch();
    } else {
      document.getElementById('search-input').focus();
    }
  });

  // Info tooltip toggles
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.info-toggle');
    if (toggle) {
      e.stopPropagation();
      const tipId = toggle.dataset.tip;
      const tip = document.getElementById(tipId);
      if (tip) tip.classList.toggle('open');
      return;
    }
  });

  // Handle anchor links — find target by iterating elements (not querySelector by id, which fails with duplicate ids)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    e.preventDefault();
    const targetId = link.getAttribute('href').slice(1);

    // Helper: find element with matching id attribute within a container
    function findById(container, id) {
      return Array.from(container.querySelectorAll('[id]')).find(el => el.id === id);
    }

    // 1. Try the active phase first
    const activePhase = document.querySelector('.phase-content.active');
    if (activePhase) {
      const el = findById(activePhase, targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    // 2. Search all phases — switch tab if found elsewhere
    const allPhases = document.querySelectorAll('.phase-content');
    for (const phase of allPhases) {
      const el = findById(phase, targetId);
      if (el) {
        currentTab = phase.dataset.phase;
        renderTabs();
        showTab(currentTab);
        setupNavLinks();
        setTimeout(() => {
          const active = document.querySelector('.phase-content.active');
          const found = findById(active, targetId);
          if (found) found.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        return;
      }
    }
  });
}

function toggleFloatMenu() {
  const panel = document.getElementById('float-menu');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) updateFloatMenuSections();
}

function updateFloatMenuSections() {
  const container = document.getElementById('float-menu-sections');
  const activeContent = document.querySelector('.phase-content.active');
  if (!container || !activeContent) return;
  const headings = Array.from(activeContent.querySelectorAll('h2[id]'));
  container.innerHTML = '<div class="profile-float-title">Sections</div>' +
    headings.map(h => `<div class="float-nav-link">${getHeadingText(h)}</div>`).join('');
  const links = container.querySelectorAll('.float-nav-link');
  headings.forEach((h, i) => {
    links[i].addEventListener('click', () => {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('float-menu').classList.remove('open');
    });
  });
}

// Legacy aliases for any remaining references
function toggleFloatProfile() { toggleFloatMenu(); }
function toggleFloatSections() { toggleFloatMenu(); }

function getHeadingText(h) {
  // Strip material-symbols-rounded icon text from heading
  let text = '';
  h.childNodes.forEach(n => {
    if (n.nodeType === 3) text += n.textContent;
    else if (n.nodeType === 1 && !n.classList.contains('material-symbols-rounded') && !n.classList.contains('tier-badge')) text += n.textContent;
  });
  return text.trim();
}

function updateFloatSections() {
  const panel = document.getElementById('float-menu-sections') || document.getElementById('float-sections');
  const activeContent = document.querySelector('.phase-content.active');
  if (!activeContent) return;
  const headings = Array.from(activeContent.querySelectorAll('h2[id]'));
  panel.innerHTML = '<div class="profile-float-title">Sections</div>' +
    headings.map(h =>
      `<div class="float-nav-link">${getHeadingText(h)}</div>`
    ).join('');
  const links = panel.querySelectorAll('.float-nav-link');
  headings.forEach((h, i) => {
    links[i].addEventListener('click', () => {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      panel.classList.remove('open');
    });
  });
}

function wrapTablesForMobile() {
  document.querySelectorAll('.phase-content table').forEach(table => {
    if (!table.parentElement.classList.contains('table-scroll')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
}

function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === currentTab);
  });
}

function setupTabClicks() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    currentTab = tab.dataset.tab;
    renderTabs();
    showTab(currentTab);
    setupNavLinks();
    window.scrollTo(0, 0);
  });
}

function showTab(tabId) {
  // Hide all phase content divs, show the active one
  document.querySelectorAll('.phase-content').forEach(el => {
    el.classList.toggle('active', el.dataset.phase === tabId);
  });
  applyProfile();
  wrapTablesForMobile();
  updateFloatSections();
}

function setupProfileToggles() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.radio-btn');
    if (!btn) return;
    const group = btn.closest('.radio-group');
    if (!group) return;
    e.stopPropagation();
    const dim = group.dataset.dim;
    const val = btn.dataset.val;
    profile[dim] = val;
    document.querySelectorAll(`.radio-group[data-dim="${dim}"] .radio-btn`).forEach(b => {
      b.classList.toggle('active', b.dataset.val === val);
    });
    applyProfile();
    updateFabIndicator();
  });
}

function applyProfile() {
  const classMap = {
    energy: { introvert: 't-introvert', extrovert: 't-extrovert' },
    processing: { verbal: 't-verbal', spatial: 't-spatial' },
    sensitivity: { 'high-sens': 't-high-sens', 'low-sens': 't-low-sens' },
    novelty: { depth: 't-depth', breadth: 't-breadth' }
  };

  document.querySelectorAll('.t-adjust').forEach(el => el.classList.remove('visible'));

  let activeCount = 0;
  for (const [dim, val] of Object.entries(profile)) {
    if (val !== 'balanced' && classMap[dim] && classMap[dim][val]) {
      document.querySelectorAll(`.${classMap[dim][val]}`).forEach(el => el.classList.add('visible'));
      activeCount++;
    }
  }
  return activeCount;
}

function updateFabIndicator() {
  const fab = document.getElementById('fab-profile');
  const active = Object.values(profile).filter(v => v !== 'balanced').length;
  if (active > 0) {
    fab.style.background = 'var(--accent2)';
    fab.textContent = active;
    fab.title = active + ' filter(s) active';
  } else {
    fab.style.background = 'var(--accent)';
    fab.textContent = '\u2699';
    fab.title = 'Child Profile';
  }
}

function setupNavLinks() {
  const navEl = document.getElementById('nav-links');
  const activeContent = document.querySelector('.phase-content.active');
  if (!activeContent) return;
  const headings = Array.from(activeContent.querySelectorAll('h2[id]'));
  navEl.innerHTML = '<div class="sidebar-title" style="margin-top:0">Sections</div>' +
    headings.map(h =>
      `<div class="nav-link">${getHeadingText(h)}</div>`
    ).join('');
  const links = navEl.querySelectorAll('.nav-link');
  headings.forEach((h, i) => {
    links[i].addEventListener('click', () => {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ===========================
// SEARCH
// ===========================
function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let debounce = null;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(input.value.trim()), 200);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; results.style.display = 'none'; clearHighlights(); }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-wrap')) { results.style.display = 'none'; }
    if (!e.target.closest('#float-menu') && !e.target.closest('#fab-menu')) {
      const menu = document.getElementById('float-menu');
      if (menu) menu.classList.remove('open');
    }
  });

  // Mobile search overlay
  const mobileInput = document.getElementById('mobile-search-input');
  const mobileResults = document.getElementById('mobile-search-results');
  const mobileClose = document.getElementById('mobile-search-close');
  const mobileOverlay = document.getElementById('mobile-search-overlay');
  if (mobileInput && mobileOverlay) {
    let mobileDebounce = null;
    mobileInput.addEventListener('input', () => {
      clearTimeout(mobileDebounce);
      mobileDebounce = setTimeout(() => runMobileSearch(mobileInput.value.trim()), 200);
    });
    mobileInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileSearch();
    });
    mobileClose.addEventListener('click', closeMobileSearch);
    mobileOverlay.addEventListener('click', (e) => {
      if (e.target === mobileOverlay) closeMobileSearch();
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); input.focus(); input.select(); }
  });
}

function runSearch(query) {
  const results = document.getElementById('search-results');
  clearHighlights();

  if (query.length < 2) { results.style.display = 'none'; return; }

  const matches = [];
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

  // Search across all phase content divs
  document.querySelectorAll('.phase-content').forEach(phaseEl => {
    const tabId = phaseEl.dataset.phase;
    const tabLabel = phaseEl.dataset.label;
    const text = phaseEl.textContent.replace(/\s+/g, ' ');
    let m;
    const seen = new Set();
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null && matches.length < 50) {
      const start = Math.max(0, m.index - 40);
      const end = Math.min(text.length, m.index + m[0].length + 40);
      let snippet = text.substring(start, end).trim();
      const key = tabId + ':' + snippet.substring(0, 30);
      if (seen.has(key)) continue;
      seen.add(key);
      snippet = snippet.replace(re, '<span style="background:var(--accent);color:#fff;padding:0 2px;border-radius:2px">$&</span>');
      matches.push({ tabId, tabLabel, snippet, index: m.index });
    }
  });

  if (matches.length === 0) {
    results.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px">No results for "' + query.replace(/</g,'&lt;') + '"</div>';
    results.style.display = 'block';
    return;
  }

  results.innerHTML = matches.map(m =>
    `<div class="sr-item" data-tab="${m.tabId}" data-query="${query.replace(/"/g,'&quot;')}" style="padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;font-size:13px;line-height:1.5" onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background='transparent'">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:3px">${m.tabLabel}</div>
      <div style="color:var(--text-muted)">\u2026${m.snippet}\u2026</div>
    </div>`
  ).join('');

  results.style.display = 'block';

  results.querySelectorAll('.sr-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      const q = item.dataset.query;
      currentTab = tabId;
      renderTabs();
      showTab(currentTab);
      setupNavLinks();
      results.style.display = 'none';
      setTimeout(() => highlightInContent(q), 50);
    });
  });
}

function highlightInContent(query) {
  if (!query) return;
  const content = document.querySelector('.phase-content.active');
  if (!content) return;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  let firstMark = null;
  textNodes.forEach(node => {
    const val = node.nodeValue;
    if (!re.test(val)) return;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = re.exec(val)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(val.substring(last, m.index)));
      const mark = document.createElement('mark');
      mark.style.cssText = 'background:var(--accent);color:#fff;padding:0 2px;border-radius:2px';
      mark.setAttribute('data-search-highlight', '1');
      mark.textContent = m[0];
      if (!firstMark) firstMark = mark;
      frag.appendChild(mark);
      last = re.lastIndex;
    }
    if (last < val.length) frag.appendChild(document.createTextNode(val.substring(last)));
    node.parentNode.replaceChild(frag, node);
  });

  if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function openMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  if (overlay) { overlay.classList.add('open'); document.getElementById('mobile-search-input').focus(); }
}

function closeMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  const input = document.getElementById('mobile-search-input');
  const results = document.getElementById('mobile-search-results');
  if (overlay) overlay.classList.remove('open');
  if (input) input.value = '';
  if (results) results.innerHTML = '';
  clearHighlights();
}

function runMobileSearch(query) {
  const results = document.getElementById('mobile-search-results');
  if (!results) return;
  clearHighlights();
  if (query.length < 2) { results.innerHTML = ''; return; }

  const matches = [];
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  document.querySelectorAll('.phase-content').forEach(phaseEl => {
    const tabId = phaseEl.dataset.phase;
    const tabLabel = phaseEl.dataset.label;
    const text = phaseEl.textContent.replace(/\s+/g, ' ');
    let m; const seen = new Set(); re.lastIndex = 0;
    while ((m = re.exec(text)) !== null && matches.length < 30) {
      const start = Math.max(0, m.index - 30);
      const end = Math.min(text.length, m.index + m[0].length + 30);
      let snippet = text.substring(start, end).trim();
      const key = tabId + ':' + snippet.substring(0, 30);
      if (seen.has(key)) continue; seen.add(key);
      snippet = snippet.replace(re, '<strong>$&</strong>');
      matches.push({ tabId, tabLabel, snippet });
    }
  });

  if (matches.length === 0) {
    results.innerHTML = '<div style="padding:16px;color:var(--text-muted)">No results</div>';
    return;
  }

  results.innerHTML = matches.map(m =>
    `<div class="sr-item" data-tab="${m.tabId}" style="cursor:pointer">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:2px">${m.tabLabel}</div>
      <div style="color:var(--text-muted)">…${m.snippet}…</div>
    </div>`
  ).join('');

  results.querySelectorAll('.sr-item').forEach(item => {
    item.addEventListener('click', () => {
      currentTab = item.dataset.tab;
      renderTabs(); showTab(currentTab); setupNavLinks();
      closeMobileSearch();
      setTimeout(() => highlightInContent(query), 50);
    });
  });
}

function clearHighlights() {
  document.querySelectorAll('mark[data-search-highlight]').forEach(mark => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

// ===========================
// RESOURCE TABLE FILTERS
// ===========================
function initResourceFilters() {
  // Find all resource tables: tables that contain tier header rows (FOUNDATIONAL/CORE/RECOMMENDED)
  document.querySelectorAll('.phase-content table').forEach(table => {
    const tierRows = Array.from(table.querySelectorAll('tr')).filter(tr => {
      const cell = tr.querySelector('td[colspan]');
      return cell && /FOUNDATIONAL|CORE|RECOMMENDED/.test(cell.textContent);
    });
    if (tierRows.length === 0) return;

    // Tag each resource row with data-tier and data-type
    let currentTier = '';
    Array.from(table.querySelectorAll('tr')).forEach(tr => {
      // Skip header row
      if (tr.querySelector('th')) return;
      // Check if this is a tier header
      const tierCell = tr.querySelector('td[colspan]');
      if (tierCell && /FOUNDATIONAL|CORE|RECOMMENDED/.test(tierCell.textContent)) {
        if (/FOUNDATIONAL/.test(tierCell.textContent)) currentTier = 'foundational';
        else if (/CORE/.test(tierCell.textContent)) currentTier = 'core';
        else currentTier = 'recommended';
        tr.setAttribute('data-tier-header', currentTier);
        return;
      }
      // Regular resource row
      if (!currentTier) return;
      tr.setAttribute('data-tier', currentTier);
      tr.classList.add('resource-row');
      // Detect type from second cell
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

    // Collect available types for this table
    const types = new Set();
    table.querySelectorAll('.resource-row').forEach(r => {
      const t = r.getAttribute('data-type');
      if (t && t !== 'other') types.add(t);
    });

    // Build filter pills
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

    // Type pills (only if more than 1 type exists)
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

    // Insert filter pills before the table (or before its scroll wrapper)
    const wrapper = table.closest('.table-scroll') || table;
    wrapper.parentNode.insertBefore(filterDiv, wrapper);

    // Wire up filter clicks
    filterDiv.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      const filterType = pill.getAttribute('data-filter');
      // Deactivate siblings, activate clicked
      filterDiv.querySelectorAll(`.filter-pill[data-filter="${filterType}"]`).forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applyResourceFilter(table, filterDiv);
    });
  });
}

function applyResourceFilter(table, filterDiv) {
  const tierVal = filterDiv.querySelector('.filter-pill[data-filter="tier"].active')?.getAttribute('data-val') || 'all';
  const typeVal = filterDiv.querySelector('.filter-pill[data-filter="type"].active')?.getAttribute('data-val') || 'all';

  // Show/hide tier headers
  table.querySelectorAll('tr[data-tier-header]').forEach(tr => {
    const tier = tr.getAttribute('data-tier-header');
    tr.style.display = (tierVal === 'all' || tier === tierVal) ? '' : 'none';
  });

  // Show/hide resource rows
  table.querySelectorAll('.resource-row').forEach(tr => {
    const tier = tr.getAttribute('data-tier');
    const type = tr.getAttribute('data-type');
    const tierMatch = tierVal === 'all' || tier === tierVal;
    const typeMatch = typeVal === 'all' || type === typeVal;
    tr.style.display = (tierMatch && typeMatch) ? '' : 'none';
  });
}

// ===========================
// DOMAIN TIMELINE VIEW
// ===========================
let currentView = 'age';

function initDomainView() {
  // Collect all unique section IDs and their labels across age phases
  const domainMap = new Map(); // id → { label, phases: [{ phaseId, label, tier, content }] }
  const agePhases = ['age-0-1', 'age-1-3', 'age-4-7', 'age-8-10', 'age-11-13', 'age-14-16', 'age-17-18'];

  agePhases.forEach(phaseId => {
    const phaseEl = document.querySelector(`.phase-content[data-phase="${phaseId}"]`);
    if (!phaseEl) return;
    const phaseLabel = phaseEl.dataset.label;
    const programZone = phaseEl.querySelector('.program-elements');
    if (!programZone) return;

    programZone.querySelectorAll('h2[data-tier]').forEach(h2 => {
      const sectionId = h2.id;
      if (!sectionId) return;

      // Get the heading text (strip icon and badge)
      let label = '';
      h2.childNodes.forEach(n => {
        if (n.nodeType === 3) label += n.textContent;
        else if (n.nodeType === 1 && !n.classList.contains('material-symbols-rounded') && !n.classList.contains('tier-badge')) label += n.textContent;
      });
      label = label.trim();

      // Collect content between this h2 and next h2
      const contentEls = [];
      let el = h2.nextElementSibling;
      while (el && el.tagName !== 'H2') {
        contentEls.push(el.outerHTML);
        el = el.nextElementSibling;
      }

      if (!domainMap.has(sectionId)) {
        domainMap.set(sectionId, { label, phases: [] });
      }
      domainMap.get(sectionId).phases.push({
        phaseId,
        phaseLabel: phaseLabel,
        tier: h2.dataset.tier,
        content: contentEls.join('')
      });
    });
  });

  // Populate the select dropdown
  const select = document.getElementById('domain-select');
  if (!select) return;
  // Sort domains by number of phases (most common first)
  const sorted = Array.from(domainMap.entries()).sort((a, b) => b[1].phases.length - a[1].phases.length);
  sorted.forEach(([id, data]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${data.label} (${data.phases.length} phases)`;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => renderDomainTimeline(domainMap, select.value));

  // View toggle
  document.getElementById('view-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    const view = btn.dataset.view;
    if (view === currentView) return;
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

    if (view === 'domain') {
      // Hide age tabs and phase content, show domain view
      document.getElementById('tabs').style.display = 'none';
      document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));
      document.getElementById('domain-view').style.display = 'block';
      if (select.value) renderDomainTimeline(domainMap, select.value);
      else if (select.options.length > 0) { select.selectedIndex = 0; renderDomainTimeline(domainMap, select.value); }
    } else {
      // Restore age view
      document.getElementById('tabs').style.display = '';
      document.getElementById('domain-view').style.display = 'none';
      showTab(currentTab);
      renderTabs();
      setupNavLinks();
    }
  });

  // Store for later use
  window._domainMap = domainMap;
}

function renderDomainTimeline(domainMap, sectionId) {
  const timeline = document.getElementById('domain-timeline');
  const data = domainMap.get(sectionId);
  if (!data) { timeline.innerHTML = ''; return; }

  timeline.innerHTML = data.phases.map(phase => `
    <div class="timeline-phase">
      <div class="timeline-header">
        <span class="timeline-age">${phase.phaseLabel}</span>
        <span class="tier-badge ${phase.tier}">${phase.tier.charAt(0).toUpperCase() + phase.tier.slice(1)}</span>
      </div>
      <div class="timeline-content">${phase.content}</div>
    </div>
  `).join('');

  window.scrollTo(0, 0);
}

// ===========================
// SECTION TIER FILTERS
// ===========================
function initSectionFilters() {
  document.querySelectorAll('.program-elements').forEach(container => {
    const sections = Array.from(container.querySelectorAll('h2[data-tier]'));
    if (!sections.length) return;

    // Add tier badges to headings
    sections.forEach(h2 => {
      const tier = h2.dataset.tier;
      const badge = document.createElement('span');
      badge.className = `tier-badge ${tier}`;
      badge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
      h2.appendChild(badge);
    });

    // Insert filter pills at top of container
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

    // Wire clicks
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
    // Show/hide the h2 and everything until the next h2
    let el = h2;
    while (el) {
      el.style.display = show ? '' : 'none';
      el = el.nextElementSibling;
      if (el && el.tagName === 'H2') break;
    }
  });
}

// Make functions available globally for onclick handlers
window.toggleFloatProfile = toggleFloatProfile;
window.toggleFloatSections = toggleFloatSections;

document.addEventListener('DOMContentLoaded', () => { init(); initSearch(); initResourceFilters(); initSectionFilters(); initDomainView(); });
