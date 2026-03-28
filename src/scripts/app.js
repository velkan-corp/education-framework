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

  // FAB click handlers
  document.getElementById('fab-profile').addEventListener('click', toggleFloatProfile);
  document.getElementById('fab-sections').addEventListener('click', toggleFloatSections);

  // Search icon focus
  document.getElementById('search-icon').addEventListener('click', () => {
    const input = document.getElementById('search-input');
    input.focus();
    input.style.width = '160px';
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

  // Handle anchor links — search active phase first (ids like #s-resources repeat across phases)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    e.preventDefault();
    const targetId = link.getAttribute('href').slice(1);
    const escaped = CSS.escape(targetId);

    // 1. Try the active phase first
    const activePhase = document.querySelector('.phase-content.active');
    if (activePhase) {
      const el = activePhase.querySelector('#' + escaped);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    // 2. Search all phases — switch tab if found elsewhere
    const allPhases = document.querySelectorAll('.phase-content');
    for (const phase of allPhases) {
      const el = phase.querySelector('#' + escaped);
      if (el) {
        currentTab = phase.dataset.phase;
        renderTabs();
        showTab(currentTab);
        setupNavLinks();
        setTimeout(() => {
          const found = document.querySelector('.phase-content.active #' + escaped);
          if (found) found.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        return;
      }
    }
  });
}

function toggleFloatProfile() {
  const panel = document.getElementById('float-profile');
  const wasOpen = panel.classList.contains('open');
  document.getElementById('float-sections').classList.remove('open');
  panel.classList.toggle('open', !wasOpen);
}

function toggleFloatSections() {
  const panel = document.getElementById('float-sections');
  const wasOpen = panel.classList.contains('open');
  document.getElementById('float-profile').classList.remove('open');
  panel.classList.toggle('open', !wasOpen);
}

function getHeadingText(h) {
  // Strip material-symbols-rounded icon text from heading
  let text = '';
  h.childNodes.forEach(n => {
    if (n.nodeType === 3) text += n.textContent;
    else if (n.nodeType === 1 && !n.classList.contains('material-symbols-rounded')) text += n.textContent;
  });
  return text.trim();
}

function updateFloatSections() {
  const panel = document.getElementById('float-sections');
  const activeContent = document.querySelector('.phase-content.active');
  if (!activeContent) return;
  const headings = activeContent.querySelectorAll('h2[id]');
  panel.innerHTML = '<div class="profile-float-title">Sections</div>' +
    Array.from(headings).map(h =>
      `<div class="float-nav-link" data-target="${h.id}">${getHeadingText(h)}</div>`
    ).join('');
  panel.querySelectorAll('.float-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const active = document.querySelector('.phase-content.active');
      const target = active && active.querySelector('#' + CSS.escape(link.dataset.target));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const headings = activeContent.querySelectorAll('h2[id]');
  navEl.innerHTML = '<div class="sidebar-title" style="margin-top:0">Sections</div>' +
    Array.from(headings).map(h =>
      `<div class="nav-link" data-target="${h.id}">${getHeadingText(h)}</div>`
    ).join('');
  navEl.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const active = document.querySelector('.phase-content.active');
      const target = active && active.querySelector('#' + CSS.escape(link.dataset.target));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    if (!e.target.closest('#float-profile') && !e.target.closest('#fab-profile')) {
      document.getElementById('float-profile').classList.remove('open');
    }
    if (!e.target.closest('#float-sections') && !e.target.closest('#fab-sections')) {
      document.getElementById('float-sections').classList.remove('open');
    }
  });

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

function clearHighlights() {
  document.querySelectorAll('mark[data-search-highlight]').forEach(mark => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

// Make functions available globally for onclick handlers
window.toggleFloatProfile = toggleFloatProfile;
window.toggleFloatSections = toggleFloatSections;

document.addEventListener('DOMContentLoaded', () => { init(); initSearch(); });
