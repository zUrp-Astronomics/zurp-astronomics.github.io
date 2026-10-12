#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — post-build guard on dist/: the external contracts only — image weight ceiling, one page per product, the files at the stable URLs the READMEs consume
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
//   - for a product whose built catalog holds a firmware (ticket #96, src/lib/firmware.mjs): the TOML
//     of a chip is missing at its stable URL <slug>/firmware/<chip>.toml (the URL of the contract
//     with the products: their READMEs link it through ESP Launchpad), does not parse as TOML (with
//     smol-toml, the parser of Launchpad itself), or does not cite, in order, one URL of this site
//     and one address per part of the catalog; or a part it cites is missing from dist/ or not of the
//     size the catalog gives;
//   - for EVERY product (scripts/lib/check-firmware.mjs): its page's « Flash » block is not what the
//     built catalog says — one block, one Launchpad link per chip of its firmware, in order, with
//     the texts of content/site.yml; none, and no Launchpad link, without a firmware — or its folder
//     dist/<slug>/firmware/ holds anything but the TOMLs and parts of its firmware, or exists
//     without one.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { parse as parseToml } from 'smol-toml';
import { loadBuiltCatalog, siteUrl } from './lib/catalog.mjs';
import { firmwareDirProblems, flashBlockProblems } from './lib/check-firmware.mjs';
import { firmwareTomlPath } from '../src/lib/firmware.mjs';
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

// --- 4. The firmware TOML of each chip and the parts it cites -------------------------------------
const SITE = siteUrl();
let tomls = 0;
for (const p of catalog.products.filter((p) => p.firmware)) {
  for (const { chip, parts } of p.firmware.chips) {
    const path = firmwareTomlPath(p.slug, chip);
    const where = `dist/${path}`;
    const abs = join(distDir, path);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      errors.push(`missing firmware TOML at its stable URL: ${where}`);
      continue;
    }
    tomls++;
    let config;
    try {
      config = parseToml(readFileSync(abs, 'utf8'));
    } catch (e) {
      errors.push(`${where}: not valid TOML — ${String(e?.message ?? e).split('\n')[0]}`);
      continue;
    }
    const app = config.supported_apps?.[0];
    const image = config[app]?.image?.[chip];
    if (config.multipart !== true || config.chip !== chip || !Array.isArray(image?.parts) || !Array.isArray(image?.addresses)) {
      errors.push(`${where}: not a Launchpad TOML of ${chip} (multipart, chip, supported_apps, [app] image.${chip}.parts / addresses)`);
      continue;
    }
    if (image.parts.length !== parts.length || image.addresses.some((a, i) => a !== parts[i]?.offset)) {
      errors.push(`${where}: cites ${image.parts.length} part(s) at ${JSON.stringify(image.addresses)}, the catalog has ${JSON.stringify(parts.map((x) => x.offset))}`);
    }
    image.parts.forEach((url, i) => {
      if (typeof url !== 'string' || !url.startsWith(`${SITE}/`)) {
        errors.push(`${where}: part ${JSON.stringify(url)} is not an absolute URL of ${SITE}`);
        return;
      }
      const rel = decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''));
      const file = join(distDir, rel);
      if (!existsSync(file) || !statSync(file).isFile()) errors.push(`${where}: part ${url} is missing: dist/${rel}`);
      else if (parts[i] && statSync(file).size !== parts[i].size) {
        errors.push(`${where}: part dist/${rel} is ${statSync(file).size} bytes, the catalog gives ${parts[i].size}`);
      }
    });
  }
}
console.log(`Firmware TOML: ${tomls} (${catalog.products.filter((p) => p.firmware).map((p) => p.slug).join(', ') || 'no product with a firmware'})`);

// --- 5. What each product page shows of its firmware, and its firmware/ folder -------------------
const flashTexts = siteContent(repoRoot).product.flash;
for (const p of catalog.products) {
  const page = join(distDir, p.slug, 'index.html');
  if (existsSync(page)) errors.push(...flashBlockProblems(readFileSync(page, 'utf8'), p, { site: SITE, texts: flashTexts }));
  errors.push(...firmwareDirProblems(distDir, p));
}
console.log(`« Flash » blocks: on ${catalog.products.filter((p) => p.firmware).length} page(s), absent from ${catalog.products.filter((p) => !p.firmware).length}`);

// --- Verdict ---------------------------------------------------------------------------------------
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK: every image ≤ 600 KB, one page per product + home page, every stable README URL in place, every firmware TOML and its parts in place, every « Flash » block as the catalog says.');
