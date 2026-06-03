// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import { remarkMermaid } from './plugins/remark-mermaid.mjs';

// Update these two if you rename the repo or use a custom domain.
const SITE = 'https://hamza-afraiz.github.io';
const BASE = '/Python-learning';

// ---------------------------------------------------------------------------
// MONETIZATION + SEARCH CONSOLE
// Fill these in after you get approved / verified. Leave empty to disable.
//   1. Google AdSense: paste your publisher ID, e.g. 'ca-pub-1234567890123456'
//   2. Google Search Console: paste the content value of the verification
//      <meta name="google-site-verification"> tag, e.g. 'AbC123...'
//   3. Also update public/ads.txt with the same publisher number.
// ---------------------------------------------------------------------------
const ADSENSE_CLIENT = ''; // e.g. 'ca-pub-XXXXXXXXXXXXXXXX'
const GOOGLE_SITE_VERIFICATION = ''; // e.g. 'xxxxxxxxxxxxxxxxxxxxxxxx'

/** Conditionally-built <head> entries for AdSense + Search Console. */
const monetizationHead = [
  ...(GOOGLE_SITE_VERIFICATION
    ? [
        {
          tag: /** @type {const} */ ('meta'),
          attrs: {
            name: 'google-site-verification',
            content: GOOGLE_SITE_VERIFICATION,
          },
        },
      ]
    : []),
  ...(ADSENSE_CLIENT
    ? [
        {
          tag: /** @type {const} */ ('meta'),
          attrs: { name: 'google-adsense-account', content: ADSENSE_CLIENT },
        },
        {
          tag: /** @type {const} */ ('script'),
          attrs: {
            async: true,
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
            crossorigin: 'anonymous',
          },
        },
      ]
    : []),
];

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',

  markdown: {
    remarkPlugins: [remarkMermaid],
  },

  integrations: [
    sitemap(),
    starlight({
      title: 'Backend Engineering, Explained',
      description:
        'A visual, plain-English guide to backend engineering: Python async, FastAPI, PostgreSQL, Kafka, Temporal, Docker, observability and distributed systems — learned by asking the right questions.',
      tagline: 'Distributed systems, async Python & data infrastructure — explained with diagrams.',

      favicon: '/favicon.svg',

      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },

      social: {
        github: 'https://github.com/Hamza-Afraiz/Python-learning',
      },

      editLink: {
        baseUrl:
          'https://github.com/Hamza-Afraiz/Python-learning/edit/main/',
      },

      lastUpdated: true,

      // SEO + Mermaid runtime injected into <head> of every page.
      head: [
        // AdSense + Search Console (only emitted when IDs are set above)
        ...monetizationHead,
        // Open Graph
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { tag: 'meta', attrs: { property: 'og:site_name', content: 'Backend Engineering, Explained' } },
        { tag: 'meta', attrs: { property: 'og:image', content: `${SITE}${BASE}/og.png` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:locale', content: 'en_US' } },
        // Twitter / X card
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: `${SITE}${BASE}/og.png` } },
        { tag: 'meta', attrs: { name: 'twitter:site', content: '@Hamza_Afraiz' } },
        { tag: 'meta', attrs: { name: 'twitter:creator', content: '@Hamza_Afraiz' } },
        // General SEO
        {
          tag: 'meta',
          attrs: {
            name: 'keywords',
            content:
              'python async, fastapi, postgresql, kafka, temporal, docker, celery, rabbitmq, observability, opentelemetry, prometheus, grafana, distributed systems, backend engineering, system design, pgvector, embeddings, RAG, sqlalchemy, microservices',
          },
        },
        { tag: 'meta', attrs: { name: 'author', content: 'Hamza Afraiz' } },
        { tag: 'meta', attrs: { name: 'robots', content: 'index, follow, max-image-preview:large' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#0d1117' } },
        { tag: 'link', attrs: { rel: 'manifest', href: `${BASE}/manifest.webmanifest` } },
        // JSON-LD structured data (rich results)
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          content: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Backend Engineering, Explained',
            url: `${SITE}${BASE}/`,
            description:
              'A visual, plain-English guide to backend engineering and distributed systems.',
            inLanguage: 'en',
            author: {
              '@type': 'Person',
              name: 'Hamza Afraiz',
              url: 'https://github.com/Hamza-Afraiz',
            },
          }),
        },
        // Mermaid diagrams (client-side, theme-aware)
        {
          tag: 'script',
          attrs: { type: 'module' },
          content: `
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

function currentTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'light' ? 'default' : 'dark';
}

function renderMermaid() {
  const nodes = document.querySelectorAll('pre.mermaid');
  if (!nodes.length) return;
  nodes.forEach((n) => {
    if (n.dataset.rendered === 'true') return;
    if (!n.dataset.src) n.dataset.src = n.textContent || '';
  });
  mermaid.initialize({
    startOnLoad: false,
    theme: currentTheme(),
    securityLevel: 'loose',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  });
  nodes.forEach(async (n, i) => {
    const src = n.dataset.src || n.textContent || '';
    try {
      const { svg } = await mermaid.render('m-' + Date.now() + '-' + i, src);
      n.innerHTML = svg;
      n.dataset.rendered = 'true';
    } catch (e) {
      // leave source visible if it fails to parse
    }
  });
}

// Re-render on load, Astro client navigation, and theme toggle.
document.addEventListener('DOMContentLoaded', renderMermaid);
document.addEventListener('astro:page-load', () => {
  document.querySelectorAll('pre.mermaid').forEach((n) => (n.dataset.rendered = 'false'));
  renderMermaid();
});
new MutationObserver(() => {
  document.querySelectorAll('pre.mermaid').forEach((n) => {
    if (n.dataset.rendered === 'true') { n.innerHTML = ''; n.dataset.rendered = 'false'; }
  });
  renderMermaid();
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
`,
        },
      ],

      customCss: ['./src/styles/custom.css'],

      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Welcome', slug: 'index' },
            { label: 'How to use this site', slug: 'guides/how-to-use' },
          ],
        },
        {
          label: 'Visual Guides',
          autogenerate: { directory: 'concepts' },
        },
        {
          label: 'Q&A Knowledge Base',
          autogenerate: { directory: 'qa' },
        },
        {
          label: 'Site',
          items: [
            { label: 'About', slug: 'about' },
            { label: 'Privacy Policy', slug: 'privacy-policy' },
          ],
        },
      ],
    }),
  ],
});
