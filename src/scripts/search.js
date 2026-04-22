import { state } from './state.js';
import { showTab, updateAllNavs } from './navigation.js';
import { showView } from './domain.js';

/* ──────────────────────────────────────────────────────────────────
   Section metadata.
   Labels are filled on init from the lang-injected window.__i18n.
   ────────────────────────────────────────────────────────────────── */

const SECTION_ORDER = ['library', 'mental-model', 'target', 'domain', 'resource'];

const SECTION_FALLBACK_LABELS = {
  en: {
    'library': 'Library',
    'mental-model': 'Mental Model',
    'target': 'Activity Map',
    'domain': 'Domain',
    'resource': 'Resource',
    'filter_all': 'All',
    'also_in': 'Also in',
  },
  es: {
    'library': 'Biblioteca',
    'mental-model': 'Modelo Mental',
    'target': 'Mapa de Actividades',
    'domain': 'Dominio',
    'resource': 'Recurso',
    'filter_all': 'Todos',
    'also_in': 'También en',
  },
};

function detectLang() {
  return document.documentElement.lang === 'es' ? 'es' : 'en';
}

function t(key) {
  const lang = detectLang();
  return (window.__searchI18n && window.__searchI18n[key]) || SECTION_FALLBACK_LABELS[lang][key] || key;
}

/* ──────────────────────────────────────────────────────────────────
   Query helpers
   ────────────────────────────────────────────────────────────────── */

