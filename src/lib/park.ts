/* Home map: the park the pieces stand in, drawn once at build time.

   Everything that is ground (lawns, contours, trees, garden rooms) is drawn very
   lightly, like the base layer of a site plan. The routes that link one project's
   pieces are the strong marks: a timber boardwalk, stepping stones, a sand path,
   a gravel walk or a stream. The park is laid out around the pieces and routes it
   is given, so it rearranges itself when projects are added or moved in
   src/data/site.ts. The randomness is seeded, so every build draws the same park. */

import { MAP, PROJECTS, type Project, type RouteType } from '../data/site';

const TAU = Math.PI * 2;

// `half` is half the drawn width in map units and must match global.css.
const ROUTES: Record<RouteType, { half: number; layers: number; wiggle: number }> = {
  stream: { half: 18, layers: 3, wiggle: 1.25 },
  stones: { half: 8, layers: 1, wiggle: 0.9 },
  sand: { half: 14, layers: 2, wiggle: 0.8 },
  gravel: { half: 12, layers: 3, wiggle: 0.7 },
  boardwalk: { half: 16, layers: 3, wiggle: 0.45 }
};
const ORDER: RouteType[] = ['stream', 'stones', 'gravel', 'sand', 'boardwalk']; // drawn bottom to top

type Pt = [number, number];

export interface Node {
  project: Project;
  pi: number;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Slow drift: two frequencies (per ms) and two phases. */
  f1: number;
  f2: number;
  p1: number;
  p2: number;
}

interface Link {
  pi: number;
  type: RouteType;
  pts: Pt[];
}

/* ---------- deterministic randomness ---------- */

export function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Coordinates to a tenth of a map unit, without a trailing .0, to keep the page small.
const f1 = (n: number) => n.toFixed(1).replace(/\.0$/, '').replace(/^-0$/, '0');

function attrs(a: Record<string, string | number | undefined>) {
  let s = '';
  for (const key in a) if (a[key] != null) s += ' ' + key + '="' + a[key] + '"';
  return s;
}

const tag = (name: string, a: Record<string, string | number | undefined>, inner?: string) =>
  inner == null ? '<' + name + attrs(a) + '/>' : '<' + name + attrs(a) + '>' + inner + '</' + name + '>';

function pathOf(pts: Pt[]) {
  let d = '';
  for (let i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + f1(pts[i][0]) + ' ' + f1(pts[i][1]);
  return d;
}

/* A route between two pieces: a straight run bent by a few slow waves. Streams
   meander most, the boardwalk least. */
function route(a: Pt | { x: number; y: number }, b: { x: number; y: number }, type: RouteType, rand: () => number): Pt[] {
  const ax = 'x' in a ? a.x : a[0], ay = 'y' in a ? a.y : a[1];
  const k = ROUTES[type].wiggle;
  const dx = b.x - ax, dy = b.y - ay, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const steps = Math.max(12, Math.round(len / 20));
  const a1 = Math.min(120, len * 0.07) * (0.7 + rand() * 0.6) * k;
  const a2 = type === 'boardwalk' ? 0 : a1 * 0.36;
  const a3 = type === 'stream' ? a1 * 0.14 : 0;
  const q1 = (len / 1100) * (0.8 + rand() * 0.5), q2 = (len / 420) * (0.8 + rand() * 0.5), q3 = (len / 170) * (0.8 + rand() * 0.5);
  const p1 = rand() * TAU, p2 = rand() * TAU, p3 = rand() * TAU;
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, env = Math.pow(Math.sin(Math.PI * t), 0.75);
    const off = env * (a1 * Math.sin(TAU * q1 * t + p1) + a2 * Math.sin(TAU * q2 * t + p2) + a3 * Math.sin(TAU * q3 * t + p3));
    pts.push([ax + dx * t + nx * off, ay + dy * t + ny * off]);
  }
  return pts;
}

/* ---------- the pieces and the routes between them ---------- */

