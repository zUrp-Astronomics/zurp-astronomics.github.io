#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — post-build guard on dist/: image weight ceiling, catalog tile width, one page per product, stable brand image URLs, GitHub social preview cards, site icons and organisation avatar
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Usage: node scripts/check-dist.mjs [distDir]   (default: dist/ at the repo root)
// Runs after `npm run build` in CI. No dependencies: node built-ins only.
//
// Fails (exit 1) when:
//   - an image file in dist/ (webp, jpg/jpeg, png, avif, gif, svg, ico) weighs more than 600 KB
//     (614 400 bytes);
//   - dist/ does not hold EXACTLY this set of pages, no more, no less:
//       `index.html` + `<slug>/index.html` per product
//     Slugs are read FROM products.ts (never a hard-coded list), so a new product is checked as
//     soon as it is added. (The v1 archive under /alternate/ was deleted in ticket #35: a page left
//     there is now an unexpected page.);
//   - a catalog tile on the home page (`index.html`) is wider than 600 px, in its `srcset` (`…w`
//     descriptor) or its `width` attribute. Catalog tiles never get a variant beyond 600 px (weight
//     budget). A tile is an <img> carrying the `data-catalog-tile` attribute (set by
//     src/components/v2/PosterTile.astro). Other optimised images on the home page (the header
//     poster spans the container) are not tiles and may be wider; the 600 KB weight ceiling above
//     still applies to them;
//   - the home page does not hold exactly one tile per product: zero tiles means the marker or the
//     parser drifted (fail loudly rather than pass an unchecked page), fewer means a tile lost
//     its marker and escaped the width rule;
//   - a stable-URL brand image linked by the GitHub READMEs is missing, is not a WebP, or is wider
//     than its README size:
//       `brand/low-tech-diy.webp`                    the Low-Tech & DIY panel   (≤ 800 px wide)
//       `brand/posters/<slug>.webp` per product       its series 2 poster        (≤ 600 px wide)
//     Slugs again come from products.ts. The convention is defined (and documented) in
//     src/lib/brand-images.ts; the paths below mirror it — change both together, or never;
//   - a GitHub social preview card (uploaded by hand in each product repository, linked from
//     readme-kit/README.md) is missing, is not a JPEG, or is not exactly 1280 × 640 px:
//       `brand/social/<slug>.jpg` per product        (GitHub's recommended size)
//     Its weight is held by the 600 KB ceiling above, well under GitHub's 1 MB limit;
//   - a site icon or the organisation avatar is missing, is not a PNG (an ICO for favicon.ico), is
//     not square, or is not exactly its size (convention: src/lib/site-icons.ts, mirrored below):
//       `favicon.ico`            16 and 32 px entries   `favicon-16.png`  16 × 16
//       `favicon-32.png`         32 × 32                `icon-192.png`    192 × 192
//       `apple-touch-icon.png`   180 × 180              `brand/avatar.png` 480 × 480 (GitHub org avatar)
//   - a page does not declare an icon (`<link rel="icon">`) AND an `apple-touch-icon`, declares one
//     whose file is missing from dist/, or declares `sizes="WxH"` that the file does not have.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_IMAGE_BYTES = 600 * 1024; // 614 400
const MAX_TILE_WIDTH = 600; // px — widest variant allowed for a catalog tile
const TILE_MARKER = /\sdata-catalog-tile(?:[\s=>/]|$)/i; // attribute on every catalog tile <img>
const HOME_PAGE = 'index.html'; // the only catalog page
const IMAGE_EXT = /\.(webp|jpe?g|png|avif|gif|svg|ico)$/i;
// Stable brand URLs (README links). Mirror of src/lib/brand-images.ts.
const BRAND_PANEL = { path: 'brand/low-tech-diy.webp', maxWidth: 800 };
const brandPoster = (slug) => ({ path: `brand/posters/${slug}.webp`, maxWidth: 600 });
const SOCIAL_CARD = { width: 1280, height: 640 };
const socialCard = (slug) => `brand/social/${slug}.jpg`;
// Site icons and the organisation avatar. Mirror of src/lib/site-icons.ts.
const SITE_ICONS = [
  { path: 'favicon-16.png', size: 16 },
  { path: 'favicon-32.png', size: 32 },
  { path: 'icon-192.png', size: 192 },
  { path: 'apple-touch-icon.png', size: 180 },
  { path: 'brand/avatar.png', size: 480 },
];
const FAVICON_ICO = { path: 'favicon.ico', sizes: [16, 32] };

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

