import { state } from './state.js';
import { setupTabClicks, renderTabs, showTab, setupProfileToggles, updateAllNavs, wrapTablesForMobile, toggleFloatMenu } from './navigation.js';
import { initSearch, openMobileSearch } from './search.js';
import { initResourceFilters, initSectionFilters } from './filters.js';
import { initDomainView } from './domain.js';
import { initUniverseView } from './universe.js';

function init() {
  setupTabClicks();
  renderTabs();
  showTab(state.currentTab);
  setupProfileToggles();
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

    function findById(container, id) {
      return Array.from(container.querySelectorAll('[id]')).find(el => el.id === id);
    }

    const activePhase = document.querySelector('.phase-content.active');
    if (activePhase) {
      const el = findById(activePhase, targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    const allPhases = document.querySelectorAll('.phase-content');
    for (const phase of allPhases) {
      const el = findById(phase, targetId);
      if (el) {
        state.currentTab = phase.dataset.phase;
        renderTabs();
        showTab(state.currentTab);
        updateAllNavs();
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

document.addEventListener('DOMContentLoaded', () => {
  init();
  initSearch();
  initResourceFilters();
  initSectionFilters();
  initDomainView();
  initUniverseView();
});
