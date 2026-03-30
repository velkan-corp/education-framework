import { state } from './state.js';
import { renderTabs, showTab, updateAllNavs } from './navigation.js';

export function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let debounce = null;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(input.value.trim()), 200);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; results.style.display = 'none'; clearHighlights(); }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-wrap')) { results.style.display = 'none'; }
    if (!e.target.closest('#float-menu') && !e.target.closest('#fab-menu')) {
      const menu = document.getElementById('float-menu');
      if (menu) menu.classList.remove('open');
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

  if (query.length < 2) { results.style.display = 'none'; return; }

  const matches = [];
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

  document.querySelectorAll('.phase-content').forEach(phaseEl => {
    const tabId = phaseEl.dataset.phase;
    const tabLabel = phaseEl.dataset.label;
    const text = phaseEl.textContent.replace(/\s+/g, ' ');
    let m;
    const seen = new Set();
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null && matches.length < 50) {
      const start = Math.max(0, m.index - 40);
      const end = Math.min(text.length, m.index + m[0].length + 40);
      let snippet = text.substring(start, end).trim();
      const key = tabId + ':' + snippet.substring(0, 30);
      if (seen.has(key)) continue;
      seen.add(key);
      snippet = snippet.replace(re, '<span style="background:var(--accent);color:#fff;padding:0 2px;border-radius:2px">$&</span>');
      matches.push({ tabId, tabLabel, snippet, index: m.index });
    }
  });

  if (matches.length === 0) {
    results.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px">No results for "' + query.replace(/</g,'&lt;') + '"</div>';
    results.style.display = 'block';
    return;
  }

  results.innerHTML = matches.map(m =>
    `<div class="sr-item" data-tab="${m.tabId}" data-query="${query.replace(/"/g,'&quot;')}" style="padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;font-size:13px;line-height:1.5" onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background='transparent'">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:3px">${m.tabLabel}</div>
      <div style="color:var(--text-muted)">\u2026${m.snippet}\u2026</div>
    </div>`
  ).join('');

  results.style.display = 'block';

  results.querySelectorAll('.sr-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      const q = item.dataset.query;
      state.currentTab = tabId;
      renderTabs();
      showTab(state.currentTab);
      updateAllNavs();
      results.style.display = 'none';
      setTimeout(() => highlightInContent(q), 50);
    });
  });
}

function highlightInContent(query) {
  if (!query) return;
  const content = document.querySelector('.phase-content.active');
  if (!content) return;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
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
      mark.style.cssText = 'background:var(--accent);color:#fff;padding:0 2px;border-radius:2px';
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

  const matches = [];
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  document.querySelectorAll('.phase-content').forEach(phaseEl => {
    const tabId = phaseEl.dataset.phase;
    const tabLabel = phaseEl.dataset.label;
    const text = phaseEl.textContent.replace(/\s+/g, ' ');
    let m; const seen = new Set(); re.lastIndex = 0;
    while ((m = re.exec(text)) !== null && matches.length < 30) {
      const start = Math.max(0, m.index - 30);
      const end = Math.min(text.length, m.index + m[0].length + 30);
      let snippet = text.substring(start, end).trim();
      const key = tabId + ':' + snippet.substring(0, 30);
      if (seen.has(key)) continue; seen.add(key);
      snippet = snippet.replace(re, '<strong>$&</strong>');
      matches.push({ tabId, tabLabel, snippet });
    }
  });

  if (matches.length === 0) {
    results.innerHTML = '<div style="padding:16px;color:var(--text-muted)">No results</div>';
    return;
  }

  results.innerHTML = matches.map(m =>
    `<div class="sr-item" data-tab="${m.tabId}" style="cursor:pointer">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin-bottom:2px">${m.tabLabel}</div>
      <div style="color:var(--text-muted)">\u2026${m.snippet}\u2026</div>
    </div>`
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