function createSearchRegex(query) {
  return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* ──────────────────────────────────────────────────────────────────
   Tag phase sub-sections (activity-map vs domain).
   Called once at init; tags persist in the DOM.
   ────────────────────────────────────────────────────────────────── */

function tagPhaseSubsections() {
  document.querySelectorAll('.phase-content').forEach((phaseEl) => {
    const phaseId = phaseEl.dataset.phase;
    const phaseLabel = phaseEl.dataset.label;

    phaseEl.querySelectorAll('.target-grid').forEach((el) => {
      if (!el.dataset.section) {
        el.dataset.section = 'target';
        el.dataset.phase = phaseId;
        el.dataset.label = phaseLabel;
      }
    });

    phaseEl.querySelectorAll('.program-elements').forEach((el) => {
      if (!el.dataset.section) {
        el.dataset.section = 'domain';
        el.dataset.phase = phaseId;
        el.dataset.label = phaseLabel;
      }
    });
  });
}

/* ──────────────────────────────────────────────────────────────────
   Collect matches.
   Strategy: walk a fixed list of searchable roots. Dedupe cross-age
   sections by slug (one result per model/target/universe/resource).
   ────────────────────────────────────────────────────────────────── */

function getRoots() {
  // Order matters for display ranking — cross-age cards first, then per-age subsections.
  // Phase-content is deliberately NOT a root: its content is covered by the tagged subsections
  // (.target-grid and .program-elements), and including it produces near-duplicate matches.
  return [
    ...document.querySelectorAll('#universe-view .universe-card'),
    ...document.querySelectorAll('#models-view .browse-card'),
    ...document.querySelectorAll('#targets-view .browse-card'),
    ...document.querySelectorAll('#resources-view .resource-row'),
    ...document.querySelectorAll('.phase-content [data-section="target"]'),
    ...document.querySelectorAll('.phase-content [data-section="domain"]'),
  ];
}

function classifyRoot(root) {
  if (root.matches('.universe-card, .universe-timeline')) {
    return { section: 'library', slug: root.dataset.slug || root.dataset.universe, label: root.dataset.label || '', phaseIds: splitPhases(root.dataset.phases) };
  }
  if (root.matches('#models-view .browse-card')) {
    return { section: 'mental-model', slug: root.dataset.slug || root.dataset.browseId, label: root.querySelector('h1')?.textContent?.trim() || root.dataset.label || '', phaseIds: splitPhases(root.dataset.phases) };
  }
  if (root.matches('#targets-view .browse-card')) {
    return { section: 'target', slug: root.dataset.slug || root.dataset.browseId, label: root.querySelector('h1')?.textContent?.trim() || root.dataset.label || '', phaseIds: splitPhases(root.dataset.phases) };
  }
  if (root.matches('#resources-view .resource-row')) {
    return { section: 'resource', slug: root.dataset.slug || root.dataset.browseId, label: root.dataset.label || '', phaseIds: splitPhases(root.dataset.phases) };
  }
  if (root.matches('[data-section="target"]')) {
    return { section: 'target', phaseId: root.dataset.phase, label: root.dataset.label };
  }
  if (root.matches('[data-section="domain"]')) {
    return { section: 'domain', phaseId: root.dataset.phase, label: root.dataset.label };
  }
  if (root.matches('.phase-content')) {
    return { section: 'target', phaseId: root.dataset.phase, label: root.dataset.label, isFallback: true };
  }
  return null;
}

function splitPhases(value) {
  if (!value) return [];
  return value.split(',').filter(Boolean);
}

function collectMatches(query, maxMatches, contextChars) {
  const matches = [];
  const re = createSearchRegex(query);
  const crossAgeSeen = new Map(); // slug → match index, for dedupe

  const roots = getRoots();

  for (const root of roots) {
    if (matches.length >= maxMatches) break;

    const classification = classifyRoot(root);
    if (!classification) continue;

    const text = root.textContent.replace(/\s+/g, ' ');
    if (!text) continue;

    re.lastIndex = 0;
    const m = re.exec(text);
    if (!m) continue;

    const start = Math.max(0, m.index - contextChars);
    const end = Math.min(text.length, m.index + m[0].length + contextChars);
    const snippet = text.substring(start, end).trim();

    // Cross-age cards dedupe by slug (one result per universe/model/target/resource).
    // Per-age subsections dedupe by section + phaseId + snippet prefix.
    const dedupeKey = classification.slug
      ? `${classification.section}:slug:${classification.slug}`
      : `${classification.section}:phase:${classification.phaseId}:${snippet.substring(0, 40)}`;
    if (crossAgeSeen.has(dedupeKey)) continue;
    crossAgeSeen.set(dedupeKey, matches.length);

    matches.push({
      ...classification,
      snippet,
      matchText: m[0],
    });
  }

  return matches;
}

/* ──────────────────────────────────────────────────────────────────
   Render results
   ────────────────────────────────────────────────────────────────── */

function sectionBadgeHtml(section) {
  return `<span class="sr-badge sr-badge-${section}">${t(section)}</span>`;
}

function ageChipsHtml(phaseIds) {
  if (!phaseIds || phaseIds.length === 0) return '';
  const byId = new Map((window.__phaseData || []).map((p) => [p.id, p.label]));
  const chips = phaseIds
    .map((id) => {
      const label = byId.get(id);
      if (!label) return '';
      return `<button type="button" class="sr-age-chip" data-jump-phase="${id}">${label}</button>`;
    })
    .filter(Boolean)
    .join('');
  if (!chips) return '';
  return `<div class="sr-age-chips"><span class="sr-age-chips-label">${t('also_in')}:</span>${chips}</div>`;
}

function resultItemHtml(match, query) {
  const re = createSearchRegex(query);
  const snippetHtml = escapeHtml(match.snippet).replace(re, '<span class="sr-highlight">$&</span>');
  const titleText = match.label || match.phaseId || '';
  const hasChevron = match.phaseIds && match.phaseIds.length > 0;

  return `
    <div class="sr-item sr-item-${match.section}" data-section="${match.section}" data-slug="${match.slug || ''}" data-phase="${match.phaseId || ''}">
      <button type="button" class="sr-item-main" data-action="primary">
        <div class="sr-item-header">
          ${sectionBadgeHtml(match.section)}
          ${titleText ? `<span class="sr-item-title">${escapeHtml(titleText)}</span>` : ''}
        </div>
        <div class="sr-item-snippet">\u2026${snippetHtml}\u2026</div>
      </button>
      ${hasChevron ? `
        <button type="button" class="sr-item-chevron" data-action="toggle-ages" aria-label="${t('also_in')}" aria-expanded="false">
          <svg width="12" height="12" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      ` : ''}
      ${hasChevron ? `<div class="sr-age-chips-wrap hidden">${ageChipsHtml(match.phaseIds)}</div>` : ''}
    </div>
  `;
}

function filterChipsHtml(counts, activeFilter) {
  const chips = [
    { key: 'all', label: t('filter_all'), count: counts.total },
    ...SECTION_ORDER.map((s) => ({ key: s, label: t(s), count: counts[s] || 0 })),
  ];
  return `<div class="sr-filter-row">${chips
    .filter((c) => c.key === 'all' || c.count > 0)
    .map((c) => `<button type="button" class="sr-filter-chip${activeFilter === c.key ? ' active' : ''}" data-filter="${c.key}">${c.label}${c.count ? ` <span class="sr-filter-count">${c.count}</span>` : ''}</button>`)
    .join('')}</div>`;
}

function countBySection(matches) {
  const counts = { total: matches.length };
  for (const m of matches) counts[m.section] = (counts[m.section] || 0) + 1;
  return counts;
}

function renderResults(container, matches, query, state) {
  if (matches.length === 0) {
    container.innerHTML = `<div class="sr-no-results">${detectLang() === 'es' ? 'Sin resultados para' : 'No results for'} "${escapeHtml(query)}"</div>`;
    return;
  }

  const counts = countBySection(matches);
  const filtered = state.filter === 'all' ? matches : matches.filter((m) => m.section === state.filter);

  const html = `
    ${filterChipsHtml(counts, state.filter)}
    <div class="sr-list">
      ${filtered.length === 0
        ? `<div class="sr-no-results">${detectLang() === 'es' ? 'Sin resultados en esta sección' : 'No results in this section'}</div>`
        : filtered.map((m) => resultItemHtml(m, query)).join('')}
    </div>
  `;
  container.innerHTML = html;
}

/* ──────────────────────────────────────────────────────────────────
   Click routing
   ────────────────────────────────────────────────────────────────── */

function openCrossAge(section, slug) {
  if (!slug) return;
  if (section === 'library') {
    showView('universe', { showDetail: slug });
    return;
  }
  if (section === 'mental-model') {
    showView('models');
    const card = document.querySelector(`#models-grid .browse-card[data-browse-id="${CSS.escape(slug)}"]`);
    card?.click();
    return;
  }
  if (section === 'target') {
    showView('targets');
    const card = document.querySelector(`#targets-grid .browse-card[data-browse-id="${CSS.escape(slug)}"]`);
    card?.click();
    return;
  }
  if (section === 'resource') {
    showView('resources');
    // The resource-card-container rebuilds on view switch — wait one frame.
    requestAnimationFrame(() => {
      const row = document.querySelector(`#resources-card-container .resource-row[data-browse-id="${CSS.escape(slug)}"]`);
      row?.click();
    });
    return;
  }
}

function openPhase(phaseId, query) {
  if (!phaseId) return;
  if (phaseId === 'framework') {
    showView('framework');
  } else {
    showView('age', { phaseId });
  }
  window.setTimeout(() => highlightInContent(query), 500);
}

function routePrimary(match, query) {
  // Cross-age card match (has slug) → open cross-age detail.
  // Per-age subsection match (has phaseId only) → open that phase.
  if (match.slug && ['library', 'mental-model', 'target', 'resource'].includes(match.section)) {
    openCrossAge(match.section, match.slug);
    return;
  }
  if (match.phaseId) {
    openPhase(match.phaseId, query);
  }
}

/* ──────────────────────────────────────────────────────────────────
   Highlight after navigation
   ────────────────────────────────────────────────────────────────── */

function highlightInContent(query) {
  if (!query) return;
  const content = document.querySelector('.phase-content.active');
  if (!content) return;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
  const re = createSearchRegex(query);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  let firstMark = null;
  textNodes.forEach((node) => {
    const val = node.nodeValue;
    if (!re.test(val)) return;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = re.exec(val)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(val.substring(last, m.index)));
      const mark = document.createElement('mark');
      mark.className = 'sr-highlight';
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
  document.querySelectorAll('mark[data-search-highlight]').forEach((mark) => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

/* ──────────────────────────────────────────────────────────────────
   Wire up desktop and mobile search with shared state per instance
   ────────────────────────────────────────────────────────────────── */

function bindResultsPanel(container, runSearch, onNavigate) {
  container.addEventListener('click', (e) => {
    // Filter chip
    const chip = e.target.closest('.sr-filter-chip');
    if (chip) {
      e.preventDefault();
      runSearch({ filter: chip.dataset.filter });
      return;
    }

    // Chevron toggle
    const chevron = e.target.closest('.sr-item-chevron');
    if (chevron) {
      e.preventDefault();
      const wrap = chevron.parentElement.querySelector('.sr-age-chips-wrap');
      const open = wrap.classList.toggle('hidden');
      chevron.setAttribute('aria-expanded', String(!open));
      chevron.classList.toggle('open', !open);
      return;
    }

    // Age chip (jump to phase)
    const ageChip = e.target.closest('.sr-age-chip');
    if (ageChip) {
      e.preventDefault();
      const item = ageChip.closest('.sr-item');
      const query = container.dataset.query || '';
      const section = item?.dataset?.section;
      const slug = item?.dataset?.slug;
      const phaseId = ageChip.dataset.jumpPhase;
      // If the cross-age item has a dedicated detail inside the age view, open the age first,
      // then rely on anchor/highlight for now.
      openPhase(phaseId, query || slug || '');
      onNavigate?.();
      return;
    }

    // Primary result click
    const primary = e.target.closest('.sr-item-main');
    if (primary) {
      e.preventDefault();
      const item = primary.closest('.sr-item');
      if (!item) return;
      const section = item.dataset.section;
      const slug = item.dataset.slug;
      const phaseId = item.dataset.phase;
      const query = container.dataset.query || '';
      routePrimary({ section, slug, phaseId }, query);
      onNavigate?.();
      return;
    }
  });
}

function runInstance({ input, results, maxMatches, contextChars, onNavigate, syncUrl }) {
  const state = { filter: 'all', lastMatches: [], lastQuery: '' };

  function run({ filter, skipUrlSync } = {}) {
    const query = input.value.trim();
    if (filter !== undefined) state.filter = filter;
    if (query !== state.lastQuery) {
      state.lastQuery = query;
      if (filter === undefined) state.filter = 'all';
      state.lastMatches = query.length < 2 ? [] : collectMatches(query, maxMatches, contextChars);
    }

    results.dataset.query = query;

    if (query.length < 2) {
      results.innerHTML = '';
      results.classList.add('hidden');
      clearHighlights();
      if (syncUrl && !skipUrlSync) writeUrlState({ q: '', f: 'all' });
      return;
    }

    renderResults(results, state.lastMatches, query, state);
    results.classList.remove('hidden');
    if (syncUrl && !skipUrlSync) writeUrlState({ q: query, f: state.filter });
  }

  let debounce = null;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => run(), 150);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      results.innerHTML = '';
      results.classList.add('hidden');
      clearHighlights();
      if (syncUrl) writeUrlState({ q: '', f: 'all' });
    }
  });

  bindResultsPanel(results, run, () => {
    if (syncUrl) writeUrlState({ q: '', f: 'all' });
    onNavigate?.();
  });

  return { run, state };
}

