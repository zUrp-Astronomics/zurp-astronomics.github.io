#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — compare the stable brand images of two builds (dist/brand/ of a base ref vs a branch): byte for byte, pixel by pixel when the bytes differ
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — run by .gitea/workflows/trial-compare-dist.yml (an on-demand trial, not part of CI)
//
// Usage: node scripts/compare-brand.mjs <baseDist> <headDist>
//
// WHY. scripts/compare-dist.mjs compares the pixel SIZE of every image, not its content. The files
// of dist/brand/ (src/lib/brand-images.ts: README posters, the panel, the organisation avatar, and
// the GitHub social preview cards, which carry TEXT drawn at build time — src/lib/social-card.ts)
// are linked by URL from the READMEs: a change that must not alter them is proved here.
//
// Each file is compared byte for byte. When the bytes differ, both files are decoded (sharp) and
// compared pixel by pixel: "identical pixels" passes (an encoder that is not deterministic), and is
// reported as such. FAILS (exit 1) on a file present on one side only, or on different pixels.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const [baseArg, headArg] = process.argv.slice(2);
if (!baseArg || !headArg) {
  console.error('usage: node scripts/compare-brand.mjs <baseDist> <headDist>');
  process.exit(2);
}
const base = join(resolve(baseArg), 'brand');
const head = join(resolve(headArg), 'brand');

const walk = (dir) =>
  existsSync(dir) ? readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)])) : [];
const files = [...new Set([...walk(base).map((f) => relative(base, f)), ...walk(head).map((f) => relative(head, f))])].sort();

let identicalBytes = 0;
let identicalPixels = 0;
const failures = [];
for (const f of files) {
  const a = join(base, f);
  const b = join(head, f);
  if (!existsSync(a) || !existsSync(b)) {
    failures.push(`brand/${f}: only in the ${existsSync(a) ? 'base' : 'head'}`);
    continue;
  }
  if (readFileSync(a).equals(readFileSync(b))) {
    identicalBytes++;
    continue;
  }
  const [ra, rb] = await Promise.all([a, b].map((p) => sharp(p).raw().toBuffer({ resolveWithObject: true })));
  const same =
    ra.info.width === rb.info.width &&
    ra.info.height === rb.info.height &&
    ra.info.channels === rb.info.channels &&
    ra.data.equals(rb.data);
  if (same) {
    identicalPixels++;
    console.log(`identical pixels, different bytes: brand/${f}`);
  } else {
    failures.push(`brand/${f}: different pixels (${ra.info.width}×${ra.info.height} → ${rb.info.width}×${rb.info.height})`);
  }
}

const social = files.filter((f) => f.startsWith('social/'));
console.log(
  `BRAND IMAGES: ${files.length} file(s) under brand/, ${social.length} social card(s) — ` +
    `${identicalBytes} identical byte for byte, ${identicalPixels} identical pixel for pixel only, ${failures.length} different`,
);
for (const s of social) console.log(`  brand/${s}: ${failures.some((x) => x.startsWith(`brand/${s}:`)) ? 'DIFFERENT' : 'same'}`);
if (files.length === 0) failures.push('no file under brand/ on either side');
if (failures.length) {
  console.log(`DIFFERENCES (${failures.length}):\n${failures.map((x) => `  - ${x}`).join('\n')}`);
  process.exit(1);
}
