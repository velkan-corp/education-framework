import { state } from './state.js';
import { showTab, setupProfileToggles, setupCollapsibleSections, updateAllNavs, wrapTablesForMobile, toggleFloatMenu } from './navigation.js';
import { initSearch, openMobileSearch } from './search.js';
import { initResourceFilters, initSectionFilters } from './filters.js';
import { initDomainView } from './domain.js';
import { initUniverseView } from './universe.js';
import { initModelsView } from './models.js';
import { initTargetsView } from './targets.js';
import { initResourcesView } from './resources.js';

function findByAnchorBase(container, targetId) {
  if (!container) return null;
  return Array.from(container.querySelectorAll('[data-anchor-base]')).find((el) => el.dataset.anchorBase === targetId) ?? null;
}

function hideDecorativeIconsFromAssistiveTechnology() {
  document.querySelectorAll('.material-symbols-rounded').forEach((icon) => {
    icon.setAttribute('aria-hidden', 'true');
  });
}

function evidenceDisclosureFromBlockquote(blockquote) {
  const marker = blockquote.querySelector(':scope > p:first-child');
  const summaryText = marker?.textContent.trim().replace(/[.:]+$/u, '') || 'Evidence';
  const disclosure = document.createElement('details');
  disclosure.className = 'evidence';
  const summary = document.createElement('summary');
  summary.textContent = summaryText;
  disclosure.appendChild(summary);
  Array.from(blockquote.children).slice(marker ? 1 : 0).forEach((child) => disclosure.appendChild(child));
  return disclosure;
}

function restorePrincipleCards() {
  document.querySelectorAll('.phase-content[data-phase="framework"]').forEach((phaseEl) => {
    if (phaseEl.querySelector('.principle')) return;
    const principlesHeading = phaseEl.querySelector('h2[data-section-key="principles"]');
    if (!principlesHeading) return;

    let heading = principlesHeading.nextElementSibling;
    while (heading && heading.tagName !== 'H2') {
      const match = heading.tagName === 'H3'
        ? heading.textContent.trim().match(/^Princip(?:le|io)\s+(\d+)\s*[—-]\s*(.+)$/iu)
        : null;
      if (!match) {
        heading = heading.nextElementSibling;
        continue;
      }

      const thesis = heading.nextElementSibling?.matches('blockquote.principle-thesis')
        ? heading.nextElementSibling
        : null;
      let boundary = thesis?.nextElementSibling ?? heading.nextElementSibling;
      const body = [];
      while (boundary && boundary.tagName !== 'H2') {
        if (boundary.tagName === 'H3' && /^Princip(?:le|io)\s+\d+\s*[—-]/iu.test(boundary.textContent.trim())) break;
        const next = boundary.nextElementSibling;
        body.push(boundary);
        boundary = next;
      }

      const card = document.createElement('details');
      card.className = 'principle';
      const summary = document.createElement('summary');
      const number = document.createElement('span');
      number.className = 'principle-num';
      number.textContent = match[1];
      const name = document.createElement('span');
      name.className = 'principle-name';
      name.textContent = match[2];
      summary.append(number, name);
      if (thesis) {
        const thesisText = document.createElement('span');
        thesisText.className = 'principle-thesis';
        thesisText.textContent = thesis.textContent.trim();
        summary.appendChild(thesisText);
      }

      heading.before(card);
      card.appendChild(summary);
      body.forEach((node) => {
        card.appendChild(node.matches('blockquote.evidence-callout')
          ? evidenceDisclosureFromBlockquote(node)
          : node);
      });
      heading.remove();
      thesis?.remove();
      heading = boundary;
    }
  });
}