function readUrlState() {
  const params = new URLSearchParams(location.search);
  return { q: params.get('q') || '', f: params.get('f') || 'all' };
}

function writeUrlState({ q, f }) {
  const params = new URLSearchParams(location.search);
  if (q) params.set('q', q); else params.delete('q');
  if (f && f !== 'all') params.set('f', f); else params.delete('f');
  const qs = params.toString();
  const url = `${location.pathname}${qs ? '?' + qs : ''}${location.hash}`;
  history.replaceState(null, '', url);
}

/* ──────────────────────────────────────────────────────────────────
   Public init
   ────────────────────────────────────────────────────────────────── */

export function initSearch() {
  tagPhaseSubsections();

  const desktopInput = document.getElementById('search-input');
  const desktopResults = document.getElementById('search-results');
  let desktopInstance = null;
  if (desktopInput && desktopResults) {
    desktopInstance = runInstance({
      input: desktopInput,
      results: desktopResults,
      maxMatches: 80,
      contextChars: 50,
      syncUrl: true,
      onNavigate: () => {
        desktopResults.classList.add('hidden');
      },
    });
  }

  const mobileInput = document.getElementById('mobile-search-input');
  const mobileResults = document.getElementById('mobile-search-results');
  const mobileClose = document.getElementById('mobile-search-close');
  const mobileOverlay = document.getElementById('mobile-search-overlay');
  let mobileInstance = null;
  if (mobileInput && mobileResults) {
    mobileInstance = runInstance({
      input: mobileInput,
      results: mobileResults,
      maxMatches: 60,
      contextChars: 40,
      syncUrl: true,
      onNavigate: () => closeMobileSearch(),
    });
    mobileClose?.addEventListener('click', closeMobileSearch);
    mobileOverlay?.addEventListener('click', (e) => {
      if (e.target === mobileOverlay) closeMobileSearch();
    });
  }

  // Apply URL state on load: populate both inputs, run on the active surface.
  const urlState = readUrlState();
  if (urlState.q) {
    // Defer one frame so resources/models/targets have finished initialising.
    requestAnimationFrame(() => {
      const isMobile = window.innerWidth <= 900;
      if (isMobile && mobileInstance) {
        openMobileSearch();
        mobileInput.value = urlState.q;
        mobileInstance.run({ filter: urlState.f, skipUrlSync: true });
      } else if (desktopInstance) {
        desktopInput.value = urlState.q;
        desktopInstance.run({ filter: urlState.f, skipUrlSync: true });
      }
    });
  }

  // Close desktop results on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-wrap')) {
      desktopResults?.classList.add('hidden');
    }
    if (!e.target.closest('#float-menu') && !e.target.closest('#fab-menu')) {
      document.getElementById('float-menu')?.classList.remove('open');
      document.getElementById('fab-menu')?.setAttribute('aria-expanded', 'false');
    }
  });

  // ⌘K focus
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (window.innerWidth <= 900) {
        openMobileSearch();
      } else {
        desktopInput?.focus();
        desktopInput?.select();
      }
    }
  });
}

export function openMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  if (overlay) {
    overlay.classList.add('open');
    document.getElementById('mobile-search-input')?.focus();
  }
}

function closeMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  const input = document.getElementById('mobile-search-input');
  const results = document.getElementById('mobile-search-results');
  overlay?.classList.remove('open');
  if (input) input.value = '';
  if (results) { results.innerHTML = ''; results.dataset.query = ''; }
  clearHighlights();
}
