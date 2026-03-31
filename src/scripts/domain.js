import { state } from './state.js';
import { applyProfile, getHeadingText, renderTabs, showTab, updateAllNavs } from './navigation.js';

let currentDomain = null;

function activateFrameworkTab(domainTabsEl) {
  domainTabsEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.domain === 'framework'));
  currentDomain = 'framework';
  document.getElementById('domain-view').classList.add('hidden');
  document.querySelector('.phase-content[data-phase="framework"]').classList.add('active');
  updateAllNavs();
  window.scrollTo(0, 0);
}

function activateDomainTab(domainTabsEl, domainMap, domainId) {
  document.querySelector('.phase-content[data-phase="framework"]')?.classList.remove('active');
  document.getElementById('domain-view').classList.remove('hidden');
  domainTabsEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.domain === domainId));
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
      const sectionId = h2.id;
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
  const frameworkTab = document.createElement('div');
  frameworkTab.className = 'tab';
  frameworkTab.dataset.domain = 'framework';
  frameworkTab.textContent = 'Framework';
  domainTabsEl.appendChild(frameworkTab);

  const sorted = Array.from(domainMap.entries()).sort((a, b) => b[1].phases.length - a[1].phases.length);
  const firstDomainId = sorted[0]?.[0] || null;
  sorted.forEach(([id, data], i) => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (i === 0 ? ' active' : '');
    tab.dataset.domain = id;
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

  document.getElementById('view-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    const view = btn.dataset.view;
    if (view === state.currentView) return;
    state.currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

    const tabsEl = document.getElementById('tabs');
    const domainView = document.getElementById('domain-view');

    if (view === 'domain') {
      tabsEl.classList.add('hidden');
      domainTabsEl.classList.remove('hidden');
      document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));
      domainView.classList.remove('hidden');
      currentDomain = firstDomainId;
      domainTabsEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.domain === firstDomainId));
      renderDomainTimeline(domainMap, currentDomain);
      applyProfile();
      updateAllNavs();
    } else {
      domainTabsEl.classList.add('hidden');
      tabsEl.classList.remove('hidden');
      domainView.classList.add('hidden');
      document.querySelector('.phase-content[data-phase="framework"]')?.classList.remove('active');
      showTab(state.currentTab);
      renderTabs();
      updateAllNavs();
    }
  });
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
