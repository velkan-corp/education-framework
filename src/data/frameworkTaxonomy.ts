/* ── Framework Taxonomy — config constants for cross-age views ── */
/* Model and target content lives in content collections (src/content/models/, targets/) */

// ── Layer Labels ──

export const LAYER_LABELS: Record<number, { en: string; es: string }> = {
  1: { en: 'Layer 1: Experience (Age 4-7)', es: 'Capa 1: Experimentar (4-7)' },
  2: { en: 'Layer 2: Name (Age 8-10)', es: 'Capa 2: Nombrar (8-10)' },
  3: { en: 'Layer 3: Stress-Test (Age 11-13)', es: 'Capa 3: Poner a Prueba (11-13)' },
  4: { en: 'Layer 4: Synthesize (Age 14-16)', es: 'Capa 4: Sintetizar (14-16)' },
  5: { en: 'Layer 5: Critique (Age 17-18)', es: 'Capa 5: Criticar (17-18)' },
};

// ── Resource Categories ──

export const RESOURCE_CATEGORIES = ['books', 'toys', 'equipment', 'services', 'media', 'games'] as const;

export const RESOURCE_CATEGORY_LABELS: Record<(typeof RESOURCE_CATEGORIES)[number], { en: string; es: string }> = {
  books: { en: 'Books', es: 'Libros' },
  toys: { en: 'Toys', es: 'Juguetes' },
  equipment: { en: 'Equipment', es: 'Equipamiento' },
  services: { en: 'Services', es: 'Servicios' },
  media: { en: 'Media', es: 'Medios' },
  games: { en: 'Games', es: 'Juegos' },
};

// ── Age Phases (for cross-age views) ──

export const AGE_PHASES = [
  { id: 'age-0-1', label: { en: '0-1', es: '0-1' } },
  { id: 'age-1-3', label: { en: '1-3', es: '1-3' } },
  { id: 'age-4-7', label: { en: '4-7', es: '4-7' } },
  { id: 'age-8-10', label: { en: '8-10', es: '8-10' } },
  { id: 'age-11-13', label: { en: '11-13', es: '11-13' } },
  { id: 'age-14-16', label: { en: '14-16', es: '14-16' } },
  { id: 'age-17-18', label: { en: '17-18', es: '17-18' } },
] as const;