const expected = new Set([HOME_PAGE, ...slugs.map((s) => `${s}/index.html`)]);
const found = new Set(files.map((f) => f.rel).filter((rel) => rel.endsWith('index.html')));

for (const page of expected) {
  if (!found.has(page)) errors.push(`missing page: dist/${page}`);
}
for (const page of found) {
  if (!expected.has(page)) errors.push(`unexpected page (no matching product in products.ts): dist/${page}`);
}

// --- 3. Catalog tiles: no variant wider than 600 px, one tile per product --------------------
const catalogPages = [HOME_PAGE].filter((p) => found.has(p));
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

// --- 4. Stable brand images (README links) ----------------------------------------------------
// Width of a WebP file from its header (lossy VP8, lossless VP8L, extended VP8X); null if the file
// is not a WebP the parser understands.
function webpWidth(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
  if (chunk === 'VP8L') return 1 + (buf.readUInt16LE(21) & 0x3fff);
  if (chunk === 'VP8X') return 1 + buf.readUIntLE(24, 3);
  return null;
}

const brandImages = [BRAND_PANEL, ...slugs.map(brandPoster)];
const brandReport = [];
for (const { path, maxWidth } of brandImages) {
  const abs = join(distDir, path);
  if (!existsSync(abs)) {
    errors.push(`missing stable brand image: dist/${path} (linked by URL from the GitHub READMEs)`);
    brandReport.push(`  MISSING  dist/${path}`);
    continue;
  }
  const buf = readFileSync(abs);
  const width = webpWidth(buf);
  if (width === null) {
    errors.push(`stable brand image is not a WebP: dist/${path}`);
  } else if (width > maxWidth) {
    errors.push(`stable brand image too wide: dist/${path} is ${width} px > ${maxWidth} px (README size)`);
  }
  brandReport.push(`  ${String(buf.length).padStart(9)} bytes  ${String(width ?? '?').padStart(4)} px  dist/${path}`);
}
console.log(`Stable brand images (README URLs): ${brandImages.length} expected`);
for (const line of brandReport) console.log(line);

// --- 5. GitHub social preview cards ------------------------------------------------------------
// Size of a JPEG from its first SOF (start of frame) marker; null if the file is not a JPEG.
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xff) { i++; continue; } // fill byte
    const length = buf.readUInt16BE(i + 2);
    // SOF0..SOF15, except DHT (C4), JPG (C8) and DAC (CC), which share the range.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

const cardReport = [];
for (const path of slugs.map(socialCard)) {
  const abs = join(distDir, path);
  if (!existsSync(abs)) {
    errors.push(`missing social preview card: dist/${path} (uploaded to the product's GitHub repository)`);
    cardReport.push(`  MISSING  dist/${path}`);
    continue;
  }
  const buf = readFileSync(abs);
  const size = jpegSize(buf);
  if (size === null) {
    errors.push(`social preview card is not a JPEG: dist/${path}`);
  } else if (size.width !== SOCIAL_CARD.width || size.height !== SOCIAL_CARD.height) {
    errors.push(
      `social preview card has the wrong size: dist/${path} is ${size.width} × ${size.height} px, expected ${SOCIAL_CARD.width} × ${SOCIAL_CARD.height}`,
    );
  }
  const dims = size ? `${size.width}×${size.height}` : '?';
  cardReport.push(`  ${String(buf.length).padStart(9)} bytes  ${dims.padStart(9)}  dist/${path}`);
}
console.log(`GitHub social preview cards: ${slugs.length} expected (${SOCIAL_CARD.width} × ${SOCIAL_CARD.height} JPEG)`);
for (const line of cardReport) console.log(line);

