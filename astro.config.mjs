// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://imangiths-portfolio-website.vercel.app',
  // about.html, projects/malaga.html …; Vercel serves them without the
  // extension (cleanUrls in vercel.json).
  build: { format: 'file' },
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  image: {
    // Drawings are mostly fine line work and paper texture: AVIF at 60 keeps
    // both (sharp's default of 50 smooths the watercolour grain).
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { quality: 60 }, webp: { quality: 80 } } }
  }
});
