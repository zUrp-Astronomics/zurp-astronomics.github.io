#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — post-build guard on dist/: the external contracts only — image weight ceiling, one page per product, the files at the stable URLs the READMEs consume
// AUTHOR: engineer
// DATE: 2026-10-03
// REVISED: 2026-10-10 (ticket #79) — cut down to the external contracts: what the human cannot see by
//   looking at the deployed site. Image dimensions and decoding, version and licence stamps, tile
//   order and width, icon declarations on each page are gone: they are visible on the site.
// STATUS: active
//
// Usage: node scripts/check-dist.mjs [distDir]   (default: dist/ at the repo root)
// Runs after the build, in CI (.gitea/workflows/ci.yml) and in the deploy workflow
// (.github/workflows/deploy.yml). Needs the catalog snapshot the build wrote
// (.zurp-catalog/remote.json): the products are THE CATALOG THE SITE WAS BUILT WITH, assembled by
// scripts/lib/catalog.mjs — never a hard-coded list.
//
// Fails (exit 1) when:
//   - an image file in dist/ weighs more than 600 KB (614 400 bytes);
//   - dist/ does not hold exactly `index.html` + `<slug>/index.html` per product of the built catalog;
//   - a file is missing at a stable URL that the READMEs of the organisation and of the product
//     repositories link (src/lib/brand-images.ts, src/lib/site-icons.ts — mirrored below):
//       brand/low-tech-diy.webp, brand/avatar.png
//       brand/posters/<slug>.webp, brand/social/<slug>.jpg              per product
//       brand/status/<slug>.json                                          per product
//       brand/badges/<slug>/software.svg, brand/badges/<slug>/hardware.svg per product
//       favicon.ico, favicon-16.png, favicon-32.png, icon-192.png, apple-touch-icon.png

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBuiltCatalog } from './lib/catalog.mjs';
import { LICENSE_KINDS } from '../src/lib/content.mjs';
import { licenseBadgePath } from '../src/lib/license-badge.mjs';
import { statusBadgePath } from '../src/lib/status-badge.mjs';

const MAX_IMAGE_BYTES = 600 * 1024; // 614 400
const IMAGE_EXT = /\.(webp|jpe?g|png|avif|gif|svg|ico)$/i;
const HOME_PAGE = 'index.html';
// Stable URLs that do not depend on the catalog. Mirror of src/lib/brand-images.ts and src/lib/site-icons.ts.
const FIXED_URLS = [
  'brand/low-tech-diy.webp',
  'brand/avatar.png',
  'favicon.ico',
  'favicon-16.png',
  'favicon-32.png',
  'icon-192.png',
  'apple-touch-icon.png',
];
// Stable URLs per product.
const productUrls = (slug) => [
  `brand/posters/${slug}.webp`,
  `brand/social/${slug}.jpg`,
  statusBadgePath(slug),
  ...LICENSE_KINDS.map((kind) => licenseBadgePath(slug, kind)),
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(process.argv[2] ?? join(repoRoot, 'dist'));

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  console.error(`FAIL: ${distDir} does not exist — run the build first.`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

const files = walk(distDir).map((abs) => ({ abs, rel: relative(distDir, abs).split(sep).join('/') }));
const errors = [];

// --- 1. Image weight ceiling ---------------------------------------------------------------------
const images = files.filter((f) => IMAGE_EXT.test(f.rel)).map((f) => ({ ...f, size: statSync(f.abs).size }));
for (const img of images) {
  if (img.size > MAX_IMAGE_BYTES) errors.push(`image too heavy: dist/${img.rel} is ${img.size} bytes > ${MAX_IMAGE_BYTES} bytes (600 KB)`);
}
console.log(`Images in dist/: ${images.length} (ceiling ${MAX_IMAGE_BYTES} bytes)`);

// --- 2. One page per product of the built catalog, plus the home page ------------------------------
const catalog = await loadBuiltCatalog();
const slugs = catalog.products.map((p) => p.slug);
if (slugs.length === 0) errors.push('the built catalog holds no product');
console.log(`Catalog source of the build: ${catalog.read} — ${slugs.length} product(s): ${slugs.join(', ')}`);

const expected = new Set([HOME_PAGE, ...slugs.map((s) => `${s}/index.html`)]);
const found = new Set(files.map((f) => f.rel).filter((rel) => rel.endsWith('index.html')));
for (const page of expected) if (!found.has(page)) errors.push(`missing page: dist/${page}`);
for (const page of found) if (!expected.has(page)) errors.push(`unexpected page (no product of the catalog): dist/${page}`);
console.log(`Pages: ${found.size} found, ${expected.size} expected`);

// --- 3. Files at the stable URLs the READMEs consume ----------------------------------------------
const stable = [...FIXED_URLS, ...slugs.flatMap(productUrls)];
for (const path of stable) {
  const abs = join(distDir, path);
  if (!existsSync(abs) || !statSync(abs).isFile()) errors.push(`missing file at a stable README URL: dist/${path}`);
}
console.log(`Stable README URLs: ${stable.length} expected`);

// --- Verdict ---------------------------------------------------------------------------------------
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK: every image ≤ 600 KB, one page per product + home page, every stable README URL in place.');