// --- 6. Site icons, organisation avatar, and their declaration on every page --------------------
// Size of a PNG from its IHDR chunk; null if the buffer is not a PNG.
function pngSize(buf) {
  const SIG = '89504e470d0a1a0a';
  if (buf.length < 24 || buf.toString('hex', 0, 8) !== SIG || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Entries of an ICO file: the size in its directory and, for a PNG entry, the size of the PNG
// itself; null if the buffer is not an ICO.
function icoEntries(buf) {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return null;
  const count = buf.readUInt16LE(4);
  if (count === 0 || buf.length < 6 + 16 * count) return null;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const e = 6 + 16 * i;
    const width = buf[e] || 256;
    const height = buf[e + 1] || 256;
    const length = buf.readUInt32LE(e + 8);
    const offset = buf.readUInt32LE(e + 12);
    if (offset + length > buf.length) return null;
    entries.push({ width, height, png: pngSize(buf.subarray(offset, offset + length)) });
  }
  return entries;
}

const iconReport = [];
for (const { path, size } of SITE_ICONS) {
  const abs = join(distDir, path);
  if (!existsSync(abs)) {
    errors.push(`missing site icon: dist/${path}`);
    iconReport.push(`  MISSING  dist/${path}`);
    continue;
  }
  const buf = readFileSync(abs);
  const dims = pngSize(buf);
  if (dims === null) {
    errors.push(`site icon is not a PNG: dist/${path}`);
  } else if (dims.width !== dims.height) {
    errors.push(`site icon is not square: dist/${path} is ${dims.width} × ${dims.height} px`);
  } else if (dims.width !== size) {
    errors.push(`site icon has the wrong size: dist/${path} is ${dims.width} × ${dims.height} px, expected ${size} × ${size}`);
  }
  const shown = dims ? `${dims.width}×${dims.height}` : '?';
  iconReport.push(`  ${String(buf.length).padStart(9)} bytes  ${shown.padStart(9)}  dist/${path}`);
}
{
  const { path, sizes } = FAVICON_ICO;
  const abs = join(distDir, path);
  if (!existsSync(abs)) {
    errors.push(`missing site icon: dist/${path}`);
    iconReport.push(`  MISSING  dist/${path}`);
  } else {
    const buf = readFileSync(abs);
    const entries = icoEntries(buf);
    if (entries === null) {
      errors.push(`site icon is not an ICO: dist/${path}`);
    } else {
      for (const e of entries) {
        if (e.width !== e.height) errors.push(`favicon entry is not square: dist/${path} holds ${e.width} × ${e.height} px`);
        if (e.png && (e.png.width !== e.width || e.png.height !== e.height)) {
          errors.push(`favicon entry disagrees with its image: dist/${path} declares ${e.width} × ${e.height}, its PNG is ${e.png.width} × ${e.png.height}`);
        }
      }
      const have = entries.map((e) => e.width);
      for (const s of sizes) {
        if (!entries.some((e) => e.width === s && e.height === s)) {
          errors.push(`favicon has no ${s} × ${s} entry: dist/${path} holds ${have.join(', ') || 'nothing'}`);
        }
      }
    }
    const shown = entries ? entries.map((e) => `${e.width}×${e.height}`).join('+') : '?';
    iconReport.push(`  ${String(buf.length).padStart(9)} bytes  ${shown.padStart(9)}  dist/${path}`);
  }
}
console.log(`Site icons and organisation avatar: ${SITE_ICONS.length + 1} expected (square, exact size)`);
for (const line of iconReport) console.log(line);

// Every page declares a tab icon and an apple-touch-icon, and every declared icon is in dist/.
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1] ?? null;
let declared = 0;
for (const page of [...found].sort()) {
  const html = readFileSync(join(distDir, page), 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => ({ tag, rel: (attr(tag, 'rel') ?? '').toLowerCase().split(/\s+/) }))
    .filter(({ rel }) => rel.includes('icon') || rel.includes('apple-touch-icon'));
  if (!links.some(({ rel }) => rel.includes('icon'))) errors.push(`no <link rel="icon"> in dist/${page}`);
  if (!links.some(({ rel }) => rel.includes('apple-touch-icon'))) errors.push(`no <link rel="apple-touch-icon"> in dist/${page}`);
  for (const { tag } of links) {
    declared++;
    const href = attr(tag, 'href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) {
      errors.push(`icon link without a site-root href in dist/${page}: ${tag}`);
      continue;
    }
    const path = href.slice(1).split(/[?#]/)[0];
    const abs = join(distDir, path);
    if (!existsSync(abs)) {
      errors.push(`declared icon missing from dist/: ${href} (declared in dist/${page})`);
      continue;
    }
    const sizes = attr(tag, 'sizes');
    const dims = pngSize(readFileSync(abs));
    const m = sizes?.match(/^(\d+)x(\d+)$/i);
    if (m && dims && (dims.width !== Number(m[1]) || dims.height !== Number(m[2]))) {
      errors.push(`declared icon has the wrong size: ${href} is ${dims.width} × ${dims.height} px, declared sizes="${sizes}" in dist/${page}`);
    }
  }
}
console.log(`Icon links checked on ${found.size} page(s): ${declared}`);

// --- Verdict -----------------------------------------------------------------------------------
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK: every image ≤ 600 KB, catalog tiles ≤ 600 px, one page per product + home page, every stable brand image, social preview card, site icon and the organisation avatar in place.');
