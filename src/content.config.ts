import { defineCollection, z } from 'astro:content';
import {
  ENGAGEMENT_MODES,
  INTENSITY_LEVELS,
  MODEL_IDS,
  PHASE_CONTENT_IDS,
  RISK_FLAGS,
  SOCIAL_VALUE_LEVELS,
  TARGET_IDS,
  UNIVERSE_KINDS,
  UNIVERSE_LANGUAGES,
  UNIVERSE_PHASE_IDS,
  UNIVERSE_TAGS,
} from './data/universeTaxonomy';

const phases = defineCollection({
  type: 'content',
  schema: z.object({
    phaseId: z.enum(PHASE_CONTENT_IDS),
    label: z.string(),
    order: z.number(),
  }),
});

const universes = defineCollection({
  type: 'content',
  schema: z.object({
    label: z.string(),
    kind: z.enum(UNIVERSE_KINDS).optional(),
    summary: z.string().optional(),
    whyItBelongs: z.string().optional(),
    tags: z.array(z.enum(UNIVERSE_TAGS)).nonempty(),
    languages: z.array(z.enum(UNIVERSE_LANGUAGES)).optional(),
    targets: z.array(z.enum(TARGET_IDS)).optional(),
    models: z.array(z.enum(MODEL_IDS)).optional(),
    intensity: z.enum(INTENSITY_LEVELS).optional(),
    riskFlags: z.array(z.enum(RISK_FLAGS)).optional(),
    socialValue: z.enum(SOCIAL_VALUE_LEVELS).optional(),
    substitutes: z.array(z.string()).optional(),
    phases: z.array(z.object({
      phaseId: z.enum(UNIVERSE_PHASE_IDS),
      tier: z.enum(['foundational', 'core', 'recommended']),
      title: z.string(),
      description: z.string(),
      mode: z.enum(ENGAGEMENT_MODES).optional(),
      goals: z.array(z.string()).optional(),
      cautions: z.string().optional(),
      projects: z.array(z.string()).optional(),
    })),
  }),
});

export const collections = { phases, universes };