function layout() {
  const W = MAP.width, H = MAP.height, NODE_SCALE = MAP.nodeScale || 1;
  const rand = rng(20261114);

  const nodes: Node[] = [];
  PROJECTS.forEach((p, pi) => {
    p.nodes.forEach((n) => {
      nodes.push({
        project: p, pi, src: n.img[0], x: n.x, y: n.y,
        w: n.size * NODE_SCALE, h: (n.size * NODE_SCALE * n.img[2]) / n.img[1],
        f1: 0, f2: 0, p1: 0, p2: 0
      });
    });
  });

  // Each project's pieces are joined by the shortest tree of paths.
  const links: Link[] = [];
  PROJECTS.forEach((p, pi) => {
    const type = ORDER.indexOf(p.route) >= 0 ? p.route : ORDER[pi % ORDER.length];
    const set = nodes.filter((n) => n.pi === pi);
    if (set.length < 2) return;
    const linked = [set[0]], rest = set.slice(1);
    while (rest.length) {
      let best: { a: Node; b: Node; bi: number; dist: number } | null = null;
      for (const a of linked) {
        rest.forEach((b, bi) => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (!best || dist < best.dist) best = { a, b, bi, dist };
        });
      }
      const pick = best!;
      links.push({ pi, type, pts: route(pick.a, pick.b, type, rand) });
      linked.push(pick.b);
      rest.splice(pick.bi, 1);
    }
  });

  // The drift continues the same random sequence, piece by piece.
  for (const n of nodes) {
    n.f1 = 0.00022 + rand() * 0.00018;
    n.f2 = 0.0002 + rand() * 0.00018;
    n.p1 = rand() * 6.2832;
    n.p2 = rand() * 6.2832;
  }

  return { W, H, nodes, links };
}

/* ---------- the park ---------- */

