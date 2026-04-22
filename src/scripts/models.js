import { updateAllNavs } from './navigation.js';

let modelMap = null;

function buildModelMap() {
  const map = new Map();
  const agePhases = ['age-4-7', 'age-8-10', 'age-11-13', 'age-14-16', 'age-17-18'];

  agePhases.forEach(phaseId => {
    const phaseEl = document.querySelector(`.phase-content[data-phase="${phaseId}"]`);
    if (!phaseEl) return;
    const phaseLabel = phaseEl.dataset.label;

    // Find all model tables — rows with "(#N)" in the first cell
    const tables = phaseEl.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;

        const cellText = cells[0].textContent;
        // Match (#N) anywhere in the first cell — handles "Model (#N)", "Model (#N) — Critique", "Model A (#3) + Model B (#5)"
        const matches = [...cellText.matchAll(/\(#(\d+)\)/g)];
        if (matches.length === 0) return;

        const content = cells[1].innerHTML;

        // Register under each referenced model number
        matches.forEach(match => {
          const num = parseInt(match[1]);
          const modelName = cellText.replace(/\s*\(#\d+\)/g, '').replace(/\s*[—–+]\s*$/, '').trim();

          if (!map.has(num)) {
            map.set(num, { name: modelName, phases: [] });
          }

          const existing = map.get(num).phases;
          if (!existing.some(p => p.phaseId === phaseId && p.content === content)) {
            existing.push({ phaseId, phaseLabel, content, modelName: cellText.trim() });
          }
        });
      });
    });
  });

  // Layer 5 (17-18): Critique. All 19 models are critiqued — most don't have explicit (#N) rows.
  // Inject a 17-18 entry for every model that doesn't already have one.
  const phase17 = document.querySelector('.phase-content[data-phase="age-17-18"]');
  const phase17Label = phase17?.dataset?.label || '17–18';
  const layer5Fallback = '<p>Layer 5: Critique — all 19 models are reviewed, stress-tested, and critiqued. The goal: automatic deployment of 12-15 models in conversation and analysis. "All models are wrong; some are useful" — internalized as habit, not slogan.</p>';
  map.forEach((data, num) => {
    if (!data.phases.some(p => p.phaseId === 'age-17-18')) {
      data.phases.push({
        phaseId: 'age-17-18',
        phaseLabel: phase17Label,
        content: layer5Fallback,
        modelName: 'Layer 5: Critique'
      });
    }
  });

  // Sort all phase entries in age order
  const phaseOrder = { 'age-4-7': 0, 'age-8-10': 1, 'age-11-13': 2, 'age-14-16': 3, 'age-17-18': 4 };
  map.forEach(data => {
    data.phases.sort((a, b) => (phaseOrder[a.phaseId] ?? 99) - (phaseOrder[b.phaseId] ?? 99));
  });

  return map;
}

function showModelDetail(modelId) {
  if (!modelMap) return;

  const grid = document.getElementById('models-grid');
  const detail = document.getElementById('models-detail');
  if (!grid || !detail) return;

  const card = document.querySelector(`#models-grid .browse-card[data-browse-id="${modelId}"]`);
  if (!card) return;
  const num = parseInt(card.querySelector('.browse-num')?.textContent);
  const data = modelMap.get(num);

  grid.classList.add('hidden');
  detail.classList.remove('hidden');

  const header = document.getElementById('models-detail-header');
  const cardBody = card.querySelector('.browse-card-body');
  const name = cardBody?.querySelector('h1')?.textContent || `Model #${num}`;
  header.innerHTML = `
    <div class="browse-detail-title">
      <span class="browse-num">${num}</span>
      <h1>${name}</h1>
    </div>
  `;

  const timeline = document.getElementById('models-timeline');
  if (!data || data.phases.length === 0) {
    timeline.innerHTML = '<p class="browse-empty">No teaching content found for this model across age phases.</p>';
  } else {
    timeline.innerHTML = data.phases.map(phase => `
      <div class="timeline-phase">
        <div class="timeline-header">
          <span class="timeline-age">${phase.phaseLabel}</span>
        </div>
        <div class="timeline-content">
          <p><strong>${phase.modelName}</strong></p>
          <p>${phase.content}</p>
        </div>
      </div>
    `).join('');
  }

  updateAllNavs();
  window.scrollTo(0, 0);
}

function showModelsGrid() {
  document.getElementById('models-detail')?.classList.add('hidden');
  document.getElementById('models-grid')?.classList.remove('hidden');
  updateAllNavs();
}

function setupLayerFilters() {
  const filterRow = document.getElementById('model-layer-filters');
  if (!filterRow) return;

  filterRow.addEventListener('click', (e) => {
    const pill = e.target.closest('.browse-filter-pill');
    if (!pill) return;

    // Update active state
    filterRow.querySelectorAll('.browse-filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    const layer = pill.dataset.layer;
    document.querySelectorAll('#models-grid .browse-layer-group').forEach(group => {
      if (layer === 'all') {
        group.classList.remove('hidden');
      } else {
        group.classList.toggle('hidden', group.dataset.layerGroup !== layer);
      }
    });
  });
}

function tagModelCardsWithPhases() {
  if (!modelMap) return;
  document.querySelectorAll('#models-view .browse-card').forEach((card) => {
    const num = parseInt(card.querySelector('.browse-num')?.textContent, 10);
    const data = modelMap.get(num);
    if (!data) return;
    const phaseIds = Array.from(new Set(data.phases.map((p) => p.phaseId)));
    card.dataset.phases = phaseIds.join(',');
  });
}

export function initModelsView() {
  modelMap = buildModelMap();
  tagModelCardsWithPhases();
  setupLayerFilters();

  const grid = document.getElementById('models-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.browse-card');
    if (!card) return;
    showModelDetail(card.dataset.browseId);
  });

  document.getElementById('models-back')?.addEventListener('click', () => showModelsGrid());
}
