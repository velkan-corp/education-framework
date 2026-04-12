import { state } from './state.js';
import { applyProfile, getHeadingText, showTab, updateAllNavs } from './navigation.js';

let domainMap = null;
let currentDomain = null;

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
        phaseId, phaseLabel,
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

/* ── Populate domain dropdown in nav ── */

function populateDomainDropdowns() {
  if (!domainMap) return;
  const sorted = Array.from(domainMap.entries()).sort((a, b) => b[1].phases.length - a[1].phases.length);

  // Desktop dropdown
  const desktop = document.getElementById('nav-domain-dropdown');
  if (desktop) {
    desktop.innerHTML = sorted.map(([id, data]) =>
      `<button type="button" class="nav-dropdown-item" role="menuitem" data-domain="${id}">${data.label}</button>`
    ).join('');
  }

  // Mobile items
  const mobile = document.getElementById('mobile-domain-items');
  if (mobile) {
    mobile.innerHTML = sorted.map(([id, data]) =>
      `<button type="button" class="mobile-menu-item mobile-menu-sub" data-view="domain" data-domain="${id}">${data.label}</button>`
    ).join('');
  }
}

/* ── View management ── */

function hideAllViews() {
  document.querySelectorAll('.phase-content').forEach(el => el.classList.remove('active'));
  document.getElementById('domain-view')?.classList.add('hidden');
  document.getElementById('universe-view')?.classList.add('hidden');
  document.getElementById('home-view')?.classList.add('hidden');
  document.querySelectorAll('.universe-filters').forEach(f => f.classList.add('hidden'));
  document.querySelector('.universe-legend')?.classList.add('hidden');
}

function setActiveNavItem(view) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  // Close any open dropdowns
  document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.nav-item[aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false'));
}

export function showView(view, options = {}) {
  state.currentView = view;
  hideAllViews();
  setActiveNavItem(view);

  // Close mobile menu
  const mobileMenu = document.getElementById('mobile-menu');
  const hamburger = document.getElementById('nav-hamburger');
  if (mobileMenu) mobileMenu.classList.add('hidden');
  if (hamburger) hamburger.classList.remove('open');

  if (view === 'home') {
    document.getElementById('home-view')?.classList.remove('hidden');
    document.getElementById('home-view').style.display = '';
  } else if (view === 'framework') {
    state.currentTab = 'framework';
    showTab('framework');
  } else if (view === 'age') {
    const phaseId = options.phaseId || (window.__phaseData?.[0]?.id) || 'age-0-1';
    state.currentTab = phaseId;
    showTab(phaseId);
  } else if (view === 'domain') {
    const domainId = options.domainId || (domainMap ? Array.from(domainMap.keys())[0] : null);
    if (!domainId) return;
    currentDomain = domainId;
    const data = domainMap.get(domainId);

    document.getElementById('domain-view')?.classList.remove('hidden');
    document.getElementById('domain-title').textContent = data ? data.label : '';
    document.getElementById('domain-description').textContent = 'Tracking this domain across all age brackets — from earliest foundations to 17-18 synthesis.';
    renderDomainTimeline(domainId);
    applyProfile();

    // Highlight active domain item
    document.querySelectorAll('.nav-dropdown-item[data-domain]').forEach(item => {
      item.classList.toggle('active', item.dataset.domain === domainId);
    });
  } else if (view === 'universe') {
    document.getElementById('universe-view')?.classList.remove('hidden');
    document.querySelectorAll('.universe-filters').forEach(f => f.classList.remove('hidden'));
    document.querySelector('.universe-legend')?.classList.remove('hidden');
    const grid = document.getElementById('universe-grid');
    const detail = document.getElementById('universe-detail');
    if (grid) grid.classList.remove('hidden');
    if (detail) detail.classList.add('hidden');

    // Show specific universe detail if requested
    if (options.showDetail) {
      const detailEl = document.getElementById('universe-detail');
      if (detailEl) {
        grid.classList.add('hidden');
        detailEl.classList.remove('hidden');
        detailEl.querySelectorAll('.universe-timeline').forEach(el => {
          el.classList.toggle('hidden', el.dataset.universeDetail !== options.showDetail);
        });
        document.querySelectorAll('.universe-filters').forEach(f => f.classList.add('hidden'));
        document.querySelector('.universe-legend')?.classList.add('hidden');
      }
    } else {
      // Apply type filter if provided
      const filter = options.filter || 'all';
      document.querySelectorAll('.universe-card').forEach(card => {
        if (filter === 'all') {
          card.classList.remove('hidden');
        } else {
          const tags = (card.dataset.tags || '').split(',');
          card.classList.toggle('hidden', !tags.includes(filter));
        }
      });
    }
  }

  updateAllNavs();
  window.scrollTo(0, 0);
}

/* ── Event handlers ── */

