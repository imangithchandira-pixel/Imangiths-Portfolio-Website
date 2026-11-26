/* Home: a pannable, zoomable park of every piece, with one route per project.

   Built to stay smooth on phones:
   - The page arrives already showing the map at its opening view (the camera's
     first position is pure CSS), so nothing waits for this script.
   - The slow drift of the pieces is a CSS animation on the compositor.
   - This script only runs frames while the map is moving, and stops when it
     settles; an idle map costs nothing.
   - Dragging follows the finger 1:1. Wheel, keys and the glide after a flick
     ease towards their target.
   - While zooming, the map is scaled as one GPU layer instead of being redrawn
     every frame; it is redrawn crisply (hairlines and all) once it settles, and
     pieces that are now drawn larger fetch sharper copies. */
import { reduce } from './site';

const root = document.querySelector<HTMLElement>('[data-map]');
if (root) start(root);

function start(root: HTMLElement) {
  const W = Number(root.dataset.w), H = Number(root.dataset.h);
  const LEVELS = 6, START_LEVEL = 2, RANGE = 6; // deepest zoom = 6 x the widest
  const START_FILL = 1.2; // opening view: the map is 1.2 x the screen (matches global.css)
  const STEP = Math.pow(RANGE, 1 / (LEVELS - 1));
  const EASE_MS = 120; // how quickly wheel, keys and glides catch up
  const canHover = matchMedia('(hover: hover)').matches;

  const world = root.querySelector<HTMLElement>('.map__world')!;
  const park = world.querySelector('svg')!;
  const hint = root.querySelector<HTMLElement>('.map__hint')!;
  const hintLabel = hint.querySelector('span')!;
  const routes = Array.from(park.querySelectorAll<SVGGElement>('.park__route'));

  const nodes = Array.from(world.querySelectorAll<HTMLElement>('.map__node')).map((el) => {
    const link = el.querySelector('a')!;
    const img = link.querySelector('img')!;
    return {
      el, link, img,
      sources: Array.from(link.querySelectorAll('source')),
      x: Number(el.dataset.x), y: Number(el.dataset.y), pi: Number(el.dataset.pi),
      w: Number(el.dataset.w), h: Number(el.dataset.h),
      drawn: 0 // the width, in CSS px, its current image was chosen for
    };
  });

  /* ---------- each piece fades in once its image is decoded ---------- */

  for (const n of nodes) {
    const shown = () => n.img.classList.add('is-loaded');
    const decoded = () => n.img.decode().catch(() => {}).then(shown);
    if (n.img.complete) decoded();
    else {
      n.img.addEventListener('load', decoded, { once: true });
      n.img.addEventListener('error', shown, { once: true });
    }
  }

  /* ---------- hover: bring one project's route forward ---------- */

  let active = -1;
  function focusProject(pi: number, title = '', withHint = false) {
    if (pi === active) return;
    active = pi;
    park.classList.toggle('has-focus', pi >= 0);
    for (const g of routes) g.classList.toggle('is-on', Number(g.dataset.pi) === pi);
    if (pi >= 0) hintLabel.textContent = title;
    hint.classList.toggle('is-on', pi >= 0 && withHint && canHover);
  }

  for (const n of nodes) {
    const a = n.link;
    a.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') focusProject(n.pi, a.getAttribute('aria-label') || '', true);
    });
    a.addEventListener('pointerleave', () => focusProject(-1));
    a.addEventListener('focus', () => {
      focusProject(n.pi);
      if (a.matches(':focus-visible')) centerOn(n.x, n.y);
    });
    a.addEventListener('blur', () => focusProject(-1));
  }

  /* ---------- camera ---------- */

  const cur = { x: 0, y: 0, s: 1 }, target = { x: 0, y: 0, s: 1 };
  let vw = 0, vh = 0, sMin = 1, sMax = 1, ready = false;
  let rect = root.getBoundingClientRect();

  function clamp() {
    target.s = Math.min(sMax, Math.max(sMin, target.s));
    target.x = clampAxis(target.x, W * target.s, vw);
    target.y = clampAxis(target.y, H * target.s, vh);
  }

  // Keep the map on screen: centred when it is smaller than the view, otherwise
  // let its edges come in by a small margin and no further.
  function clampAxis(pos: number, extent: number, view: number) {
    const pad = view * 0.08;
    if (extent + 2 * pad <= view) return (view - extent) / 2;
    return Math.min(pad, Math.max(view - extent - pad, pos));
  }

  const levelOf = (s: number) => Math.log(s / sMin) / Math.log(STEP);

  function measure() {
    const level = ready ? levelOf(target.s) : START_LEVEL;
    const wx = ready ? (vw / 2 - target.x) / target.s : W / 2;
    const wy = ready ? (vh / 2 - target.y) / target.s : H / 2;
    rect = root.getBoundingClientRect();
    vw = rect.width; vh = rect.height;
    sMin = (START_FILL * Math.max(vw / W, vh / H)) / Math.pow(STEP, START_LEVEL);
    sMax = sMin * RANGE;
    target.s = sMin * Math.pow(STEP, level);
    target.x = vw / 2 - wx * target.s;
    target.y = vh / 2 - wy * target.s;
    clamp();
    if (!ready) {
      cur.x = target.x; cur.y = target.y; cur.s = target.s;
      ready = true;
      paint();
      settle();
    } else kick();
  }

  function zoomTo(s: number, fx: number, fy: number) {
    s = Math.min(sMax, Math.max(sMin, s));
    const k = s / target.s;
    target.x = fx - (fx - target.x) * k;
    target.y = fy - (fy - target.y) * k;
    target.s = s;
    clamp();
    kick();
  }

  const setLevel = (i: number) => zoomTo(sMin * Math.pow(STEP, Math.max(0, Math.min(LEVELS - 1, i))), vw / 2, vh / 2);

  function centerOn(x: number, y: number) {
    target.x = vw / 2 - x * target.s;
    target.y = vh / 2 - y * target.s;
    clamp();
    kick();
  }

  /* ---------- input: drag, pinch, wheel, keys ---------- */

  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false, moved = 0;
  let pinch: { dist: number; mid: { x: number; y: number } } | null = null;
  const vel = { x: 0, y: 0 };
  let lastMove = 0;

  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch = null;
    if (pointers.size === 1) {
      dragging = true; moved = 0; vel.x = vel.y = 0; lastMove = performance.now();
      // Catch the map where it is: a touch mid-glide stops the glide.
      target.x = cur.x; target.y = cur.y;
      root.setAttribute('data-status', 'dragging');
    }
  });

  addEventListener('pointermove', (e) => {
    if (canHover && active >= 0) {
      hint.style.transform = 'translate3d(' + (e.clientX - rect.left + 14) + 'px,' + (e.clientY - rect.top + 18) + 'px,0)';
    }
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;

    if (pointers.size === 1) {
      const now = performance.now(), dt = Math.max(8, now - lastMove);
      lastMove = now;
      target.x += dx; target.y += dy;
      moved += Math.abs(dx) + Math.abs(dy);
      vel.x = vel.x * 0.75 + (dx / dt) * 0.25;
      vel.y = vel.y * 0.75 + (dy / dt) * 0.25;
      clamp();
      kick();
    } else if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const mid = { x: (pts[0].x + pts[1].x) / 2 - rect.left, y: (pts[0].y + pts[1].y) / 2 - rect.top };
      if (pinch) {
        target.x += mid.x - pinch.mid.x;
        target.y += mid.y - pinch.mid.y;
        zoomTo((target.s * dist) / pinch.dist, mid.x, mid.y);
      }
      pinch = { dist, mid };
      moved += 10;
    }
  });

  function release(e: PointerEvent) {
    if (!pointers.delete(e.pointerId)) return;
    pinch = null;
    if (pointers.size) return;
    dragging = false;
    root.setAttribute('data-status', 'idle');
    if (!reduce && moved > 6 && performance.now() - lastMove < 80) {
      const speed = Math.hypot(vel.x, vel.y), cap = speed > 2.2 ? 2.2 / speed : 1;
      target.x += vel.x * cap * 180; target.y += vel.y * cap * 180; // a little glide
      clamp();
    }
    kick();
    setTimeout(() => { moved = 0; }, 60);
  }
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  // A drag that ends on a piece is not a click on it.
  root.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  root.addEventListener('dragstart', (e) => e.preventDefault());

  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 0.05 : e.ctrlKey ? 0.01 : 0.0016;
    zoomTo(target.s * Math.exp(-e.deltaY * unit), e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  root.addEventListener('keydown', (e) => {
    const step = 140;
    switch (e.key) {
      case 'ArrowLeft': target.x += step; break;
      case 'ArrowRight': target.x -= step; break;
      case 'ArrowUp': target.y += step; break;
      case 'ArrowDown': target.y -= step; break;
      case '+': case '=': setLevel(Math.floor(levelOf(target.s) + 1.001)); return;
      case '-': case '_': setLevel(Math.ceil(levelOf(target.s) - 1.001)); return;
      default: return;
    }
    e.preventDefault();
    clamp();
    kick();
  });

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 60);
  });

  /* ---------- frames: only while something is moving ---------- */

  let raf = 0, lastT = 0;
  let paintedS = 0; // the scale the park was last drawn crisply at
  let zooming = false;

  function kick() {
    if (!raf && ready) {
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function paint() {
    world.style.transform = 'translate3d(' + cur.x.toFixed(2) + 'px,' + cur.y.toFixed(2) + 'px,0) scale(' + cur.s.toFixed(5) + ')';
  }

  function frame(t: number) {
    raf = 0;
    const dt = Math.min(64, Math.max(1, t - lastT));
    lastT = t;
    // Under a finger the map follows exactly; otherwise it eases in.
    const k = reduce || dragging ? 1 : 1 - Math.exp(-dt / EASE_MS);
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;
    cur.s += (target.s - cur.s) * k;

    // Scaling: hold the park as one layer on the GPU rather than redrawing it
    // every frame. If it has grown a lot, redraw it once mid-zoom so it never
    // looks soft for long.
    if (!zooming && Math.abs(cur.s - paintedS) > paintedS * 0.001) {
      zooming = true;
      world.classList.add('is-zooming');
    } else if (zooming && (cur.s / paintedS > 1.8 || cur.s / paintedS < 0.45)) {
      paintedS = cur.s;
      world.classList.remove('is-zooming');
      requestAnimationFrame(() => { if (zooming) world.classList.add('is-zooming'); });
    }

    const done = !dragging && Math.abs(target.x - cur.x) < 0.1 && Math.abs(target.y - cur.y) < 0.1 && Math.abs(target.s - cur.s) < cur.s * 1e-4;
    if (done) { cur.x = target.x; cur.y = target.y; cur.s = target.s; }
    paint();
    if (done) settle();
    else raf = requestAnimationFrame(frame);
  }

  // The map has come to rest: draw it crisply at this scale.
  function settle() {
    if (zooming) { zooming = false; world.classList.remove('is-zooming'); }
    if (Math.abs(cur.s - paintedS) > paintedS * 1e-4) {
      paintedS = cur.s;
      world.style.setProperty('--ls', (1 / cur.s).toFixed(4)); // keep the park's linework hairline
    }
    sharpen();
  }

  // Pieces on (or near) screen that are now drawn larger than their image was
  // chosen for ask for a sharper copy; the browser picks it from srcset.
  function sharpen() {
    const mx = vw * 0.5, my = vh * 0.5;
    for (const n of nodes) {
      const px = n.w * cur.s;
      if (px <= n.drawn * 1.15) continue;
      const sx = cur.x + n.x * cur.s, sy = cur.y + n.y * cur.s, hw = px / 2, hh = (n.h * cur.s) / 2;
      if (sx + hw < -mx || sx - hw > vw + mx || sy + hh < -my || sy - hh > vh + my) continue;
      if (n.drawn) {
        const sizes = Math.ceil(px) + 'px';
        for (const s of n.sources) s.sizes = sizes;
        n.img.sizes = sizes;
      }
      n.drawn = px;
    }
  }

  measure();
}
