/* Every image the site shows lives in src/assets/img/. At build time each one is
   re-encoded as AVIF (with WebP for older browsers) at several widths, so every
   screen downloads the smallest file that still looks sharp on it. */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/img/*.{webp,jpg,jpeg,png,avif}', { eager: true });
const byName = new Map(Object.entries(files).map(([path, mod]) => [path.replace(/^.*\/|\.[a-z]+$/g, ''), mod.default]));

/** The source image for a name used in src/data/site.ts. */
export function source(name: string): ImageMetadata {
  const img = byName.get(name);
  if (!img) throw new Error(`No image called "${name}" in src/assets/img/`);
  return img;
}

/** Widths to offer, never larger than the source. */
export function widths(name: string, candidates: number[]): number[] {
  const max = source(name).width;
  const list = candidates.filter((w) => w < max);
  list.push(max);
  return list;
}

/** One fixed-size WebP for social previews (og:image). */
export async function ogImage(name: string): Promise<string> {
  const img = await getImage({ src: source(name), width: Math.min(1200, source(name).width), format: 'webp', quality: 80 });
  return img.src;
}
