import { state } from './state.js';

export function getHeadingText(h) {
  let text = '';
  h.childNodes.forEach(n => {
    if (n.nodeType === 3) text += n.textContent;
    else if (n.nodeType === 1 && !n.classList.contains('material-symbols-rounded') && !n.classList.contains('tier-badge')) text += n.textContent;
  });
  return text.trim();
}

function buildSectionNav(containerEl, entries, options = {}) {
  const { linkClass = 'nav-link', titleClass = 'sidebar-title', titleStyle = '', onClickExtra = null } = options;
  containerEl.innerHTML = `<div class="${titleClass}"${titleStyle ? ` style="${titleStyle}"` : ''}>Sections</div>` +
    entries.map(e => `<div class="${linkClass}">${e.label}</div>`).join('');
  containerEl.querySelectorAll(`.${linkClass}`).forEach((link, i) => {
    link.addEventListener('click', () => {
      entries[i].scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (onClickExtra) onClickExtra();
    });
  });
}

function getNavEntries() {
  if (state.currentView === 'domain') {
    const timeline = document.getElementById('domain-timeline');
    if (!timeline) return [];
    const phases = Array.from(timeline.querySelectorAll('.timeline-phase'));
    return phases.map(p => ({
      label: p.querySelector('.timeline-age').textContent.trim(),
      scrollTarget: p
    }));
  }
  const activeContent = document.querySelector('.phase-content.active');
  if (!activeContent) return [];
  const headings = Array.from(activeContent.querySelectorAll('h2[id]'));
  return headings.map(h => ({
    label: getHeadingText(h),
    scrollTarget: h
  }));
}

export function updateAllNavs() {
  const entries = getNavEntries();
  const navEl = document.getElementById('nav-links');
  if (navEl) {
    buildSectionNav(navEl, entries, { linkClass: 'nav-link', titleClass: 'sidebar-title', titleStyle: 'margin-top:0' });
  }
  const floatEl = document.getElementById('float-menu-sections');
  if (floatEl) {
    buildSectionNav(floatEl, entries, {
      linkClass: 'float-nav-link',
      titleClass: 'profile-float-title',
      onClickExtra: () => document.getElementById('float-menu').classList.remove('open')
    });
  }
}

export function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === state.currentTab);
  });
}

export function setupTabClicks() {
  document.getElementById('tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    state.currentTab = tab.dataset.tab;
    renderTabs();
    showTab(state.currentTab);
    updateAllNavs();
    window.scrollTo(0, 0);
  });
}

export function showTab(tabId) {
  document.querySelectorAll('.phase-content').forEach(el => {
    el.classList.toggle('active', el.dataset.phase === tabId);
  });
  applyProfile();
  wrapTablesForMobile();
  updateAllNavs();
}

export function toggleFloatMenu() {
  const panel = document.getElementById('float-menu');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) updateAllNavs();
}

export function wrapTablesForMobile() {
  document.querySelectorAll('.phase-content table').forEach(table => {
    if (!table.parentElement.classList.contains('table-scroll')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
}

export function setupProfileToggles() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.radio-btn');
    if (!btn) return;
    const group = btn.closest('.radio-group');
    if (!group) return;
    e.stopPropagation();
    const dim = group.dataset.dim;
    const val = btn.dataset.val;
    state.profile[dim] = val;
    document.querySelectorAll(`.radio-group[data-dim="${dim}"] .radio-btn`).forEach(b => {
      b.classList.toggle('active', b.dataset.val === val);
    });
    applyProfile();
    updateFabIndicator();
  });
}

export function applyProfile() {
  const classMap = {
    energy: { introvert: 't-introvert', extrovert: 't-extrovert' },
    processing: { verbal: 't-verbal', spatial: 't-spatial' },
    sensitivity: { 'high-sens': 't-high-sens', 'low-sens': 't-low-sens' },
    novelty: { depth: 't-depth', breadth: 't-breadth' }
  };
  document.querySelectorAll('.t-adjust').forEach(el => el.classList.remove('visible'));
  let activeCount = 0;
  for (const [dim, val] of Object.entries(state.profile)) {
    if (val !== 'balanced' && classMap[dim] && classMap[dim][val]) {
      document.querySelectorAll(`.${classMap[dim][val]}`).forEach(el => el.classList.add('visible'));
      activeCount++;
    }
  }
  return activeCount;
}

function updateFabIndicator() {
  const fab = document.getElementById('fab-profile');
  const active = Object.values(state.profile).filter(v => v !== 'balanced').length;
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
