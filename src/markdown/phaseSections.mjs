const sections = [
  {
    key: 'activity',
    id: 's-activity',
    icon: 'calendar_month',
    titles: ['Activity Map', 'Mapa de Actividades'],
  },
  {
    key: 'target-progression',
    id: 's-target-progression',
    icon: 'track_changes',
    titles: ['Eleven-Target Progression', 'Progresión de los Once Objetivos'],
  },
  {
    key: 'rhythm',
    id: 's-rhythm',
    icon: 'calendar_view_week',
    titles: ['Weekly Rhythm', 'Ritmo Semanal'],
  },
  {
    key: 'models',
    id: 's-models',
    icon: 'cognition',
    titles: [
      'Mental Models',
      'Mental Models — Layer 4: Synthesize',
      'Mental Models — Layer 5: Critique',
      'The Thinking Toolkit',
      'Modelos Mentales',
      'Modelos Mentales — Capa 4: Sintetizar',
      'Modelos Mentales — Capa 5: Criticar',
      'El Kit de Herramientas de Pensamiento',
    ],
  },
  {
    key: 'communication',
    id: 's-communication',
    icon: 'record_voice_over',
    tier: 'foundational',
    titles: [
      'Communication & Expression',
      'Comunicación y Expresión',
      'Comunicacion y Expresion',
    ],
  },
  {
    key: 'music',
    id: 's-music',
    icon: 'music_note',
    tier: 'core',
    titles: ['Music', 'Música', 'Musica'],
  },
  {
    key: 'mind-body',
    id: 's-mind-body',
    icon: 'fitness_center',
    tier: 'foundational',
    titles: ['Mind & Body', 'Mente y Cuerpo'],
  },
  {
    key: 'social',
    id: 's-social',
    icon: 'people',
    tier: {
      default: 'foundational',
      'age-14-16': 'core',
      'age-17-18': 'core',
    },
    titles: ['Social & Relational', 'Social y Relacional'],
  },
  {
    key: 'knowledge',
    id: 's-knowledge',
    icon: 'lightbulb',
    tier: 'core',
    titles: ['Knowledge & Thinking', 'Conocimiento y Pensamiento'],
  },
  {
    key: 'making',
    id: 's-making',
    icon: 'construction',
    tier: 'foundational',
    titles: ['Making & Craft', 'Creación y Artesanía'],
  },
  {
    key: 'culture',
    id: 's-culture',
    icon: 'travel_explore',
    tier: {
      default: 'recommended',
      'age-17-18': 'core',
    },
    titles: ['Culture & Inner Life', 'Cultura y Vida Interior'],
  },
  {
    key: 'planning',
    id: 's-planning',
    icon: 'calendar_month',
    tier: 'foundational',
    titles: [
      'Planning & Milestones',
      'Planificación e Hitos',
      'Planificacion e Hitos',
    ],
  },
  {
    key: 'resources',
    id: 's-resources',
    icon: 'local_library',
    titles: ['Resources', 'Recursos'],
  },
  {
    key: 'parental-substrate',
    id: 's-parental-substrate',
    icon: 'favorite',
    tier: 'foundational',
    titles: [
      'Parenting Foundations — Attachment',
      'Parenting Foundations — Emotion Coaching & Repair',
      'Parenting Foundations — Mentalisation & Mature Repair',
      'Fundamentos de Crianza — Apego',
      'Fundamentos de Crianza — Coaching Emocional y Reparación',
      'Fundamentos de Crianza — Mentalización y Reparación Madura',
    ],
  },
  {
    key: 'development',
    id: 's-dev',
    icon: 'neurology',
    titles: ['Developmental Reality', 'Realidad del Desarrollo'],
  },
  {
    key: 'attachment',
    id: 's-attachment',
    icon: 'favorite',
    titles: ['Parenting Foundations', 'Fundamentos de Crianza'],
  },
  {
    key: 'principles',
    id: 's-principles',
    icon: 'star',
    titles: ['The Ten Principles', 'Los Diez Principios'],
  },
  {
    key: 'targets',
    id: 's-targets',
    icon: 'emoji_events',
    titles: ['The Eleven Targets', 'Los Once Objetivos'],
  },
  {
    key: 'philosophy',
    id: 's-philosophy',
    icon: 'star',
    titles: ['Philosophy', 'Filosofía'],
  },
  {
    key: 'methods',
    id: 's-methods',
    icon: 'build',
    titles: ['Methods', 'Métodos'],
  },
  {
    key: 'operations',
    id: 's-operations',
    icon: 'settings',
    titles: ['Operations', 'Operaciones'],
  },
  {
    key: 'operational',
    id: 's-operational',
    icon: 'build',
    titles: [
      'Engagement & Teaching',
      'Engagement y Enseñanza',
      'Participación y Enseñanza',
    ],
  },
  {
    key: 'hardship',
    id: 's-hardship',
    icon: 'local_fire_department',
    titles: [
      'Hardship Architecture — Limits, Character & Duty',
      'Arquitectura de la Dificultad — Doce Dominios Fundacionales No Sustituibles',
      'Arquitectura de la Dificultad — Límites, Carácter y Deber',
    ],
  },
  {
    key: 'application',
    id: 's-application',
    icon: 'workspace_premium',
    titles: ['The Application Architecture', 'La Arquitectura de Aplicación'],
  },
  {
    key: 'safety',
    id: 's-safety',
    icon: 'shield',
    titles: [
      'Adolescent Safety & Digital Reality',
      'Seguridad Adolescente y Realidad Digital',
    ],
  },
  {
    key: 'unstructured',
    id: 's-unstructured',
    icon: 'mood',
    titles: ['Protecting Unstructured Time', 'Protegiendo el Tiempo No Estructurado'],
  },
  {
    key: 'sleep',
    id: 's-sleep',
    icon: 'fitness_center',
    titles: ['Sleep, Nutrition & Recovery', 'Sueño, Nutrición y Recuperación'],
  },
  {
    key: 'quarterly',
    id: 's-quarterly',
    icon: 'calendar_month',
    titles: ['Quarterly Review Protocol', 'Protocolo de Revisión Trimestral'],
  },
  {
    key: 'measure',
    id: 's-measure',
    icon: 'trending_up',
    titles: ["How to Know It's Working", 'Cómo Saber que Está Funcionando'],
  },
  {
    key: 'joy-kindness-luck',
    id: 's-joy-kindness-luck',
    icon: 'favorite',
    titles: ['Joy, Kindness & Luck', 'Alegría, Amabilidad y Suerte'],
  },
  {
    key: 'parent',
    id: 's-parent',
    icon: 'self_improvement',
    titles: ['Parent Self-Development', 'Autodesarrollo del Progenitor'],
  },
  {
    key: 'coparent',
    id: 's-coparent',
    icon: 'family_restroom',
    titles: ['Co-Parenting: Asymmetric Roles', 'Co-Crianza: Roles Asimétricos'],
  },
  {
    key: 'coercion-risk',
    id: 's-coercion',
    icon: 'visibility',
    titles: [
      'Risk 1: The Framework Becomes Coercive',
      'Riesgo 1: El Marco Se Vuelve Coercitivo',
    ],
  },
  {
    key: 'rejection-risk',
    id: 's-rejection',
    icon: 'visibility',
    titles: [
      'Risk 2: The Child Rejects the Framework',
      'Riesgo 2: El Niño Rechaza el Marco',
    ],
  },
  {
    key: 'archetype-risk',
    id: 's-archetype',
    icon: 'visibility',
    titles: [
      'Risk 3: Building for the Wrong Child',
      'Riesgo 3: Construir para el Niño Equivocado',
    ],
  },
  {
    key: 'interna',
    id: 's-interna',
    icon: 'people',
    titles: ['The Interna Brief', 'El Briefing de la Interna'],
  },
  {
    key: 'fun',
    id: 's-fun',
    icon: 'theaters',
    titles: ['Pop Culture & Fun', 'Cultura Popular y Diversión'],
  },
  {
    key: 'appendix',
    id: 's-appendix',
    icon: 'description',
    titles: [
      'Appendix: Tactical Implementation Details',
      'Apéndice: Detalles Tácticos de Implementación',
    ],
  },
];

export function normalizeHeadingText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\s+/gu, ' ')
    .trim();
}

function resolveTier(tier, phaseId) {
  if (typeof tier === 'string') return tier;
  if (!tier) return undefined;
  return tier[phaseId] ?? tier.default;
}

const sectionByTitle = new Map();
for (const section of sections) {
  for (const title of section.titles) {
    const normalized = normalizeHeadingText(title);
    if (sectionByTitle.has(normalized)) {
      throw new Error(`Duplicate phase section title: ${normalized}`);
    }
    sectionByTitle.set(normalized, section);
  }
}

export const PHASE_SECTIONS = Object.freeze(sections);

export function resolvePhaseSection(title, phaseId = '') {
  const section = sectionByTitle.get(normalizeHeadingText(title));
  if (!section) return undefined;
  return {
    key: section.key,
    id: section.id,
    icon: section.icon,
    tier: resolveTier(section.tier, phaseId),
  };
}
