import { updateAllNavs } from './navigation.js';
import { formatAgeLabel, uiText } from './uiLocale.js';

let targetMap = null;

function buildTargetMap() {
  const map = new Map();
  const agePhases = ['age-0-1', 'age-1-3', 'age-4-7', 'age-8-10', 'age-11-13', 'age-14-16', 'age-17-18'];

  agePhases.forEach(phaseId => {
    const phaseEl = document.querySelector(`.phase-content[data-phase="${phaseId}"]`);
    if (!phaseEl) return;
    const phaseLabel = phaseEl.dataset.label;
    // Only explicit Activity Map grids represent the eleven framework targets.
    // Other numbered grids (for example, weekly time allocations at ages 14-18)
    // deliberately use different semantics and must never enter this timeline.
    const cards = phaseEl.querySelectorAll('.target-grid[data-target-map] .target-card');
    const seenNumbers = new Set();

    cards.forEach(card => {
      const numEl = card.querySelector('.target-num');
      const title = card.querySelector('.target-card-title, h4');
      const paragraphs = card.querySelectorAll('p');
      if (!numEl || !title) return;

      const num = parseInt(numEl.textContent);
      if (!Number.isInteger(num) || num < 1 || num > 11 || seenNumbers.has(num)) {
        console.error(`Invalid target map entry in ${phaseId}: target ${numEl.textContent}`);
        return;
      }
      seenNumbers.add(num);
      const name = title.textContent.trim().replace(/[.!?]+$/u, '');
      const desc = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1].innerHTML : '';
      const isSeed = /\b(?:seed|semilla)\b/iu.test(name);
      const canonicalName = name
        .replace(/^\s*semilla\s+de\s+/iu, '')
        .replace(/\s+seed\s*$/iu, '')
        .trim();

      if (!map.has(num)) {
        map.set(num, { name: canonicalName, phases: [] });
      }
      map.get(num).phases.push({ phaseId, phaseLabel, name, description: desc, isSeed });
    });
  });

  // Every age phase has an explicit eleven-target progression map. Source and
  // rendered-build audits enforce that invariant; this runtime check makes a
  // malformed partial page visible during development instead of fabricating
  // a placeholder that could be mistaken for curriculum content.
  const allPhases = agePhases;
  map.forEach((data, num) => {
    const existing = new Set(data.phases.map(p => p.phaseId));
    const missing = allPhases.filter((phaseId) => !existing.has(phaseId));
    if (missing.length > 0) {
      console.error(`Target ${num} is missing explicit phase content: ${missing.join(', ')}`);
    }
    // Sort phases by age order
    const order = Object.fromEntries(allPhases.map((id, i) => [id, i]));
    data.phases.sort((a, b) => (order[a.phaseId] ?? 99) - (order[b.phaseId] ?? 99));
  });

  return map;
}

function showTargetDetail(targetId) {
  if (!targetMap) return;

  const grid = document.getElementById('targets-grid');
  const detail = document.getElementById('targets-detail');
  if (!grid || !detail) return;

  // Find the target by ID — match against the browse card's data-browse-id
  const card = document.querySelector(`.browse-card[data-browse-id="${targetId}"]`);
  if (!card) return;
  const num = parseInt(card.querySelector('.browse-num')?.textContent);
  const data = targetMap.get(num);
  if (!data) return;

  grid.classList.add('hidden');
  detail.classList.remove('hidden');

  const header = document.getElementById('targets-detail-header');
  header.innerHTML = `
    <div class="browse-detail-title">
      <span class="browse-num">${num}</span>
      <h1>${data.name}</h1>
    </div>
  `;

  const timeline = document.getElementById('targets-timeline');
  timeline.innerHTML = data.phases.map(phase => `
    <div class="timeline-phase">
      <div class="timeline-header">
        <span class="timeline-age">${formatAgeLabel(phase.phaseLabel)}</span>
        ${phase.isSeed ? `<span class="seed-badge">${uiText('seed')}</span>` : `<span class="full-badge">${uiText('full')}</span>`}
      </div>
      <div class="timeline-content">
        <h4>${phase.name}</h4>
        <p>${phase.description}</p>
      </div>
    </div>
  `).join('');

  updateAllNavs();
  window.scrollTo(0, 0);
}

function showTargetsGrid() {
  document.getElementById('targets-detail')?.classList.add('hidden');
  document.getElementById('targets-grid')?.classList.remove('hidden');
  updateAllNavs();
}

function tagTargetCardsWithPhases() {
  if (!targetMap) return;
  document.querySelectorAll('#targets-view .browse-card').forEach((card) => {
    const num = parseInt(card.querySelector('.browse-num')?.textContent, 10);
    const data = targetMap.get(num);
    if (!data) return;
    const phaseIds = Array.from(new Set(data.phases.map((p) => p.phaseId)));
    card.dataset.phases = phaseIds.join(',');
  });
}

export function initTargetsView() {
  targetMap = buildTargetMap();
  tagTargetCardsWithPhases();

  const grid = document.getElementById('targets-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.browse-card');
    if (!card) return;
    showTargetDetail(card.dataset.browseId);
  });

  document.getElementById('targets-back')?.addEventListener('click', () => showTargetsGrid());
}
