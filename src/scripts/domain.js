import { state } from './state.js';
import { applyProfile, getHeadingText, renderTabs, showTab, updateAllNavs } from './navigation.js';

let currentDomain = null;
let domainMap = null;

const VIEW_DESCRIPTIONS = {
  age: 'Each age bracket covers developmental priorities, activities, mental models, and content for that stage.',
  domain: 'Track a single domain (e.g., Music, Communication) across all age brackets to see how it progresses over time.',
  universe: 'Browse the content library: books, films, games, maker systems, and literary canons that drive the framework.'
};

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

/* ── View title + description ── */

function updateViewHeader(view, itemLabel) {
  let titleEl = document.getElementById('view-title');
  let descEl = document.getElementById('view-description');

  if (!titleEl) {
    // Create title element if it doesn't exist
    const content = document.querySelector('.content');
    if (!content) return;
    const header = document.createElement('div');
    header.id = 'view-header';
    header.innerHTML = '<h1 id="view-title"></h1><p id="view-description" class="subtitle"></p>';
    content.prepend(header);
    titleEl = document.getElementById('view-title');
    descEl = document.getElementById('view-description');
  }

  const headerEl = document.getElementById('view-header');
  if (view === 'age') {
    // Age view has its own titles in the phase content
    if (headerEl) headerEl.style.display = 'none';
  } else {
    if (headerEl) headerEl.style.display = 'block';
    titleEl.textContent = itemLabel || '';
    descEl.textContent = VIEW_DESCRIPTIONS[view] || '';
  }
}

/* ── Dropdown population ── */

function populateItemDropdown(view) {
  const navItem = document.getElementById('nav-item');
  if (!navItem) return;

  const prevValue = navItem.value;
  navItem.innerHTML = '';

  if (view === 'age') {
    const phases = window.__phaseData || [];
    phases.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      navItem.appendChild(opt);
    });
    navItem.value = prevValue || state.currentTab || (phases[0] && phases[0].id);

  } else if (view === 'domain') {
    if (!domainMap) return;
    const sorted = Array.from(domainMap.entries()).sort((a, b) => b[1].phases.length - a[1].phases.length);
    sorted.forEach(([id, data]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = data.label;
      navItem.appendChild(opt);
    });
    const firstId = sorted[0]?.[0] || null;
    navItem.value = (prevValue && domainMap.has(prevValue)) ? prevValue : firstId;

  } else if (view === 'universe') {
    const uniTabs = window.__universeTabData || [];
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All';
    navItem.appendChild(allOpt);
    uniTabs.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.key;
      opt.textContent = t.label;
      navItem.appendChild(opt);
    });
    navItem.value = 'all';
  }
}

/* ── Framework (home) ── */

function showFramework() {
  state.currentView = 'age';
  state.currentTab = 'framework';

  // Reset both dropdowns to placeholder state
  const navView = document.getElementById('nav-view');
  const navItem = document.getElementById('nav-item');
  if (navView) navView.value = '';
  if (navItem) {
    navItem.innerHTML = '<option value="" disabled selected>Select...</option>';
    navItem.disabled = true;
  }

  // Hide domain/universe views
  const domainView = document.getElementById('domain-view');
  const universeView = document.getElementById('universe-view');
  const legend = document.querySelector('.universe-legend');
  if (domainView) domainView.classList.add('hidden');
  if (universeView) universeView.classList.add('hidden');
  if (legend) legend.classList.add('hidden');
  document.querySelectorAll('.universe-filters').forEach(f => f.classList.add('hidden'));

  // Show framework phase
  document.querySelectorAll('.phase-content').forEach(el => {
    el.classList.toggle('active', el.dataset.phase === 'framework');
  });

  // Highlight logo
  const logo = document.getElementById('nav-home');
  if (logo) logo.classList.add('active');

  updateViewHeader('age', null);
  applyProfile();
  updateAllNavs();
  window.scrollTo(0, 0);
}

/* ── View switching ── */