function restoreFrameworkModelTimeline() {
  document.querySelectorAll('.phase-content[data-phase="framework"]').forEach((phaseEl) => {
    if (phaseEl.querySelector('.model-timeline')) return;
    const toolkitHeading = phaseEl.querySelector('h2[data-section-key="models"]');
    if (!toolkitHeading) return;
    const scopeHeading = Array.from(phaseEl.querySelectorAll('h3')).find((heading) => (
      /^(?:Nineteen Universal Mental Models|Diecinueve Modelos Mentales Universales)$/iu.test(heading.textContent.trim())
    ));
    if (!scopeHeading) return;

    const groups = [];
    let cursor = scopeHeading.nextElementSibling;
    while (cursor && cursor.tagName !== 'H2') {
      if (/^(?:Age|Edad)\s+\d/u.test(cursor.textContent.trim()) && cursor.nextElementSibling?.tagName === 'UL') {
        groups.push({ label: cursor, list: cursor.nextElementSibling });
        cursor = cursor.nextElementSibling.nextElementSibling;
      } else {
        cursor = cursor.nextElementSibling;
      }
    }
    if (groups.length !== 4) return;

    const timeline = document.createElement('div');
    timeline.className = 'model-timeline';
    groups[0].label.before(timeline);
    groups.forEach(({ label, list }) => {
      const group = document.createElement('div');
      group.className = 'model-age-group';
      label.classList.add('model-age-label');
      list.classList.add('model-cards');
      Array.from(list.children).forEach((item) => {
        const match = item.textContent.trim().match(/^(\d+)\.\s*/u);
        if (!match) return;
        item.classList.add('model-card');
        const leadingText = Array.from(item.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
        if (leadingText) leadingText.nodeValue = leadingText.nodeValue.replace(/^\s*\d+\.\s*/u, '');
        const number = document.createElement('span');
        number.className = 'model-num';
        number.textContent = match[1];
        item.prepend(number);
      });
      group.append(label, list);
      timeline.appendChild(group);
    });
  });
}

function restoreEngagementCycle() {
  document.querySelectorAll('.phase-content[data-phase="framework"]').forEach((phaseEl) => {
    if (phaseEl.querySelector('.cycle-pipeline')) return;
    const heading = Array.from(phaseEl.querySelectorAll('h3')).find((candidate) => (
      /^(?:Engagement Cycle|Ciclo de Engagement)$/iu.test(candidate.textContent.trim())
    ));
    const intro = heading?.nextElementSibling;
    const list = intro?.nextElementSibling;
    if (intro?.tagName !== 'P' || list?.tagName !== 'UL' || list.children.length !== 5) return;

    list.classList.add('cycle-pipeline');
    const steps = Array.from(list.children);
    steps.forEach((step, index) => {
      step.classList.add('cycle-step');
      const title = step.querySelector(':scope > p:first-child');
      const description = title?.nextElementSibling;
      if (title?.querySelector('strong')) {
        title.classList.add('cycle-step-name');
        title.textContent = title.textContent.trim().replace(/[.:]+$/u, '');
      }
      if (description?.tagName === 'P') description.classList.add('cycle-step-desc');
      step.querySelectorAll(':scope > blockquote.evidence-callout').forEach((evidence) => {
        evidence.replaceWith(evidenceDisclosureFromBlockquote(evidence));
      });
      if (index < steps.length - 1) {
        const arrow = document.createElement('li');
        arrow.className = 'cycle-arrow';
        arrow.setAttribute('role', 'presentation');
        arrow.setAttribute('aria-hidden', 'true');
        step.after(arrow);
      }
    });
  });
}

function restoreTriadGrid() {
  document.querySelectorAll('.phase-content[data-phase="framework"] h2[data-section-key="joy-kindness-luck"]').forEach((heading) => {
    const list = heading.nextElementSibling;
    if (list?.tagName !== 'UL' || list.children.length !== 3 || list.classList.contains('triad-grid')) return;
    list.classList.add('triad-grid');
    Array.from(list.children).forEach((item) => {
      item.classList.add('triad-card');
      const titleParagraph = item.querySelector(':scope > p:first-child');
      const strong = titleParagraph?.querySelector(':scope > strong');
      if (!strong) return;
      const title = document.createElement('h4');
      title.textContent = strong.textContent.trim().replace(/[.:]+$/u, '');
      titleParagraph.replaceWith(title);
    });
  });
}

function restoreSixComponentGrid() {
  document.querySelectorAll('.phase-content[data-phase="framework"]').forEach((phaseEl) => {
    if (phaseEl.querySelector('.six-components-grid')) return;
    const heading = Array.from(phaseEl.querySelectorAll('h3')).find((candidate) => (
      /^(?:The Six Components|Los Seis Componentes)$/iu.test(candidate.textContent.trim())
    ));
    if (!heading) return;

    const scopes = [];
    let cursor = heading.nextElementSibling;
    while (cursor && !['H2', 'H3'].includes(cursor.tagName)) {
      if (cursor.tagName === 'H4') {
        const nodes = [cursor];
        let next = cursor.nextElementSibling;
        while (next && !['H2', 'H3', 'H4'].includes(next.tagName)) {
          nodes.push(next);
          next = next.nextElementSibling;
        }
        scopes.push(nodes);
        cursor = next;
      } else {
        cursor = cursor.nextElementSibling;
      }
    }
    if (scopes.length !== 6) return;

    const grid = document.createElement('div');
    grid.className = 'target-grid six-components-grid';
    scopes[0][0].before(grid);
    scopes.forEach((nodes) => {
      const card = document.createElement('article');
      card.className = 'target-card';
      nodes.forEach((node) => card.appendChild(node));
      grid.appendChild(card);
    });
  });
}

function groupTrackScopes(scopeHeading, classNames) {
  if (!scopeHeading || scopeHeading.nextElementSibling?.classList?.contains('music-track')) return;
  const scopes = [];
  let cursor = scopeHeading.nextElementSibling;
  while (cursor && !['H2', 'H3'].includes(cursor.tagName)) {
    if (cursor.tagName === 'H4') {
      const nodes = [cursor];
      let next = cursor.nextElementSibling;
      while (next && !['H2', 'H3', 'H4'].includes(next.tagName)) {
        nodes.push(next);
        next = next.nextElementSibling;
      }
      scopes.push(nodes);
      cursor = next;
    } else {
      cursor = cursor.nextElementSibling;
    }
  }
  if (scopes.length < 2) return;
  const wrapper = document.createElement('div');
  wrapper.className = classNames;
  scopes[0][0].before(wrapper);
  scopes.forEach((nodes) => {
    const card = document.createElement('div');
    nodes.forEach((node) => card.appendChild(node));
    wrapper.appendChild(card);
  });
}

function restoreTrackGrids() {
  document.querySelectorAll('.phase-content[data-phase^="age-"]').forEach((phaseEl) => {
    const communication = phaseEl.querySelector('h2[data-section-key="communication"]');
    if (communication) {
      let cursor = communication.nextElementSibling;
      while (cursor && cursor.tagName !== 'H2') {
        if (cursor.tagName === 'H3' && /^(?:Language|Lenguaje)\s*[—-]\s*(?:Written|Escrito)/iu.test(cursor.textContent.trim())) {
          groupTrackScopes(cursor, 'music-track language-track');
          break;
        }
        cursor = cursor.nextElementSibling;
      }
    }
    groupTrackScopes(phaseEl.querySelector('h2[data-section-key="music"]'), 'music-track');
  });
}

function restoreProgramElementRegions() {
  document.querySelectorAll('.phase-content[data-phase^="age-"]').forEach((phaseEl) => {
    if (phaseEl.querySelector(':scope > .program-elements')) return;

    const firstDomainHeading = phaseEl.querySelector(':scope > h2[data-tier]');
    if (!firstDomainHeading) return;

    const resourcesHeading = phaseEl.querySelector(':scope > h2[data-section-key="resources"]');
    const region = document.createElement('div');
    region.className = 'program-elements';
    firstDomainHeading.before(region);

    let node = firstDomainHeading;
    while (node && node !== resourcesHeading) {
      const next = node.nextElementSibling;
      region.appendChild(node);
      node = next;
    }
  });
}

function restoreModelTrackers() {
  const localizedStatus = new Map([
    ['new', 'new'],
    ['nuevo', 'new'],
    ['active', 'active'],
    ['activo', 'active'],
    ['future', 'future'],
    ['futuro', 'future'],
    ['precursor', 'precursor'],
  ]);

  document.querySelectorAll('.phase-content h2[data-section-key="models"]').forEach((heading) => {
    const label = heading.nextElementSibling;
    const list = label?.nextElementSibling;
    if (label?.tagName !== 'P' || list?.tagName !== 'UL') return;
    if (!label.querySelector(':scope > strong')) return;

    const parsedItems = Array.from(list.children).map((item) => {
      const strong = item.querySelector(':scope > strong');
      const match = strong?.textContent.trim().match(/^([A-Z]?\d+)\s*·\s*([^·]+?)\s*·\s*(.+)$/iu);
      if (!match) return null;
      const status = localizedStatus.get(match[2].trim().toLocaleLowerCase());
      if (!status) return null;
      const fullText = item.textContent.trim();
      const tip = fullText.slice(fullText.indexOf(strong.textContent) + strong.textContent.length)
        .replace(/^\s*[—–-]\s*/u, '')
        .trim();
      return { item, number: match[1], status, shortName: match[3].trim(), tip };
    });
    if (parsedItems.some((item) => item === null)) return;

    const tracker = document.createElement('div');
    tracker.className = 'model-tracker';
    label.before(tracker);
    tracker.append(label, list);
    label.classList.add('model-tracker-label');
    list.classList.add('model-tracker-bar');

    parsedItems.forEach(({ item, number, status, shortName, tip }) => {
      item.className = `model-dot ${status}`;
      item.dataset.tip = tip;
      item.setAttribute('aria-label', `${number}. ${tip}`);
      item.innerHTML = '';

      const numberEl = document.createElement('span');
      numberEl.className = 'model-dot-num';
      numberEl.textContent = number;
      const nameEl = document.createElement('span');
      nameEl.className = 'model-dot-name';
      nameEl.textContent = shortName;
      item.append(numberEl, nameEl);
    });
  });
}

function restoreSemanticPresentationRegions() {
  restorePrincipleCards();
  restoreFrameworkModelTimeline();
  restoreEngagementCycle();
  restoreTriadGrid();
  restoreSixComponentGrid();
  restoreProgramElementRegions();
  restoreTrackGrids();
  restoreModelTrackers();
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
    showTab(state.currentTab);
    updateAllNavs();
    window.setTimeout(scrollToTarget, 50);
    return true;
  }

  scrollToTarget();
  return true;
}

function init() {
  restoreSemanticPresentationRegions();
  hideDecorativeIconsFromAssistiveTechnology();
  scopePhaseAnchors();
  setupProfileToggles();
  setupCollapsibleSections();
  wrapTablesForMobile();

  // Mobile FAB
  const fabMenu = document.getElementById('fab-menu');
  if (fabMenu) fabMenu.addEventListener('click', toggleFloatMenu);

  // Search icon
  const searchIcon = document.getElementById('search-icon');
  if (searchIcon) {
    searchIcon.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        openMobileSearch();
      } else {
        document.getElementById('search-input')?.focus();
      }
    });
  }

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

  // Internal anchor links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    // Universe navigation has its own view-aware router in domain.js.
    if (link.matches('[data-universe-nav], a[href^="#universe-"]')) return;
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
  initModelsView();
  initTargetsView();
  initResourcesView();
});
