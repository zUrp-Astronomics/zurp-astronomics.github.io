#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — post-build guard on dist/: image weight ceiling + one page per product
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
//   - dist/ does not hold exactly one `<slug>/index.html` per product of src/data/products.ts,
//     plus `index.html` at the root. Slugs are read FROM products.ts (never a hard-coded list),
//     so a new product is checked as soon as it is added.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_IMAGE_BYTES = 600 * 1024; // 614 400
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

const expected = new Set(['index.html', ...slugs.map((s) => `${s}/index.html`)]);
const found = new Set(files.map((f) => f.rel).filter((rel) => rel.endsWith('index.html')));

for (const page of expected) {
  if (!found.has(page)) errors.push(`missing page: dist/${page}`);
}
for (const page of found) {
  if (!expected.has(page)) errors.push(`unexpected page (no matching product in products.ts): dist/${page}`);
}

console.log(`Products in src/data/products.ts: ${slugs.length} (${slugs.join(', ')})`);
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
console.log('\nOK: every image ≤ 600 KB, one page per product + home page.');
