import { state } from './state.js';
import { renderTabs, showTab, updateAllNavs } from './navigation.js';

function createSearchRegex(query) {
  return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
}

function collectMatches(query, maxMatches, contextChars) {
  const matches = [];
  const re = createSearchRegex(query);

  document.querySelectorAll('.phase-content').forEach(phaseEl => {
    const tabId = phaseEl.dataset.phase;
    const tabLabel = phaseEl.dataset.label;
    const text = phaseEl.textContent.replace(/\s+/g, ' ');
    let m;
    const seen = new Set();
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null && matches.length < maxMatches) {
      const start = Math.max(0, m.index - contextChars);
      const end = Math.min(text.length, m.index + m[0].length + contextChars);
      let snippet = text.substring(start, end).trim();
      const key = tabId + ':' + snippet.substring(0, 30);
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ tabId, tabLabel, snippet, matchText: m[0] });
    }
  });

  return matches;
}

export function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let debounce = null;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(input.value.trim()), 200);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; results.classList.add('hidden'); clearHighlights(); }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-wrap')) { results.classList.add('hidden'); }
    if (!e.target.closest('#float-menu') && !e.target.closest('#fab-menu')) {
      const menu = document.getElementById('float-menu');
      if (menu) menu.classList.remove('open');
      document.getElementById('fab-menu')?.setAttribute('aria-expanded', 'false');
    }
  });

  // Mobile search overlay
  const mobileInput = document.getElementById('mobile-search-input');
  const mobileClose = document.getElementById('mobile-search-close');
  const mobileOverlay = document.getElementById('mobile-search-overlay');
  if (mobileInput && mobileOverlay) {
    let mobileDebounce = null;
    mobileInput.addEventListener('input', () => {
      clearTimeout(mobileDebounce);
      mobileDebounce = setTimeout(() => runMobileSearch(mobileInput.value.trim()), 200);
    });
    mobileInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileSearch();
    });
    mobileClose.addEventListener('click', closeMobileSearch);
    mobileOverlay.addEventListener('click', (e) => {
      if (e.target === mobileOverlay) closeMobileSearch();
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); input.focus(); input.select(); }
  });
}

function runSearch(query) {
  const results = document.getElementById('search-results');
  clearHighlights();

  if (query.length < 2) { results.classList.add('hidden'); return; }

  const matches = collectMatches(query, 50, 40);
  const re = createSearchRegex(query);

  if (matches.length === 0) {
    results.innerHTML = '<div class="sr-no-results">No results for "' + query.replace(/</g,'&lt;') + '"</div>';
    results.classList.remove('hidden');
    return;
  }

  results.innerHTML = matches.map(m => {
    const highlighted = m.snippet.replace(re, '<span class="sr-highlight">$&</span>');
    return `<button type="button" class="sr-item" data-tab="${m.tabId}" data-query="${query.replace(/"/g,'&quot;')}">
      <div class="sr-item-label">${m.tabLabel}</div>
      <div class="sr-item-snippet">\u2026${highlighted}\u2026</div>
    </button>`;
  }).join('');

  results.classList.remove('hidden');

  results.querySelectorAll('.sr-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      const q = item.dataset.query;
      state.currentTab = tabId;
      renderTabs();
      showTab(state.currentTab);
      updateAllNavs();
      results.classList.add('hidden');
      setTimeout(() => highlightInContent(q), 50);
    });
  });
}

function highlightInContent(query) {
  if (!query) return;
  const content = document.querySelector('.phase-content.active');
  if (!content) return;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
  const re = createSearchRegex(query);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  let firstMark = null;
  textNodes.forEach(node => {
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

export function openMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  if (overlay) { overlay.classList.add('open'); document.getElementById('mobile-search-input').focus(); }
}

function closeMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  const input = document.getElementById('mobile-search-input');
  const results = document.getElementById('mobile-search-results');
  if (overlay) overlay.classList.remove('open');
  if (input) input.value = '';
  if (results) results.innerHTML = '';
  clearHighlights();
}

function runMobileSearch(query) {
  const results = document.getElementById('mobile-search-results');
  if (!results) return;
  clearHighlights();
  if (query.length < 2) { results.innerHTML = ''; return; }

  const matches = collectMatches(query, 30, 30);

  if (matches.length === 0) {
    results.innerHTML = '<div class="sr-no-results">No results</div>';
    return;
  }

  results.innerHTML = matches.map(m =>
    `<button type="button" class="sr-item" data-tab="${m.tabId}">
      <div class="sr-item-label">${m.tabLabel}</div>
      <div class="sr-item-snippet">\u2026${m.snippet.replace(createSearchRegex(query), '<strong>$&</strong>')}\u2026</div>
    </button>`
  ).join('');

  results.querySelectorAll('.sr-item').forEach(item => {
    item.addEventListener('click', () => {
      state.currentTab = item.dataset.tab;
      renderTabs(); showTab(state.currentTab); updateAllNavs();
      closeMobileSearch();
      setTimeout(() => highlightInContent(query), 50);
    });
  });
}

function clearHighlights() {
  document.querySelectorAll('mark[data-search-highlight]').forEach(mark => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}
