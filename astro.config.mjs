// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://imangiths-portfolio-website.vercel.app',
  // about.html, projects/malaga.html …; Vercel serves them without the
  // extension (cleanUrls in vercel.json).
  build: { format: 'file' },
  trailingSlash: 'never',
  devToolbar: { enabled: false }
});