function draw(W: number, H: number, nodes: Node[], links: Link[], rand: () => number) {
  // Layers, drawn bottom to top.
  const L = { lawnEdges: '', lawns: '', rooms: '', trees: '', notes: '', pads: '', water: '', paths: '' };
  type Layer = keyof typeof L;

  // Garden rooms may be rotated as a whole: each room draws into its own group.
  let roomBuf: string | null = null;
  const put = (layer: Layer, svg: string) => {
    if (layer === 'rooms' && roomBuf != null) roomBuf += svg;
    else L[layer] += svg;
  };

  const rect = (layer: Layer, cls: string, x: number, y: number, w: number, h: number, r?: number) =>
    put(layer, tag('rect', { class: cls, x: f1(x), y: f1(y), width: f1(w), height: f1(h), rx: r || 0 }));
  const circle = (layer: Layer, cls: string, x: number, y: number, r: number) =>
    put(layer, tag('circle', { class: cls, cx: f1(x), cy: f1(y), r: f1(r) }));
  const line = (layer: Layer, cls: string, x1: number, y1: number, x2: number, y2: number) =>
    put(layer, tag('line', { class: cls, x1: f1(x1), y1: f1(y1), x2: f1(x2), y2: f1(y2) }));
  const tree = (layer: Layer, x: number, y: number, r: number) => {
    circle(layer, 'park__tree', x, y, r);
    circle(layer, 'park__trunk', x, y, Math.max(2.4, r * 0.07));
  };

  /* ---------- what is already taken: pieces, routes, garden rooms ---------- */

  const samples: [number, number, number][] = [];
  for (const l of links) {
    const half = ROUTES[l.type].half;
    for (let i = 0; i < l.pts.length; i += 2) samples.push([l.pts[i][0], l.pts[i][1], half]);
  }
  const rooms: { x: number; y: number; r: number }[] = [];

  function nodeGap(x: number, y: number) {
    let best = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(Math.max(Math.abs(x - n.x) - n.w / 2, 0), Math.max(Math.abs(y - n.y) - n.h / 2, 0));
      if (d < best) best = d;
    }
    return best;
  }
  function routeGap(x: number, y: number) {
    let best = Infinity;
    for (const s of samples) {
      const d = Math.hypot(x - s[0], y - s[1]) - s[2];
      if (d < best) best = d;
    }
    return best;
  }
  function roomGap(x: number, y: number) {
    let best = Infinity;
    for (const r of rooms) {
      const d = Math.hypot(x - r.x, y - r.y) - r.r;
      if (d < best) best = d;
    }
    return best;
  }

  /* ---------- lawns: soft overlapping shapes that read as one meadow ---------- */

  function blob(cx: number, cy: number, R: number): Pt[] {
    const p1 = rand() * TAU, p2 = rand() * TAU, p3 = rand() * TAU, pts: Pt[] = [];
    for (let i = 0; i < 40; i++) {
      const t = (i / 40) * TAU;
      const r = R * (1 + 0.1 * Math.sin(2 * t + p1) + 0.07 * Math.sin(3 * t + p2) + 0.04 * Math.sin(5 * t + p3));
      pts.push([cx + Math.cos(t) * r * 1.2, cy + Math.sin(t) * r * 0.9]);
    }
    return pts;
  }
  // A smooth closed outline through the points, optionally shrunk towards (cx, cy).
  function closed(pts: Pt[], cx: number, cy: number, k: number) {
    const q = pts.map((p): Pt => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
    const n = q.length, last = q[n - 1];
    let d = 'M ' + f1((last[0] + q[0][0]) / 2) + ' ' + f1((last[1] + q[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const a = q[i], b = q[(i + 1) % n];
      d += ' Q ' + f1(a[0]) + ' ' + f1(a[1]) + ' ' + f1((a[0] + b[0]) / 2) + ' ' + f1((a[1] + b[1]) / 2);
    }
    return d + ' Z';
  }

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const lx = W * (0.125 + 0.25 * col) + (rand() - 0.5) * W * 0.06;
      const ly = H * (0.27 + 0.47 * row) + (rand() - 0.5) * H * 0.12;
      const lr = Math.min(W / 4, H / 2) * (0.34 + rand() * 0.1);
      const outline = blob(lx, ly, lr);
      // Edges first, fills on top: where lawns overlap, the inner edges disappear.
      put('lawnEdges', tag('path', { class: 'park__lawn-edge', d: closed(outline, lx, ly, 1) }));
      put('lawns', tag('path', { class: 'park__lawn', d: closed(outline, lx, ly, 1) }));
      if ((row + col) % 2 === 0) {
        for (const k of [0.7, 0.46, 0.24]) {
          // a low mound, as contour lines
          put('lawns', tag('path', { class: 'park__contour', d: closed(outline, lx + lr * 0.12, ly - lr * 0.06, k) }));
        }
      }
    }
  }

  /* ---------- garden rooms: formal pieces, set wherever there is open ground ---------- */

  function freeRadius(x: number, y: number) {
    return Math.min(x - 170, y - 170, W - 170 - x, H - 170 - y, nodeGap(x, y) - 80, routeGap(x, y) - 50, roomGap(x, y) - 110);
  }
  function claim(cap: number) {
    let best: { x: number; y: number; r: number } | null = null;
    for (let x = 300; x <= W - 300; x += 150) {
      for (let y = 300; y <= H - 300; y += 150) {
        const c = freeRadius(x, y);
        if (!best || c > best.r) best = { x, y, r: c };
      }
    }
    if (!best || best.r < 150) return null;
    best.r = Math.min(cap, best.r);
    rooms.push(best);
    return best;
  }
  function turned(room: { x: number; y: number }, degrees: number, body: () => void) {
    roomBuf = '';
    body();
    const inner = roomBuf;
    roomBuf = null;
    put('rooms', tag('g', { transform: 'rotate(' + degrees.toFixed(1) + ' ' + room.x + ' ' + room.y + ')' }, inner));
  }

  type Room = { x: number; y: number; r: number };
  function pool(room: Room) {
    const { x, y } = room, hw = room.r * 0.9, hh = room.r * 0.42;
    turned(room, (rand() - 0.5) * 24, () => {
      rect('rooms', 'park__hard', x - hw - 34, y - hh - 34, 2 * hw + 68, 2 * hh + 68, 6);
      rect('rooms', 'park__water', x - hw, y - hh, 2 * hw, 2 * hh, 10);
      rect('rooms', 'park__ripple', x - hw + 16, y - hh + 16, 2 * hw - 32, 2 * hh - 32, 6);
      for (let i = 0; i < 5; i++) {
        const rx = x - hw * 0.75 + rand() * hw * 1.2, ry = y - hh * 0.55 + rand() * hh * 1.1;
        line('rooms', 'park__ripple', rx, ry, rx + 40 + rand() * 70, ry);
      }
    });
  }
  function rondel(room: Room) {
    const { x, y, r } = room, turn = rand() * TAU;
    circle('rooms', 'park__bed', x, y, r);
    circle('rooms', 'park__line', x, y, r * 0.78);
    circle('rooms', 'park__line', x, y, r * 0.56);
    circle('rooms', 'park__hard', x, y, r * 0.3);
    for (let i = 0; i < 16; i++) {
      const a = turn + (i / 16) * TAU, c = Math.cos(a), s = Math.sin(a);
      line('rooms', 'park__line', x + c * r * 0.56, y + s * r * 0.56, x + c * r * 0.78, y + s * r * 0.78);
    }
  }
  function bosque(room: Room) {
    const { x, y } = room, half = room.r * 0.68;
    const n = Math.max(3, Math.min(5, Math.round((half * 2) / 120))), gap = (half * 2) / n;
    turned(room, (rand() - 0.5) * 30, () => {
      rect('rooms', 'park__hard', x - half, y - half, 2 * half, 2 * half, 4);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) tree('rooms', x - half + gap * (i + 0.5), y - half + gap * (j + 0.5), gap * 0.34);
    });
  }
  function parterre(room: Room) {
    const { x, y } = room, half = room.r * 0.68, walk = half * 0.16, size = half - walk / 2 - 12;
    turned(room, (rand() - 0.5) * 30, () => {
      rect('rooms', 'park__hard', x - half, y - half, 2 * half, 2 * half, 4);
      for (const q of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const bx = q[0] > 0 ? x + walk / 2 : x - half + 12, by = q[1] > 0 ? y + walk / 2 : y - half + 12;
        rect('rooms', 'park__bed', bx, by, size, size, 3);
        rect('rooms', 'park__line', bx + 18, by + 18, size - 36, size - 36, 2);
      }
      circle('rooms', 'park__hard', x, y, half * 0.2);
      circle('rooms', 'park__water', x, y, half * 0.1);
    });
  }

  for (const [fn, cap] of [[pool, 340], [rondel, 300], [bosque, 290], [parterre, 270], [rondel, 220]] as const) {
    const room = claim(cap);
    if (room) fn(room);
  }

  /* ---------- site-plan notes: boundary, north point, scale ---------- */

  rect('notes', 'park__bound', 90, 90, W - 180, H - 180, 40);

  [[W - 340, H - 330], [340, H - 330], [W - 340, 330], [340, 330]].some(([x, y]) => {
    if (nodeGap(x, y) < 170 || routeGap(x, y) < 130 || roomGap(x, y) < 130) return false;
    circle('notes', 'park__line', x, y - 20, 46);
    put('notes', tag('path', { class: 'park__line', d: 'M ' + x + ' ' + (y - 84) + ' L ' + (x + 16) + ' ' + (y + 2) + ' L ' + x + ' ' + (y - 10) + ' L ' + (x - 16) + ' ' + (y + 2) + ' Z' }));
    put('notes', tag('text', { class: 'park__note', x, y: y - 100 }, 'N'));
    line('notes', 'park__line', x - 110, y + 78, x + 110, y + 78);
    for (const dx of [-110, 0, 110]) line('notes', 'park__line', x + dx, y + 70, x + dx, y + 86);
    for (const [label, dx] of [['0', -110], ['25', 0], ['50 m', 110]] as const) {
      put('notes', tag('text', { class: 'park__note', x: x + dx, y: y + 122 }, label));
    }
    rooms.push({ x, y, r: 150 });
    return true;
  });

  /* ---------- trees: an avenue along the boardwalk, loose groves elsewhere ---------- */

  const trees: [number, number, number][] = [];
  function plant(x: number, y: number, r: number) {
    if (x < 130 + r || y < 130 + r || x > W - 130 - r || y > H - 130 - r) return;
    if (nodeGap(x, y) < r + 46 || routeGap(x, y) < r + 16 || roomGap(x, y) < r + 30) return;
    for (const t of trees) if (Math.hypot(x - t[0], y - t[1]) < (r + t[2]) * 0.8) return;
    trees.push([x, y, r]);
    tree('trees', x, y, r);
  }

  for (const l of links) {
    if (l.type !== 'boardwalk') continue;
    const out = ROUTES.boardwalk.half + 64;
    let since = 85;
    for (let i = 1; i < l.pts.length - 1; i++) {
      since += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]);
      if (since < 170) continue;
      since = 0;
      const tx = l.pts[i + 1][0] - l.pts[i - 1][0], ty = l.pts[i + 1][1] - l.pts[i - 1][1], tl = Math.hypot(tx, ty) || 1;
      plant(l.pts[i][0] - (ty / tl) * out, l.pts[i][1] + (tx / tl) * out, 30);
      plant(l.pts[i][0] + (ty / tl) * out, l.pts[i][1] - (tx / tl) * out, 30);
    }
  }

  for (let grove = 0; grove < 36; grove++) {
    const gx = 200 + rand() * (W - 400), gy = 200 + rand() * (H - 400);
    const spread = 160 + rand() * 230, count = 4 + Math.floor(rand() * 10);
    for (let t = 0; t < count; t++) {
      const ang = rand() * TAU, dist = spread * Math.sqrt(rand());
      plant(gx + Math.cos(ang) * dist, gy + Math.sin(ang) * dist, 34 + rand() * 44);
    }
  }

  /* ---------- a paved terrace under each piece ---------- */

  for (const n of nodes) rect('pads', 'park__pad', n.x - n.w / 2 - 34, n.y - n.h / 2 - 34, n.w + 68, n.h + 68, 4);

  /* ---------- the routes ---------- */

  // Where a boardwalk, sand path or gravel walk meets a stream, it crosses on a small bridge.
  function crossings(A: Pt[], B: Pt[]) {
    const hits: { x: number; y: number; tx: number; ty: number; sin: number }[] = [];
    for (let i = 0; i < A.length - 1; i++) {
      const a1 = A[i], rx = A[i + 1][0] - a1[0], ry = A[i + 1][1] - a1[1];
      for (let j = 0; j < B.length - 1; j++) {
        const b1 = B[j], sx = B[j + 1][0] - b1[0], sy = B[j + 1][1] - b1[1];
        const den = rx * sy - ry * sx;
        if (Math.abs(den) < 1e-6) continue;
        const qx = b1[0] - a1[0], qy = b1[1] - a1[1];
        const u = (qx * sy - qy * sx) / den, v = (qx * ry - qy * rx) / den;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        const rl = Math.hypot(rx, ry) || 1, sl = Math.hypot(sx, sy) || 1;
        hits.push({ x: a1[0] + rx * u, y: a1[1] + ry * u, tx: rx / rl, ty: ry / rl, sin: Math.abs(den) / (rl * sl) });
      }
    }
    return hits;
  }
  function box(pts: Pt[]) {
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of pts) {
      if (p[0] < b[0]) b[0] = p[0];
      if (p[1] < b[1]) b[1] = p[1];
      if (p[0] > b[2]) b[2] = p[0];
      if (p[1] > b[3]) b[3] = p[1];
    }
    return b;
  }

  const bridges: Record<number, string> = {};
  const streams = links.filter((l) => l.type === 'stream').map((s) => ({ ...s, box: box(s.pts) }));
  for (const l of links) {
    if (l.type !== 'boardwalk' && l.type !== 'sand' && l.type !== 'gravel') continue;
    const b = box(l.pts), half = ROUTES[l.type].half, placed: { x: number; y: number }[] = [];
    for (const s of streams) {
      if (b[0] > s.box[2] || b[2] < s.box[0] || b[1] > s.box[3] || b[3] < s.box[1]) continue;
      for (const hit of crossings(l.pts, s.pts)) {
        if (nodeGap(hit.x, hit.y) < 20) continue; // hidden under a piece
        if (placed.some((p) => Math.hypot(p.x - hit.x, p.y - hit.y) < 140)) continue;
        placed.push(hit);
        const reach = Math.min(110, (ROUTES.stream.half + 20) / Math.max(hit.sin, 0.35));
        // Bridges go under the path they carry; later ones under earlier ones.
        bridges[l.pi] =
          tag('line', {
            class: 'park__bridge',
            x1: f1(hit.x - hit.tx * reach), y1: f1(hit.y - hit.ty * reach),
            x2: f1(hit.x + hit.tx * reach), y2: f1(hit.y + hit.ty * reach),
            'stroke-width': half * 2 + 10
          }) + (bridges[l.pi] || '');
      }
    }
  }

  for (const type of ORDER) {
    const byProject: Record<number, Link[]> = {};
    for (const l of links) if (l.type === type) (byProject[l.pi] = byProject[l.pi] || []).push(l);
    for (const key of Object.keys(byProject)) {
      const pi = Number(key);
      const d = byProject[pi].map((l) => pathOf(l.pts)).join(' ');
      let inner = bridges[pi] || '';
      for (let layer = 1; layer <= ROUTES[type].layers; layer++) inner += tag('path', { class: 'r' + layer, d });
      put(type === 'stream' ? 'water' : 'paths', tag('g', { class: 'park__route park__route--' + type, 'data-pi': pi }, inner));
    }
  }

  const g = (s: string) => '<g>' + s + '</g>';
  return (
    '<svg class="park" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false">' +
    g(L.lawnEdges) + g(L.lawns) + g(L.rooms) + g(L.trees) + g(L.notes) + g(L.pads) + g(L.water) + g(L.paths) +
    '</svg>'
  );
}

/** Everything the home page needs, computed once per build. */
export function buildPark() {
  const { W, H, nodes, links } = layout();
  const svg = draw(W, H, nodes, links, rng(4071));
  return { W, H, nodes, svg };
}
