import { state } from './state.js';
import { setupTabClicks, renderTabs, showTab, setupProfileToggles, setupCollapsibleSections, updateAllNavs, wrapTablesForMobile, toggleFloatMenu } from './navigation.js';
import { initSearch, openMobileSearch } from './search.js';
import { initResourceFilters, initSectionFilters } from './filters.js';
import { initDomainView } from './domain.js';
import { initUniverseView } from './universe.js';

function findByAnchorBase(container, targetId) {
  if (!container) return null;
  return Array.from(container.querySelectorAll('[data-anchor-base]')).find((el) => el.dataset.anchorBase === targetId) ?? null;
}

function scopePhaseAnchors() {
  document.querySelectorAll('.phase-content').forEach((phaseEl) => {
    const phaseId = phaseEl.dataset.phase;
    if (!phaseId) return;

    const anchorMap = new Map();

    phaseEl.querySelectorAll('[id]').forEach((el) => {
      if (el.dataset.anchorBase) return;

      const baseId = el.id;
      if (!baseId) return;

      const scopedId = `${phaseId}-${baseId}`;
      el.dataset.anchorBase = baseId;
      el.id = scopedId;
      anchorMap.set(baseId, scopedId);
    });

    phaseEl.querySelectorAll('a[href^="#"]').forEach((link) => {
      if (link.dataset.anchorScoped === 'true') return;

      const href = link.getAttribute('href');
      if (!href) return;

      const baseId = href.slice(1);
      const scopedId = anchorMap.get(baseId);
      if (!scopedId) return;

      link.dataset.anchorBase = baseId;
      link.dataset.anchorScoped = 'true';
      link.setAttribute('href', `#${scopedId}`);
    });
  });
}

function findAnchorTarget(targetId) {
  if (!targetId) return null;

  const direct = document.getElementById(targetId);
  if (direct) return direct;

  const activePhase = document.querySelector('.phase-content.active');
  const activeFallback = findByAnchorBase(activePhase, targetId);
  if (activeFallback) return activeFallback;

  const allPhases = document.querySelectorAll('.phase-content');
  for (const phaseEl of allPhases) {
    const match = findByAnchorBase(phaseEl, targetId);
    if (match) return match;
  }

  return null;
}

function navigateToAnchor(targetId) {
  const target = findAnchorTarget(targetId);
  if (!target) return false;

  const scrollToTarget = () => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.hash !== `#${target.id}`) {
      window.history.replaceState(null, '', `#${target.id}`);
    }
  };

  const phaseEl = target.closest('.phase-content');
  if (phaseEl && !phaseEl.classList.contains('active')) {
    state.currentTab = phaseEl.dataset.phase;
    renderTabs();
    showTab(state.currentTab);
    updateAllNavs();
    window.setTimeout(scrollToTarget, 50);
    return true;
  }

  scrollToTarget();
  return true;
}

function init() {
  scopePhaseAnchors();
  setupTabClicks();
  renderTabs();
  showTab(state.currentTab);
  setupProfileToggles();
  setupCollapsibleSections();
  updateAllNavs();
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
      if (tip) {
        const open = tip.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      }
      return;
    }
  });

  // Handle internal anchor links across phase-scoped content.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    e.preventDefault();
    navigateToAnchor(href.slice(1));
  });

  if (window.location.hash) {
    navigateToAnchor(window.location.hash.slice(1));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  initSearch();
  initResourceFilters();
  initSectionFilters();
  initDomainView();
  initUniverseView();
});
