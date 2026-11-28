# Chandira Imanjith — portfolio

![The homepage: sketches and studies laid out on a park map](docs/homepage.webp)

Sketches and studies in ink and watercolor by Chandira Imanjith, a first-year architecture student at the City School of Architecture, Colombo.

## Getting around

- **Home** is a park map with every drawing on it. Drag to wander, scroll or pinch to zoom, or use the arrow keys and `+` / `−`.
- Each project follows its own route through the park: a boardwalk, stepping stones, a sand path or a stream.
- **Click a drawing** to open its project, where the piece is shown whole and then broken into the details that make it.
- **Projects** lists every project in one place.
- **About** has a short introduction, with a contact form below it.

## Working on the site

The site is built with [Astro](https://astro.build) into plain static pages, so visitors get finished HTML with very little JavaScript. You need Node.js 24.

```sh
npm ci          # install exactly what package-lock.json lists
npm run dev     # live preview at http://localhost:4321
npm run check   # type-check everything
npm run build   # build the site into dist/
npm test        # end-to-end checks of the built site, desktop and phone
```

The tests serve the built site through Cloudflare's own local runtime (`wrangler dev`), so headers, clean URLs and redirects behave as they do live, and they use the Chrome installed on your computer. Every pull request runs the same checks on GitHub (type-check, build, dependency audit, end-to-end tests).

- **Content** (projects, images, captions, contact details) lives in `src/data/site.ts`. Add a project there and its page, its tile on Projects and its pieces on the map all follow.
- **Images** go in `src/assets/img/`. Add the best-quality copy you have: the build makes AVIF and WebP versions at several sizes, and each screen downloads the smallest one that looks sharp.
- **Pages** are in `src/pages/`, styles in `src/styles/global.css` and the little JavaScript the site runs in `src/scripts/`.
- The park on the home page is drawn once at build time by `src/lib/park.ts`.

The site is hosted on Cloudflare Workers at [chandiraimanjith.com](https://chandiraimanjith.com). Pushing to `main` builds and deploys it (Workers Builds runs `npm run build`, then `npx wrangler deploy`); `wrangler.jsonc` holds the settings. Old links such as `project.html?p=malaga` redirect to the new addresses (`/projects/malaga`); that is the only request that runs code (`worker/index.js`), everything else is a static file.

## Security

- Every page carries a strict Content Security Policy: only the site's own scripts and styles run (inline ones only by hash), and the only other address a page can contact is Web3Forms, for the contact form.
- `public/_headers` adds the headers a policy inside the page can't: no framing by other sites, no MIME sniffing, a strict referrer policy, every browser feature the site doesn't use (camera, microphone, location…) switched off, and cross-origin isolation of windows and files.
- Dependencies are pinned in `package-lock.json`, installed with `npm ci`, and never allowed to run install scripts (`.npmrc`). Dependabot opens update PRs weekly and right away for security advisories.
- The Web3Forms access key in `src/data/site.ts` is public by design: it can only deliver notes to the site's own inbox. For extra protection, restrict it to this site's domain in the Web3Forms dashboard.
- Found a problem? See [/.well-known/security.txt](https://chandiraimanjith.com/.well-known/security.txt).

## Getting in touch

The contact form sends your note by email through [Web3Forms](https://web3forms.com). If it can't be sent, it opens your own email app with the note ready to send instead. You can also write directly to [imangithchandira@gmail.com](mailto:imangithchandira@gmail.com) or connect on [LinkedIn](https://www.linkedin.com/in/chandira-imanjith-b4b7283a2).

## Licence

All rights reserved. The drawings, photographs, writing, code and design are © Chandira Imanjith and may not be reused without written permission. The Newsreader typeface is used under the SIL Open Font License. See [LICENSE](LICENSE) for the full terms.
