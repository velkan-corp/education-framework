import { state, childProfiles } from './state.js';

export function getHeadingText(h) {
  let text = '';
  h.childNodes.forEach(n => {
    if (n.nodeType === 3) text += n.textContent;
    else if (n.nodeType === 1 && !n.classList.contains('material-symbols-rounded') && !n.classList.contains('tier-badge')) text += n.textContent;
  });
  return text.trim();
}

// IDs of the three framework group headers
const FW_GROUPS = new Set(['s-philosophy', 's-methods', 's-operations']);

function buildSectionNav(containerEl, entries, options = {}) {
  const { linkClass = 'nav-link', titleClass = 'sidebar-title', titleStyle = '', onClickExtra = null } = options;
  if (entries.length === 0) {
    containerEl.innerHTML = '';
    return;
  }

  // Check if this is the framework page (has group headers)
  const hasGroups = entries.some(e => e.groupId && FW_GROUPS.has(e.groupId));

  let html = `<div class="${titleClass}"${titleStyle ? ` style="${titleStyle}"` : ''}>Sections</div>`;
  entries.forEach(e => {
    const isGroup = hasGroups && e.groupId && FW_GROUPS.has(e.groupId);
    const cls = isGroup ? `${linkClass} nav-link-group` : linkClass;
    html += `<button type="button" class="${cls}">${e.label}</button>`;
  });
  containerEl.innerHTML = html;

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
  if (state.currentView === 'universe') {
    // Find the visible universe timeline
    const detail = document.getElementById('universe-detail');
    if (!detail || detail.classList.contains('hidden')) return [];
    const visible = detail.querySelector('.universe-timeline:not(.hidden)');
    if (!visible) return [];
    const phases = Array.from(visible.querySelectorAll('.timeline-phase'));
    return phases.map(p => ({
      label: p.querySelector('.timeline-age').textContent.trim(),
      scrollTarget: p
    }));
  }
  // Cross-age browse views — timeline phases as nav entries when in detail
  if (state.currentView === 'models' || state.currentView === 'targets' || state.currentView === 'resources') {
    const viewId = state.currentView + '-view';
    const detail = document.getElementById(state.currentView + '-detail');
    if (!detail || detail.classList.contains('hidden')) return [];
    const phases = Array.from(detail.querySelectorAll('.timeline-phase:not(.hidden)'));
    return phases.map(p => {
      const ageEl = p.querySelector('.timeline-age');
      return { label: ageEl ? ageEl.textContent.trim() : '', scrollTarget: p };
    });
  }
  const activeContent = document.querySelector('.phase-content.active');
  if (!activeContent) return [];

  // Framework page: only show the 3 top-level sections, not every h2
  const isFramework = activeContent.dataset.phase === 'framework';
  const headings = Array.from(activeContent.querySelectorAll('h2[id]'));

  if (isFramework) {
    return headings
      .filter(h => FW_GROUPS.has(h.dataset.anchorBase || h.id))
      .map(h => ({ label: getHeadingText(h), scrollTarget: h }));
  }

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
      onClickExtra: () => {
        document.getElementById('float-menu').classList.remove('open');
        document.getElementById('fab-menu')?.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

// Legacy stubs — renderTabs is called by search.js but tabs no longer exist in DOM
export function renderTabs() {}

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
  const fab = document.getElementById('fab-menu');
  if (fab) fab.setAttribute('aria-expanded', String(panel.classList.contains('open')));
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

/* ── Profile class map ── */

const classMap = {
  // Rothbart ECBQ
  energy:          { introvert: 't-introvert', extrovert: 't-extrovert' },
  reactivity:      { high: 't-high-react', low: 't-low-react' },
  selfRegulation:  { high: 't-ec-high', low: 't-ec-low' },
  // ASQ
  communication:   { advanced: 't-comm-adv', developing: 't-comm-dev' },
  problemSolving:  { advanced: 't-ps-adv', developing: 't-ps-dev' },
  grossMotor:      { advanced: 't-gm-adv', developing: 't-gm-dev' },
  fineMotor:       { advanced: 't-fm-adv', developing: 't-fm-dev' },
  personalSocial:  { advanced: 't-social-adv', developing: 't-social-dev' },
  // BRIEF-P
  inhibit:         { advanced: 't-inhib-adv', developing: 't-inhib-dev' },
  shift:           { advanced: 't-shift-adv', developing: 't-shift-dev' },
  emotionalControl:{ advanced: 't-emoctl-adv', developing: 't-emoctl-dev' },
  workingMemory:   { advanced: 't-wm-adv', developing: 't-wm-dev' },
  planOrganize:    { advanced: 't-plan-adv', developing: 't-plan-dev' }
};

/* ── Child profile loading ── */

let activeChildProfile = null;

export function loadChildProfile(key) {
  const cp = childProfiles[key];
  if (!cp) return;
  activeChildProfile = key;
  Object.assign(state.profile, cp.profile);
  syncAllRadioButtons();
  applyProfile();
  updateFabIndicator();
  updateChildSelector(key);
}

function clearChildProfile() {
  if (activeChildProfile) {
    activeChildProfile = null;
    updateChildSelector(null);
  }
}

function updateChildSelector(activeKey) {
  document.querySelectorAll('.radio-group[data-dim="child"] .radio-btn').forEach(btn => {
    const isActive = (activeKey === null && btn.dataset.val === 'custom') ||
                     (btn.dataset.val === activeKey);
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function syncAllRadioButtons() {
  for (const [dim, val] of Object.entries(state.profile)) {
    document.querySelectorAll(`.radio-group[data-dim="${dim}"] .radio-btn`).forEach(b => {
      const active = b.dataset.val === val;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }
}

/* ── Profile toggles ── */

function resetToBalanced() {
  for (const key of Object.keys(state.profile)) {
    state.profile[key] = 'balanced';
  }
  clearChildProfile();
  syncAllRadioButtons();
  applyProfile();
  updateFabIndicator();
}

export function setupProfileToggles() {
  document.querySelectorAll('.reset-profile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetToBalanced();
    });
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.radio-btn');
    if (!btn) return;
    const group = btn.closest('.radio-group');
    if (!group) return;
    e.stopPropagation();
    const dim = group.dataset.dim;
    const val = btn.dataset.val;

    // Child profile selector
    if (dim === 'child') {
      if (val === 'custom') {
        clearChildProfile();
      } else {
        loadChildProfile(val);
      }
      return;
    }

    // Individual dimension change — revert to Custom
    state.profile[dim] = val;
    clearChildProfile();
    document.querySelectorAll(`.radio-group[data-dim="${dim}"] .radio-btn`).forEach(b => {
      const active = b.dataset.val === val;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    applyProfile();
    updateFabIndicator();
  });
}

/* ── Collapsible sections ── */

export function setupCollapsibleSections() {
  document.querySelectorAll('.profile-section-header').forEach(header => {
    const sectionKey = header.dataset.section;
    const content = header.nextElementSibling;
    if (!content) return;

    // Restore collapsed state
    if (state.collapsed[sectionKey]) {
      content.classList.add('collapsed');
      header.classList.add('collapsed');
    }

    header.addEventListener('click', () => {
      const isCollapsed = content.classList.toggle('collapsed');
      header.classList.toggle('collapsed', isCollapsed);
      state.collapsed[sectionKey] = isCollapsed;
    });
  });
}

/* ── Apply profile to content ── */

export function applyProfile() {
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
  const fab = document.getElementById('fab-menu');
  if (!fab) return;
  const active = Object.values(state.profile).filter(v => v !== 'balanced').length;
  if (active > 0) {
    fab.style.background = 'var(--accent2)';
    fab.textContent = active;
    fab.title = active + ' filter(s) active';
  } else {
    fab.style.background = 'var(--accent)';
    fab.textContent = '\u2630';
    fab.title = 'Menu';
  }
}
