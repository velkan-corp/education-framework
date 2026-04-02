export const PHASE_CONTENT_IDS = [
  'framework',
  'age-0-1',
  'age-1-3',
  'age-4-7',
  'age-8-10',
  'age-11-13',
  'age-14-16',
  'age-17-18',
] as const;

export const UNIVERSE_PHASE_IDS = [
  'age-0-1',
  'age-1-3',
  'age-4-7',
  'age-8-10',
  'age-11-13',
  'age-14-16',
  'age-17-18',
] as const;

export const UNIVERSE_TAGS = [
  'books',
  'anime',
  'cinema',
  'comics',
  'game',
  'maker',
  'english',
  'spanish',
  'french',
  'japanese',
  'strategy',
  'classics',
  'philosophy',
  'stem',
] as const;

export const UNIVERSE_KINDS = [
  'fictional-universe',
  'creator-canon',
  'strategy-system',
  'maker-system',
  'literary-canon',
] as const;

export const UNIVERSE_LANGUAGES = [
  'english',
  'spanish',
  'french',
  'japanese',
  'chinese',
  'german',
  'greek',
  'polish',
  'russian',
  'swedish',
] as const;

export const TARGET_IDS = [
  'resilient-self-efficacy',
  'agency',
  'self-awareness',
  'deep-curiosity',
  'first-principles-reasoning',
  'communication-mastery',
  'relational-intelligence',
  'empathy-kindness',
  'physical-system-mastery',
  'adaptability',
] as const;

export const MODEL_IDS = [
  'cause-effect',
  'feedback-loops',
  'incentives',
  'inversion',
  'maps-not-territory',
  'compounding',
  'probability',
  'emergence',
  'complementary-opposites',
  'via-negativa',
  'antifragility',
  'model-failure',
] as const;

export const INTENSITY_LEVELS = ['low', 'medium', 'high', 'extreme'] as const;

export const RISK_FLAGS = [
  'violence',
  'sexuality',
  'horror',
  'despair',
  'manipulation',
  'coercion',
] as const;

export const SOCIAL_VALUE_LEVELS = ['niche', 'bridge', 'broad'] as const;

export const ENGAGEMENT_MODES = ['absorb', 'interrogate', 'make', 'dim', 'critique'] as const;

export const UNIVERSE_KIND_LABELS: Record<(typeof UNIVERSE_KINDS)[number], string> = {
  'fictional-universe': 'Fictional Universe',
  'creator-canon': 'Creator Canon',
  'strategy-system': 'Strategy System',
  'maker-system': 'Maker System',
  'literary-canon': 'Literary Canon',
};

export const LANGUAGE_LABELS: Record<(typeof UNIVERSE_LANGUAGES)[number], string> = {
  english: 'English',
  spanish: 'Spanish',
  french: 'French',
  japanese: 'Japanese',
  chinese: 'Chinese',
  german: 'German',
  greek: 'Greek',
  polish: 'Polish',
  russian: 'Russian',
  swedish: 'Swedish',
};

export const TARGET_LABELS: Record<(typeof TARGET_IDS)[number], string> = {
  'resilient-self-efficacy': 'Resilient Self-Efficacy',
  agency: 'Agency',
  'self-awareness': 'Self-Awareness',
  'deep-curiosity': 'Deep Curiosity',
  'first-principles-reasoning': 'First-Principles Reasoning',
  'communication-mastery': 'Communication Mastery',
  'relational-intelligence': 'Relational Intelligence',
  'empathy-kindness': 'Empathy & Kindness',
  'physical-system-mastery': 'Physical System Mastery',
  adaptability: 'Adaptability',
};

export const MODEL_LABELS: Record<(typeof MODEL_IDS)[number], string> = {
  'cause-effect': 'Cause & Effect',
  'feedback-loops': 'Feedback Loops',
  incentives: 'Incentives',
  inversion: 'Inversion',
  'maps-not-territory': 'Maps ≠ Territory',
  compounding: 'Compounding',
  probability: 'Probability',
  emergence: 'Emergence',
  'complementary-opposites': 'Complementary Opposites',
  'via-negativa': 'Via Negativa',
  antifragility: 'Antifragility',
  'model-failure': 'Model Failure',
};

export const INTENSITY_LABELS: Record<(typeof INTENSITY_LEVELS)[number], string> = {
  low: 'Low Intensity',
  medium: 'Medium Intensity',
  high: 'High Intensity',
  extreme: 'Extreme Intensity',
};

export const RISK_LABELS: Record<(typeof RISK_FLAGS)[number], string> = {
  violence: 'Violence',
  sexuality: 'Sexuality',
  horror: 'Horror',
  despair: 'Despair',
  manipulation: 'Manipulation',
  coercion: 'Coercion',
};

export const SOCIAL_VALUE_LABELS: Record<(typeof SOCIAL_VALUE_LEVELS)[number], string> = {
  niche: 'Niche Social Value',
  bridge: 'Bridge Social Value',
  broad: 'Broad Social Value',
};

export const ENGAGEMENT_MODE_LABELS: Record<(typeof ENGAGEMENT_MODES)[number], string> = {
  absorb: 'Absorb',
  interrogate: 'Interrogate',
  make: 'Make',
  dim: 'Full DIM',
  critique: 'Critique',
};
