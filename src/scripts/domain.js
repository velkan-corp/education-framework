import { state } from './state.js';
import { applyProfile, getHeadingText, renderTabs, showTab, updateAllNavs } from './navigation.js';

let currentDomain = null;
let domainMap = null;

/* ── Domain map ── */

function buildDomainMap() {
  const map = new Map();
  const agePhases = ['age-0-1', 'age-1-3', 'age-4-7', 'age-8-10', 'age-11-13', 'age-14-16', 'age-17-18'];

  agePhases.forEach(phaseId => {
    const phaseEl = document.querySelector(`.phase-content[data-phase="${phaseId}"]`);
    if (!phaseEl) return;
    const phaseLabel = phaseEl.dataset.label;
    const programZone = phaseEl.querySelector('.program-elements');
    if (!programZone) return;

    programZone.querySelectorAll('h2[data-tier]').forEach(h2 => {
      const sectionId = h2.dataset.anchorBase || h2.id;
      if (!sectionId) return;

      const label = getHeadingText(h2);
      const contentEls = [];
      let el = h2.nextElementSibling;
      while (el && el.tagName !== 'H2') {
        contentEls.push(el.outerHTML);
        el = el.nextElementSibling;
      }

      if (!map.has(sectionId)) {
        map.set(sectionId, { label, phases: [] });
      }
      map.get(sectionId).phases.push({
        phaseId,
        phaseLabel,
        tier: h2.dataset.tier,
        content: contentEls.join('')
      });
    });
  });

  return map;
}

function renderDomainTimeline(sectionId) {
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
}

/* ── Dropdown population ── */

function populateItemDropdown(view) {
  const navItem = document.getElementById('nav-item');
  if (!navItem) return;

  // Save current value to restore if possible
  const prevValue = navItem.value;
  navItem.innerHTML = '';

  if (view === 'age') {
    // Framework + age phases
    const fwOpt = document.createElement('option');
    fwOpt.value = 'framework';
    fwOpt.textContent = 'Framework';
    navItem.appendChild(fwOpt);

    const tabs = document.querySelectorAll('#tabs .tab');
    tabs.forEach(tab => {
      const id = tab.dataset.tab;
      if (id === 'framework') return; // already added
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = tab.textContent.trim();
      navItem.appendChild(opt);
    });

    // Restore selection
    navItem.value = prevValue || state.currentTab || 'framework';
    if (!navItem.value) navItem.value = 'framework';

  } else if (view === 'domain') {
    if (!domainMap) return;
    const sorted = Array.from(domainMap.entries()).sort((a, b) => b[1].phases.length - a[1].phases.length);
    sorted.forEach(([id, data]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = data.label;
      navItem.appendChild(opt);
    });

    // Select first domain or restore
    const firstId = sorted[0]?.[0] || null;
    navItem.value = prevValue && domainMap.has(prevValue) ? prevValue : firstId;

  } else if (view === 'universe') {
    // Framework + All + tag categories
    const universeTabs = document.querySelectorAll('#universe-tabs .tab');
    universeTabs.forEach(tab => {
      const key = tab.dataset.universeTab;
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = tab.textContent.trim();
      navItem.appendChild(opt);
    });

    navItem.value = 'all';
  }
}

/* ── View switching ── */

function switchView(view) {
  if (view === state.currentView) return;
  state.currentView = view;

  // Sync nav-view dropdown
  const navView = document.getElementById('nav-view');
  if (navView) navView.value = view;

  const domainView = document.getElementById('domain-view');
  const universeView = document.getElementById('universe-view');
  const legend = document.querySelector('.universe-legend');

  // Hide all content
  if (domainView) domainView.classList.add('hidden');
  if (universeView) universeView.classList.add('hidden');
  if (legend) legend.classList.add('hidden');
  document.querySelectorAll('.universe-filters').forEach(f => f.classList.add('hidden'));
  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

  // Populate item dropdown for new view
  populateItemDropdown(view);

  if (view === 'domain') {
    if (domainView) domainView.classList.remove('hidden');
    const navItem = document.getElementById('nav-item');
    currentDomain = navItem ? navItem.value : null;
    if (currentDomain) {
      renderDomainTimeline(currentDomain);
      applyProfile();
    }
    updateAllNavs();
  } else if (view === 'universe') {
    if (universeView) universeView.classList.remove('hidden');
    document.querySelectorAll('.universe-filters').forEach(f => f.classList.remove('hidden'));
    if (legend) legend.classList.remove('hidden');
    // Show grid, hide detail
    const grid = document.getElementById('universe-grid');
    const detail = document.getElementById('universe-detail');
    if (grid) grid.classList.remove('hidden');
    if (detail) detail.classList.add('hidden');
    document.querySelectorAll('.universe-card').forEach(c => c.classList.remove('hidden'));
    // Activate "All" tab
    document.querySelectorAll('#universe-tabs .tab').forEach(t => {
      const active = t.dataset.universeTab === 'all';
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    updateAllNavs();
  } else {
    // Age view
    document.querySelector('.phase-content[data-phase="framework"]')?.classList.remove('active');
    showTab(state.currentTab);
    renderTabs();
    updateAllNavs();
  }

  window.scrollTo(0, 0);
}

/* ── Item selection ── */

function handleItemChange(value) {
  const view = state.currentView;

  if (view === 'age') {
    state.currentTab = value;
    showTab(value);
    renderTabs();
    updateAllNavs();
    window.scrollTo(0, 0);

  } else if (view === 'domain') {
    if (value === currentDomain) return;
    currentDomain = value;
    document.querySelector('.phase-content[data-phase="framework"]')?.classList.remove('active');
    document.getElementById('domain-view').classList.remove('hidden');
    renderDomainTimeline(value);
    applyProfile();
    updateAllNavs();
    window.scrollTo(0, 0);

  } else if (view === 'universe') {
    // Simulate tab click on the hidden universe tabs
    const tab = document.querySelector(`#universe-tabs .tab[data-universe-tab="${value}"]`);
    if (tab) tab.click();
  }
}

/* ── Init ── */

export function initDomainView() {
  domainMap = buildDomainMap();
  window._domainMap = domainMap;

  // Still build domain tabs in hidden element (for data/JS hooks)
  const domainTabsEl = document.getElementById('domain-tabs');
  if (domainTabsEl) {
    const sorted = Array.from(domainMap.entries()).sort((a, b) => b[1].phases.length - a[1].phases.length);
    sorted.forEach(([id, data]) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tab';
      tab.dataset.domain = id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'false');
      tab.textContent = data.label;
      domainTabsEl.appendChild(tab);
    });
  }

  // Populate initial item dropdown (Age view)
  populateItemDropdown('age');

  // View dropdown handler
  const navView = document.getElementById('nav-view');
  if (navView) {
    navView.addEventListener('change', (e) => {
      switchView(e.target.value);
    });
  }

  // Item dropdown handler
  const navItem = document.getElementById('nav-item');
  if (navItem) {
    navItem.addEventListener('change', (e) => {
      handleItemChange(e.target.value);
    });
  }
}
