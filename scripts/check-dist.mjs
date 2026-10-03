#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — post-build guard on dist/: image weight ceiling, catalog tile width, one page per product (main site + /alternate/ archive)
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Usage: node scripts/check-dist.mjs [distDir]   (default: dist/ at the repo root)
// Runs after `npm run build` in CI. No dependencies: node built-ins only.
//
// Fails (exit 1) when:
//   - an image file in dist/ (webp, jpg/jpeg, png, avif, gif, svg) weighs more than 600 KB
//     (614 400 bytes);
//   - dist/ does not hold EXACTLY this set of pages, no more, no less:
//       main site (v2)       `index.html`            + `<slug>/index.html`           per product
//       v1 archive           `alternate/index.html`  + `alternate/<slug>/index.html` per product
//     Slugs are read FROM products.ts (never a hard-coded list), so a new product is checked as
//     soon as it is added — in both versions;
//   - a catalog tile on a home page (`index.html`, `alternate/index.html`) is wider than 600 px, in
//     its `srcset` (`…w` descriptor) or its `width` attribute. Catalog tiles never get a variant
//     beyond 600 px (weight budget). A tile is an <img> carrying the `data-catalog-tile` attribute
//     (set by src/components/v1/ProductCard.astro and src/components/v2/PosterTile.astro). Other
//     optimised images on a home page (the main site's header poster spans the container) are not
//     tiles and may be wider; the 600 KB weight ceiling above still applies to them;
//   - a home page does not hold exactly one tile per product: zero tiles means the marker or the
//     parser drifted (fail loudly rather than pass an unchecked page), fewer means a tile lost
//     its marker and escaped the width rule.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_IMAGE_BYTES = 600 * 1024; // 614 400
const MAX_TILE_WIDTH = 600; // px — widest variant allowed for a catalog tile
const TILE_MARKER = /\sdata-catalog-tile(?:[\s=>/]|$)/i; // attribute on every catalog tile <img>
const SITE_VERSIONS = ['', 'alternate/']; // main site (v2) at the root, v1 archive under /alternate/
const IMAGE_EXT = /\.(webp|jpe?g|png|avif|gif|svg)$/i;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(process.argv[2] ?? join(repoRoot, 'dist'));
const productsFile = join(repoRoot, 'src', 'data', 'products.ts');

const errors = [];
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  console.error(`FAIL: ${distDir} does not exist — run the build first.`);
  process.exit(1);
}

const files = walk(distDir).map((abs) => ({
  abs,
  rel: relative(distDir, abs).split(sep).join('/'),
}));

// --- 1. Image weight ceiling -------------------------------------------------------------------
const images = files
  .filter((f) => IMAGE_EXT.test(f.rel))
  .map((f) => ({ ...f, size: statSync(f.abs).size }))
  .sort((a, b) => b.size - a.size);

for (const img of images) {
  if (img.size > MAX_IMAGE_BYTES) {
    errors.push(
      `image too heavy: dist/${img.rel} is ${img.size} bytes (${kb(img.size)}) > ${MAX_IMAGE_BYTES} bytes (600 KB)`,
    );
  }
}

console.log(`Images in dist/: ${images.length} (ceiling ${MAX_IMAGE_BYTES} bytes = 600 KB)`);
console.log('Largest images:');
for (const img of images.slice(0, 5)) {
  console.log(`  ${String(img.size).padStart(9)} bytes  ${kb(img.size).padStart(9)}  dist/${img.rel}`);
}

// --- 2. Exactly one page per product + the home page -------------------------------------------
const source = readFileSync(productsFile, 'utf8');
const slugs = [...source.matchAll(/^\s*slug:\s*(['"`])([^'"`]+)\1\s*,?\s*$/gm)].map((m) => m[2]);

if (slugs.length === 0) {
  errors.push(`no product slug found in ${relative(repoRoot, productsFile)} — parser out of sync?`);
}
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length) errors.push(`duplicate slug(s) in products.ts: ${[...new Set(dupes)].join(', ')}`);

const expected = new Set(
  SITE_VERSIONS.flatMap((prefix) => [
    `${prefix}index.html`,
    ...slugs.map((s) => `${prefix}${s}/index.html`),
  ]),
);
const found = new Set(files.map((f) => f.rel).filter((rel) => rel.endsWith('index.html')));

for (const page of expected) {
  if (!found.has(page)) errors.push(`missing page: dist/${page}`);
}
for (const page of found) {
  if (!expected.has(page)) errors.push(`unexpected page (no matching product in products.ts): dist/${page}`);
}

// --- 3. Catalog tiles: no variant wider than 600 px, one tile per product --------------------
const catalogPages = SITE_VERSIONS.map((prefix) => `${prefix}index.html`).filter((p) => found.has(p));
let tileImages = 0;
const otherImages = [];
for (const page of catalogPages) {
  const html = readFileSync(join(distDir, page), 'utf8');
  let onPage = 0;
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = tag.match(/\ssrc="([^"]*)"/i)?.[1] ?? '';
    if (!TILE_MARKER.test(tag)) {
      // Not a tile (logo, sticker, header poster): only the weight ceiling (section 1) applies.
      otherImages.push(`dist/${page} ${src}`);
      continue;
    }
    onPage++;
    const width = Number(tag.match(/\swidth="(\d+)"/i)?.[1] ?? NaN);
    if (!(width <= MAX_TILE_WIDTH)) {
      errors.push(`catalog tile too wide: dist/${page} <img src="${src}"> width=${width} > ${MAX_TILE_WIDTH}`);
    }
    const srcset = tag.match(/\ssrcset="([^"]*)"/i)?.[1] ?? '';
    for (const [, w] of srcset.matchAll(/\s(\d+)w\b/g)) {
      if (Number(w) > MAX_TILE_WIDTH) {
        errors.push(`catalog tile variant too wide: dist/${page} srcset of ${src} offers ${w}w > ${MAX_TILE_WIDTH}w`);
      }
    }
  }
  // No tile at all means the marker or the parser drifted: fail loudly rather than pass an
  // unchecked page. Fewer tiles than products means one escaped the rule above.
  if (onPage === 0) {
    errors.push(`no catalog tile (<img data-catalog-tile>) found in dist/${page} — marker or parser out of sync?`);
  } else if (slugs.length && onPage !== slugs.length) {
    errors.push(`dist/${page} has ${onPage} catalog tile(s) (<img data-catalog-tile>), expected ${slugs.length} (one per product)`);
  }
  tileImages += onPage;
}

console.log(`Products in src/data/products.ts: ${slugs.length} (${slugs.join(', ')})`);
console.log(`Catalog tiles checked (≤ ${MAX_TILE_WIDTH} px): ${tileImages} on ${catalogPages.join(', ')}`);
console.log(`Other images on those pages (not tiles, weight ceiling only): ${otherImages.length}`);
for (const img of otherImages) console.log(`  ${img}`);
console.log(`Pages found (index.html): ${found.size}, expected: ${expected.size}`);
for (const page of [...found].sort()) {
  console.log(`  ${expected.has(page) ? 'ok ' : '?? '} dist/${page}`);
}

// --- Verdict -----------------------------------------------------------------------------------
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK: every image ≤ 600 KB, catalog tiles ≤ 600 px, one page per product + home page, on the main site and in the /alternate/ archive.');
