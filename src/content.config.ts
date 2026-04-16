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

const phaseSchema = z.object({
  phaseId: z.enum(PHASE_CONTENT_IDS),
  label: z.string(),
  order: z.number(),
});

const modelSchema = z.object({
  modelId: z.enum(MODEL_IDS),
  number: z.number().int().min(1).max(19),
  layer: z.number().int().min(1).max(4),
  shortName: z.string(),
});

const targetSchema = z.object({
  targetId: z.enum(TARGET_IDS),
  number: z.number().int().min(1).max(11),
});

const universeSchema = z.object({
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
});

const phases = defineCollection({ type: 'content', schema: phaseSchema });
const universes = defineCollection({ type: 'content', schema: universeSchema });
const models = defineCollection({ type: 'content', schema: modelSchema });
const targets = defineCollection({ type: 'content', schema: targetSchema });

// Spanish collections — same schemas, separate content
const phasesEs = defineCollection({ type: 'content', schema: phaseSchema });
const universesEs = defineCollection({ type: 'content', schema: universeSchema });
const modelsEs = defineCollection({ type: 'content', schema: modelSchema });
const targetsEs = defineCollection({ type: 'content', schema: targetSchema });

export const collections = {
  phases, universes, models, targets,
  'phases-es': phasesEs, 'universes-es': universesEs, 'models-es': modelsEs, 'targets-es': targetsEs,
};
