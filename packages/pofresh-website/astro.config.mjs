import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pofresh.dev',
  base: '/',
  integrations: [
    vue(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  markdown: {
    syntaxHighlight: 'prism',
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
    remarkPlugins: [
      'remark-code-titles',
    ],
    rehypePlugins: [
      'rehype-slug',
    ],
  },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
  build: {
    format: 'file',
  },
});