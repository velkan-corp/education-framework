import { updateAllNavs } from './navigation.js';

let targetMap = null;

function buildTargetMap() {
  const map = new Map();
  const agePhases = ['age-0-1', 'age-1-3', 'age-4-7', 'age-8-10', 'age-11-13', 'age-14-16', 'age-17-18'];

  agePhases.forEach(phaseId => {
    const phaseEl = document.querySelector(`.phase-content[data-phase="${phaseId}"]`);
    if (!phaseEl) return;
    const phaseLabel = phaseEl.dataset.label;
    const cards = phaseEl.querySelectorAll('.target-grid .target-card');

    cards.forEach(card => {
      const numEl = card.querySelector('.target-num');
      const h4 = card.querySelector('h4');
      const p = card.querySelector('p');
      if (!numEl || !h4) return;

      const num = parseInt(numEl.textContent);
      const name = h4.textContent.trim();
      const desc = p ? p.innerHTML : '';
      const isSeed = name.toLowerCase().includes('seed');

      if (!map.has(num)) {
        map.set(num, { name: name.replace(/\s*seed\s*/i, ''), phases: [] });
      }
      map.get(num).phases.push({ phaseId, phaseLabel, name, description: desc, isSeed });
    });
  });

  // Phases 14-16 and 17-18 may not have explicit target grids.
  // Add placeholder entries so the timeline shows all 7 phases.
  const allPhases = ['age-0-1', 'age-1-3', 'age-4-7', 'age-8-10', 'age-11-13', 'age-14-16', 'age-17-18'];
  map.forEach((data, num) => {
    const existing = new Set(data.phases.map(p => p.phaseId));
    allPhases.forEach(phaseId => {
      if (!existing.has(phaseId)) {
        const phaseEl = document.querySelector(`.phase-content[data-phase="${phaseId}"]`);
        if (phaseEl) {
          data.phases.push({
            phaseId,
            phaseLabel: phaseEl.dataset.label,
            name: data.name,
            description: '<em>Target activity map not yet written for this phase. See the phase page for related content in domain sections.</em>',
            isSeed: false
          });
        }
      }
    });
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
        <span class="timeline-age">${phase.phaseLabel}</span>
        ${phase.isSeed ? '<span class="seed-badge">Seed</span>' : '<span class="full-badge">Full</span>'}
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

export function initTargetsView() {
  targetMap = buildTargetMap();

  const grid = document.getElementById('targets-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.browse-card');
    if (!card) return;
    showTargetDetail(card.dataset.browseId);
  });

  document.getElementById('targets-back')?.addEventListener('click', () => showTargetsGrid());
}
