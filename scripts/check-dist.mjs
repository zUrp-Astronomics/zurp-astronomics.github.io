#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — post-build guard on dist/: the external contracts only — image weight ceiling, one page per product, the files at the stable URLs the READMEs consume, what each product page offers to install
// AUTHOR: engineer
// DATE: 2026-10-03
// REVISED: 2026-10-10 (ticket #79) — cut down to the external contracts: what the human cannot see by
//   looking at the deployed site. Image dimensions and decoding, version and licence stamps, tile
//   order and width, icon declarations on each page are gone: they are visible on the site.
// REVISED: 2026-10-12 (ticket #96) — the firmware TOML of each chip, at its stable URL, and every part
//   it cites, in dist/ at the size the catalog gives
// REVISED: 2026-10-12 (ticket #96, review) — what each product page shows of it: the « Flash » block
//   when the catalog holds a firmware, none (and no firmware/ folder) when it does not
//   (scripts/lib/check-firmware.mjs)
// REVISED: 2026-10-12 (ticket #101) — the ESP Launchpad TOML checks are gone: for a product whose
//   catalog holds an ESP Web Tools publication, its manifest and every file it names in dist/ at the
//   size the catalog gives, and the page's button on that manifest; on every page, the #install block
//   as the catalog says (scripts/lib/check-install.mjs)
// REVISED: 2026-10-16 (ticket #107) — the web bench: its file in dist/<slug>/bench/ byte for byte
//   the catalog's, its button, frame and « new tab » link in the #install block; none without one
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
//   - for a product whose built catalog holds an ESP Web Tools publication (ticket #101,
//     src/lib/install.mjs): its manifest <slug>/firmware/<id>/manifest.json is missing, not of the
//     size the catalog gives, or not JSON; a file it names is missing beside it or not of the size
//     the catalog gives; its folder dist/<slug>/firmware/ holds anything else (or exists without an
//     ESP publication);
//   - for EVERY product (scripts/lib/check-install.mjs): its page's #install block is not what the
//     built catalog says — one block (id="install") with the version, the ESP Web Tools button on
//     the copied manifest and a script of the page that defines it, the download links of the
//     catalog; none, and no button, without an install;
//   - for a product whose built catalog holds a web bench (ticket #107): its file
//     <slug>/bench/<id>/<file> is missing or not the catalog's byte for byte, its folder holds
//     anything else; the #install block has not exactly one bench button on that file, one « new
//     tab » link to it, one frame allow="serial" without src. Without a bench: any of these, or any
//     file of dist/ ending in `_bench.html` that is not a bench of the catalog.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { loadBuiltCatalog } from './lib/catalog.mjs';
import { benchDirProblems, espDirProblems, installBlockProblems, strayBenchProblems } from './lib/check-install.mjs';
import { LICENSE_KINDS, siteContent } from '../src/lib/content.mjs';
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

// --- 4. What each product offers to install: its ESP folder, its page's #install block -------------
const installTexts = siteContent(repoRoot).product.install;
for (const p of catalog.products) {
  errors.push(...espDirProblems(distDir, p));
  errors.push(...benchDirProblems(distDir, p));
  const page = join(distDir, p.slug, 'index.html');
  if (existsSync(page)) errors.push(...installBlockProblems(readFileSync(page, 'utf8'), p, { texts: installTexts, distDir }));
}
errors.push(...strayBenchProblems(distDir, catalog.products));
const withEsp = catalog.products.filter((p) => p.install?.esp).map((p) => p.slug);
const withBench = catalog.products.filter((p) => p.install?.bench).map((p) => p.slug);
console.log(
  `Install: #install block on ${catalog.products.filter((p) => p.install).length} page(s), absent from ${catalog.products.filter((p) => !p.install).length}; ` +
    `ESP Web Tools manifest: ${withEsp.join(', ') || 'none'}; bench: ${withBench.join(', ') || 'none'}`,
);

// --- Verdict ---------------------------------------------------------------------------------------
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK: every image ≤ 600 KB, one page per product + home page, every stable README URL in place, every ESP manifest and its files in place, every bench in place, every #install block as the catalog says.');
