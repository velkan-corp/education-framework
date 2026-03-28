import { defineCollection, z } from 'astro:content';

const phases = defineCollection({
  type: 'content',
  schema: z.object({
    phaseId: z.string(),
    label: z.string(),
    order: z.number(),
  }),
});

export const collections = { phases };
