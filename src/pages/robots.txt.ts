import type { APIRoute } from 'astro';

/* Search engines are welcome. Crawlers that gather material to train AI models
   are asked to stay away: the drawings and writing here are all rights
   reserved, including for machine-learning training (see LICENSE). */
const aiCrawlers = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'CCBot', 'Google-Extended', 'Applebot-Extended',
  'anthropic-ai', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Bytespider', 'Amazonbot',
  'meta-externalagent', 'FacebookBot', 'cohere-ai', 'Diffbot', 'ImagesiftBot', 'Omgilibot', 'Timpibot'
];

export const GET: APIRoute = ({ site }) =>
  new Response(
    aiCrawlers.map((bot) => `User-agent: ${bot}\nDisallow: /\n`).join('\n') +
      `\nUser-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
