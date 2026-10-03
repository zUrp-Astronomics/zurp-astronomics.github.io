// SOURCE: zurp-astronomics-site — stable-URL brand images for the GitHub READMEs: convention + renderer
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// WHY. Astro serves optimised images under /_astro/<name>.<hash>.webp: the address changes every
// time the image does. The READMEs of the GitHub organisation and of the 7 product repositories
// link brand images BY URL, so they need addresses that never depend on the content.
//
// THE CONVENTION (what the READMEs link to — keep it stable, a README link is never updated):
//
//   https://zurp-astronomics.github.io/brand/low-tech-diy.webp        the worn "Low-Tech & DIY" panel
//                                                                     800 px wide (3:2, README header)
//   https://zurp-astronomics.github.io/brand/posters/<slug>.webp      series 2 poster of one product
//                                                                     600 × 600 px, <slug> = the
//                                                                     product's `slug` in products.ts
//
// All WebP, each well under the 614 400-byte ceiling of scripts/check-dist.mjs.
//
// HOW. Two static endpoints write them at build time, from the SAME sources as the site, so they
// follow the next poster change on their own (nothing is copied by hand):
//   src/pages/brand/low-tech-diy.webp.ts        ← src/assets/header/low-tech-diy-poster.webp
//   src/pages/brand/posters/[slug].webp.ts      ← each product's `poster2` in src/data/products.ts
// The pixels go through Astro's own configured image service (sharp), the one the pages use.
// scripts/check-dist.mjs fails the build when one of these files is missing from dist/, with the
// slugs read from products.ts: a broken README link turns CI red.

import { readFile } from 'node:fs/promises';
import type { ImageMetadata } from 'astro';
import { getConfiguredImageService, imageConfig } from 'astro:assets';

/** Published paths, relative to the site root. */
export const BRAND_PANEL_PATH = 'brand/low-tech-diy.webp';
export const brandPosterPath = (slug: string) => `brand/posters/${slug}.webp`;

/** README sizes: posters ~600 px (a README column), the panel a header-wide 800 px. */
export const BRAND_POSTER_WIDTH = 600;
export const BRAND_PANEL_WIDTH = 800;

/**
 * Re-encodes an imported image (src/assets/…) as a WebP of the given width, as an endpoint
 * Response. Reads the original file through the import's `fsPath`, which Astro exposes on image
 * imports evaluated server-side (static endpoints are). No fallback: if it is ever missing, the
 * build fails here rather than publishing a wrong or empty file.
 *
 * ⚠ Touch nothing else on `image` (not even `image.src`): on a static build, reading a property of
 * an image import marks the ORIGINAL file as used, and Astro then copies it to dist/_astro as is
 * (the 1536 px panel source is ~840 KB, over the weight ceiling). `fsPath` is the one property
 * that does not.
 */
export async function brandWebp(image: ImageMetadata, width: number, quality: number): Promise<Response> {
  const fsPath = (image as ImageMetadata & { fsPath?: string }).fsPath;
  if (!fsPath) {
    throw new Error('brand image: no fsPath on the imported image — Astro internals changed?');
  }
  const service = await getConfiguredImageService();
  if (!('transform' in service) || typeof service.transform !== 'function') {
    throw new Error('brand image: the configured image service cannot transform local images');
  }
  const source = await readFile(fsPath);
  const { data } = await service.transform(
    new Uint8Array(source),
    { src: fsPath, width, format: 'webp', quality },
    imageConfig,
  );
  return new Response(data, { headers: { 'Content-Type': 'image/webp' } });
}
