import { state } from './state.js';
import { applyProfile, getHeadingText, renderTabs, showTab, updateAllNavs } from './navigation.js';

let currentDomain = null;

function activateFrameworkTab(domainTabsEl) {
  domainTabsEl.querySelectorAll('.tab').forEach(t => {
    const active = t.dataset.domain === 'framework';
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
  });
  currentDomain = 'framework';
  document.getElementById('domain-view').classList.add('hidden');
  document.querySelector('.phase-content[data-phase="framework"]').classList.add('active');
  updateAllNavs();
  window.scrollTo(0, 0);
}

function activateDomainTab(domainTabsEl, domainMap, domainId) {
  document.querySelector('.phase-content[data-phase="framework"]')?.classList.remove('active');
  document.getElementById('domain-view').classList.remove('hidden');
  domainTabsEl.querySelectorAll('.tab').forEach(t => {
    const active = t.dataset.domain === domainId;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
  });
  currentDomain = domainId;
  renderDomainTimeline(domainMap, domainId);
  applyProfile();
  updateAllNavs();
  window.scrollTo(0, 0);
}

function buildDomainMap() {
  const domainMap = new Map();
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

  return domainMap;
}

function populateDomainTabs(domainTabsEl, domainMap) {
  const frameworkTab = document.createElement('button');
  frameworkTab.type = 'button';
  frameworkTab.className = 'tab';
  frameworkTab.dataset.domain = 'framework';
  frameworkTab.setAttribute('role', 'tab');
  frameworkTab.setAttribute('aria-selected', 'false');
  frameworkTab.textContent = 'Framework';
  domainTabsEl.appendChild(frameworkTab);

  const sorted = Array.from(domainMap.entries()).sort((a, b) => b[1].phases.length - a[1].phases.length);
  const firstDomainId = sorted[0]?.[0] || null;
  sorted.forEach(([id, data], i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tab' + (i === 0 ? ' active' : '');
    tab.dataset.domain = id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    tab.innerHTML = data.label.replace(' & ', '<br>& ');
    domainTabsEl.appendChild(tab);
  });

  return firstDomainId;
}

function setupDomainHandlers(domainTabsEl, domainMap, firstDomainId) {
  domainTabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    const domainId = tab.dataset.domain;
    if (domainId === currentDomain) return;

    if (domainId === 'framework') {
      activateFrameworkTab(domainTabsEl);
    } else {
      activateDomainTab(domainTabsEl, domainMap, domainId);
    }
  });

  function switchView(view) {
    if (view === state.currentView) return;
    state.currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => {
      const active = b.dataset.view === view;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    const viewSelect = document.getElementById('view-select');
    if (viewSelect) viewSelect.value = view;

    const tabsEl = document.getElementById('tabs');
    const universeTabs = document.getElementById('universe-tabs');
    const domainView = document.getElementById('domain-view');
    const universeView = document.getElementById('universe-view');
    const legend = document.querySelector('.universe-legend');

    // Hide everything first
    tabsEl.classList.add('hidden');
    domainTabsEl.classList.add('hidden');
    if (universeTabs) universeTabs.classList.add('hidden');
    domainView.classList.add('hidden');
    if (universeView) universeView.classList.add('hidden');
    if (legend) legend.classList.add('hidden');
    document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

    if (view === 'domain') {
      domainTabsEl.classList.remove('hidden');
      domainView.classList.remove('hidden');
      currentDomain = firstDomainId;
      domainTabsEl.querySelectorAll('.tab').forEach(t => {
        const active = t.dataset.domain === firstDomainId;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
      });
      renderDomainTimeline(domainMap, currentDomain);
      applyProfile();
      updateAllNavs();
    } else if (view === 'universe') {
      if (universeTabs) universeTabs.classList.remove('hidden');
      if (universeView) universeView.classList.remove('hidden');
      document.querySelectorAll('.universe-filters').forEach((filterRow) => filterRow.classList.remove('hidden'));
      if (legend) legend.classList.remove('hidden');
      // Reset to "All" tab
      if (universeTabs) {
        universeTabs.querySelectorAll('.tab').forEach(t => {
          const active = t.dataset.universeTab === 'all';
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', String(active));
        });
      }
      // Show grid, hide detail
      const grid = document.getElementById('universe-grid');
      const detail = document.getElementById('universe-detail');
      if (grid) grid.classList.remove('hidden');
      if (detail) detail.classList.add('hidden');
      document.querySelectorAll('.universe-card').forEach(c => c.classList.remove('hidden'));
      updateAllNavs();
    } else {
      tabsEl.classList.remove('hidden');
      document.querySelector('.phase-content[data-phase="framework"]')?.classList.remove('active');
      showTab(state.currentTab);
      renderTabs();
      updateAllNavs();
    }
  }

  // Desktop: button clicks
  document.getElementById('view-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    switchView(btn.dataset.view);
  });

  // Mobile: dropdown
  const viewSelect = document.getElementById('view-select');
  if (viewSelect) {
    viewSelect.addEventListener('change', (e) => {
      switchView(e.target.value);
    });
  }
}

export function initDomainView() {
  const domainMap = buildDomainMap();
  const domainTabsEl = document.getElementById('domain-tabs');
  if (!domainTabsEl) return;

  const firstDomainId = populateDomainTabs(domainTabsEl, domainMap);
  currentDomain = firstDomainId;
  setupDomainHandlers(domainTabsEl, domainMap, firstDomainId);

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
}
