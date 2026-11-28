// Old links from the first, single-page version of the site carried the
// project in the query string: project.html?p=malaga. Send them to the
// project's own page, /projects/malaga (or to the Projects list).
// Everything else is a static file from dist/, served without this code.
export default {
  /** @param {Request} request @param {{ ASSETS: { fetch: typeof fetch } }} env */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/project' || url.pathname === '/project.html') {
      const slug = url.searchParams.get('p');
      const to = slug && /^[a-z0-9-]+$/.test(slug) ? `/projects/${slug}` : '/projects';
      return new Response(null, { status: 301, headers: { Location: to } });
    }
    return env.ASSETS.fetch(request);
  }
};
