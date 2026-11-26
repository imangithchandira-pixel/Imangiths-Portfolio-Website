/* Shared behaviour: text and image reveals, header state, the footer year. */

const html = document.documentElement;
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- small things ---------- */

const year = String(new Date().getFullYear());
document.querySelectorAll('[data-year]').forEach((el) => {
  if (el.textContent !== year) el.textContent = year;
});

// The header's white wash shows once the page has scrolled. Watching a marker
// at the top of the page means no work at all on each scroll.
if ('IntersectionObserver' in window) {
  const marker = document.createElement('div');
  marker.setAttribute('aria-hidden', 'true');
  marker.className = 'scroll-marker';
  document.body.prepend(marker);
  new IntersectionObserver(([en]) => html.classList.toggle('is-scrolled', !en.isIntersecting)).observe(marker);
}

/* ---------- reveals ---------- */

// Wrap each word so lines can slide up one after another.
function split(el: Element) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) texts.push(node as Text);

  for (const tn of texts) {
    const frag = document.createDocumentFragment();
    for (const part of (tn.nodeValue || '').split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(' '));
        continue;
      }
      const w = document.createElement('span');
      const wi = document.createElement('span');
      w.className = 'w';
      wi.className = 'wi';
      wi.textContent = part;
      w.appendChild(wi);
      frag.appendChild(w);
    }
    tn.parentNode!.replaceChild(frag, tn);
  }

  let top: number | null = null;
  let line = -1;
  el.querySelectorAll<HTMLElement>('.w').forEach((w) => {
    const t = w.offsetTop;
    if (top === null || Math.abs(t - top) > 2) {
      line++;
      top = t;
    }
    (w.firstChild as HTMLElement).style.setProperty('--i', String(line));
  });
  el.classList.add('is-split');
}

const io =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            en.target.classList.add('is-in');
            io!.unobserve(en.target);
          }
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
      )
    : null;

const seen = new WeakSet<Element>();
function reveal() {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (el.getAttribute('data-reveal') === 'text') split(el);
    if (reduce || !io) el.classList.add('is-in');
    else io.observe(el);
  });
}

reveal();
