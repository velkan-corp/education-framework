import { defineCollection, z } from 'astro:content';

const phases = defineCollection({
  type: 'content',
  schema: z.object({
    phaseId: z.string(),
    label: z.string(),
    order: z.number(),
  }),
});

const universes = defineCollection({
  type: 'content',
  schema: z.object({
    label: z.string(),
    tags: z.array(z.string()),
    phases: z.array(z.object({
      phaseId: z.string(),
      tier: z.enum(['foundational', 'core', 'recommended']),
      title: z.string(),
      description: z.string(),
    })),
  }),
});

export const collections = { phases, universes };