function switchView(view) {
  state.currentView = view;

  const navView = document.getElementById('nav-view');
  if (navView) navView.value = view;

  // Remove logo active state
  const logo = document.getElementById('nav-home');
  if (logo) logo.classList.remove('active');

  const domainView = document.getElementById('domain-view');
  const universeView = document.getElementById('universe-view');
  const legend = document.querySelector('.universe-legend');

  // Hide all content
  if (domainView) domainView.classList.add('hidden');
  if (universeView) universeView.classList.add('hidden');
  if (legend) legend.classList.add('hidden');
  document.querySelectorAll('.universe-filters').forEach(f => f.classList.add('hidden'));
  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));

  // Populate and enable item dropdown
  const navItem = document.getElementById('nav-item');
  if (navItem) navItem.disabled = false;
  populateItemDropdown(view);
  const selectedValue = navItem ? navItem.value : null;

  if (view === 'domain') {
    if (domainView) domainView.classList.remove('hidden');
    currentDomain = selectedValue;
    if (currentDomain) {
      const data = domainMap.get(currentDomain);
      updateViewHeader('domain', data ? data.label : '');
      renderDomainTimeline(currentDomain);
      applyProfile();
    }
    updateAllNavs();
  } else if (view === 'universe') {
    if (universeView) universeView.classList.remove('hidden');
    document.querySelectorAll('.universe-filters').forEach(f => f.classList.remove('hidden'));
    if (legend) legend.classList.remove('hidden');
    const grid = document.getElementById('universe-grid');
    const detail = document.getElementById('universe-detail');
    if (grid) grid.classList.remove('hidden');
    if (detail) detail.classList.add('hidden');
    document.querySelectorAll('.universe-card').forEach(c => c.classList.remove('hidden'));
    updateViewHeader('universe', 'Content Library');
    updateAllNavs();
  } else {
    // Age view — show first age phase (not framework)
    const firstPhase = (window.__phaseData || [])[0];
    if (selectedValue) {
      state.currentTab = selectedValue;
    } else if (firstPhase) {
      state.currentTab = firstPhase.id;
      if (navItem) navItem.value = firstPhase.id;
    }
    showTab(state.currentTab);
    updateViewHeader('age', null);
    updateAllNavs();
  }

  window.scrollTo(0, 0);
}

/* ── Item selection ── */

function handleItemChange(value) {
  const view = state.currentView;

  // Remove logo active state
  const logo = document.getElementById('nav-home');
  if (logo) logo.classList.remove('active');

  if (view === 'age') {
    state.currentTab = value;
    showTab(value);
    updateViewHeader('age', null);
    updateAllNavs();
    window.scrollTo(0, 0);

  } else if (view === 'domain') {
    if (value === currentDomain) return;
    currentDomain = value;
    document.querySelector('.phase-content[data-phase="framework"]')?.classList.remove('active');
    document.getElementById('domain-view').classList.remove('hidden');
    const data = domainMap.get(value);
    updateViewHeader('domain', data ? data.label : '');
    renderDomainTimeline(value);
    applyProfile();
    updateAllNavs();
    window.scrollTo(0, 0);

  } else if (view === 'universe') {
    // Filter universe cards by category
    const grid = document.getElementById('universe-grid');
    const detail = document.getElementById('universe-detail');
    if (grid) grid.classList.remove('hidden');
    if (detail) detail.classList.add('hidden');

    document.querySelectorAll('.universe-card').forEach(card => {
      if (value === 'all') {
        card.classList.remove('hidden');
      } else {
        const tags = (card.dataset.tags || '').split(',');
        card.classList.toggle('hidden', !tags.includes(value));
      }
    });

    updateViewHeader('universe', 'Content Library');
  }
}

/* ── Init ── */

export function initDomainView() {
  domainMap = buildDomainMap();
  window._domainMap = domainMap;

  // Home button
  const homeBtn = document.getElementById('nav-home');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => showFramework());
  }

  // Show framework on load
  showFramework();

  // View dropdown handler
  const navView = document.getElementById('nav-view');
  if (navView) {
    navView.addEventListener('change', (e) => switchView(e.target.value));
  }

  // Item dropdown handler
  const navItem = document.getElementById('nav-item');
  if (navItem) {
    navItem.addEventListener('change', (e) => handleItemChange(e.target.value));
  }
}
