// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://chandiraimanjith.com',
  // about.html, projects/malaga.html …; Cloudflare serves them without the
  // extension (html_handling in wrangler.jsonc).
  // The stylesheet (under 4 KB compressed) goes inside each page, so the first
  // paint doesn't wait for a second request. Its hash is in the CSP.
  build: { format: 'file', inlineStylesheets: 'always' },
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  security: {
    // A strict Content Security Policy in every page (<meta http-equiv>): only
    // this site's own scripts and styles run (inline ones by their SHA-256
    // hash), and the only other place the page may talk to is Web3Forms, for
    // the contact form. Directives a <meta> policy can't carry (frame-ancestors)
    // are sent as headers from public/_headers.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self' https://api.web3forms.com",
        "manifest-src 'self'",
        "media-src 'none'",
        "object-src 'none'",
        "frame-src 'none'",
        "worker-src 'none'",
        "base-uri 'none'",
        "form-action 'self'"
      ],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: { resources: ["'self'"] }
    }
  },
  image: {
    // Drawings are mostly fine line work and paper texture: AVIF at 60 keeps
    // both (sharp's default of 50 smooths the watercolour grain).
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { quality: 60 }, webp: { quality: 80 } } }
  }
});