function setupNavigation() {
  // Desktop nav items
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      const view = item.dataset.view;

      // If it's a dropdown trigger, toggle the dropdown instead
      const wrap = item.closest('.nav-dropdown-wrap');
      if (wrap) {
        const dropdown = wrap.querySelector('.nav-dropdown');
        const isOpen = dropdown.classList.contains('open');

        // Close all dropdowns first
        document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
        document.querySelectorAll('.nav-item[aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false'));

        if (!isOpen) {
          dropdown.classList.add('open');
          item.setAttribute('aria-expanded', 'true');
        }
        return;
      }

      showView(view);
    });
  });

  // Desktop dropdown items — age phases
  document.querySelectorAll('.nav-dropdown-item[data-phase]').forEach(item => {
    item.addEventListener('click', () => {
      showView('age', { phaseId: item.dataset.phase });
    });
  });

  // Desktop dropdown items — domains (delegated since they're dynamic)
  document.getElementById('nav-domain-dropdown')?.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-dropdown-item[data-domain]');
    if (!item) return;
    showView('domain', { domainId: item.dataset.domain });
  });

  // Desktop dropdown items — universe type filter
  document.getElementById('nav-universe-dropdown')?.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-dropdown-item[data-universe-filter]');
    if (!item) return;
    showView('universe', { filter: item.dataset.universeFilter });
    // Highlight active filter
    document.querySelectorAll('#nav-universe-dropdown .nav-dropdown-item').forEach(i => {
      i.classList.toggle('active', i === item);
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown-wrap')) {
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
      document.querySelectorAll('.nav-item[aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }
  });

  // Logo → Home
  document.getElementById('nav-home')?.addEventListener('click', () => showView('home'));

  // Model tracker tooltips — tap to toggle on mobile
  document.addEventListener('click', (e) => {
    const dot = e.target.closest('.model-dot');
    if (!dot) {
      document.querySelectorAll('.model-dot.tooltip-visible').forEach(d => d.classList.remove('tooltip-visible'));
      return;
    }
    const wasVisible = dot.classList.contains('tooltip-visible');
    document.querySelectorAll('.model-dot.tooltip-visible').forEach(d => d.classList.remove('tooltip-visible'));
    if (!wasVisible) dot.classList.add('tooltip-visible');
  });

  // Universe navigation from phase cards
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-universe-nav]');
    if (!link) return;
    const universeId = link.dataset.universeNav;
    showView('universe', { showDetail: universeId });
  });

  // Language switcher
  const langSwitch = document.getElementById('lang-switch');
  const langSwitchMobile = document.getElementById('lang-switch-mobile');
  if (langSwitch || langSwitchMobile) {
    const isSpanish = window.location.pathname.includes('/es/');
    const targetHref = isSpanish
      ? window.location.pathname.replace('/es/', '/').replace('/es', '/')
      : window.location.pathname.replace(/\/$/, '') + '/../es/';
    const base = document.querySelector('link[rel="icon"]')?.href?.match(/(.*)\/favicon/)?.[1] || '';
    const switchUrl = isSpanish
      ? base + '/'
      : base + '/es/';
    const label = isSpanish ? 'EN' : 'ES';

    if (langSwitch) {
      langSwitch.href = switchUrl;
      langSwitch.querySelector('.lang-switch-label').textContent = label;
    }
    if (langSwitchMobile) {
      langSwitchMobile.href = switchUrl;
      langSwitchMobile.textContent = isSpanish ? 'English' : 'Español';
    }
  }

  // Home cards
  document.querySelectorAll('.home-card[data-nav]').forEach(card => {
    card.addEventListener('click', () => {
      const nav = card.dataset.nav;
      if (nav === 'framework') showView('framework');
      else if (nav === 'age') showView('age');
      else if (nav === 'domain') showView('domain');
      else if (nav === 'universe') showView('universe');
    });
  });

  // Hamburger toggle
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = !mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden', isOpen);
      hamburger.classList.toggle('open', !isOpen);
      hamburger.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  // Mobile menu items (delegated)
  mobileMenu?.addEventListener('click', (e) => {
    const item = e.target.closest('.mobile-menu-item');
    if (!item) return;
    const view = item.dataset.view;
    if (view === 'age' && item.dataset.phase) {
      showView('age', { phaseId: item.dataset.phase });
    } else if (view === 'domain' && item.dataset.domain) {
      showView('domain', { domainId: item.dataset.domain });
    } else if (view === 'universe' && item.dataset.universeFilter) {
      showView('universe', { filter: item.dataset.universeFilter });
    } else if (view) {
      showView(view);
    }
  });
}

/* ── Init ── */

export function initDomainView() {
  domainMap = buildDomainMap();
  window._domainMap = domainMap;

  populateDomainDropdowns();
  setupNavigation();

  // Start with Home view
  showView('home');
}
