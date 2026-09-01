import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { phasePresentationPlugin } from './src/markdown/phasePresentation.mjs';

export default defineConfig({
  site: 'https://velkancorp.github.io',
  base: '/education-framework',
  markdown: {
    processor: satteri({
      hastPlugins: [phasePresentationPlugin],
    }),
  },
});
