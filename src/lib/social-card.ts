// SOURCE: zurp-astronomics-site — GitHub "Social preview" card of a product repository: series 2 poster on the soot wall, with the product's name
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the signature is passed in (the site's `name`, content/site.yml)
//
// Served at https://zurp-astronomics.github.io/brand/social/<slug>.jpg by
// src/pages/brand/social/[slug].jpg.ts (convention: src/lib/brand-images.ts). The human downloads it
// and uploads it in the repository's Settings → Social preview (readme-kit/README.md says which).
//
// LAYOUT (1280 × 640, GitHub's recommended size). Left: the whole series 2 poster, never cropped,
// 576 px square — its near-black corners are the wall's own colour (--z2-soot), so the worn plate
// sits on the wall with no visible edge. Right: the name in a red block (the posters' and the
// site's red name band), the poster's slogan in wide-tracked capitals, and the site's name as a
// signature between two red rules, as on the posters ("zUrp Astronomics": `name` in
// content/site.yml, passed in by the endpoint). Wall: soot, faint blueprint grid, two water
// stains, grain — the site's wall (src/layouts/V2Layout.astro), drawn as SVG.
//
// TEXT. Rendered with the site's display face, Black Ops One, from the font file vendored in
// src/assets/fonts/ (SIL OFL 1.1, licence next to it), through sharp's text input (Pango). It never
// depends on the fonts installed on the build machine: the CI image may have none. Each line has
// one size on every card; only a name or slogan too long for the column shrinks to fit it.
// (On a machine without a fontconfig setup, sharp prints "Fontconfig error: Cannot load default
// config file" during the build. It is harmless: the font comes from the file, not from fontconfig.)
//
// sharp is the image library Astro uses for every image of the site, declared in package.json at the
// version Astro pulls (ticket #43: it used to be only a transitive dependency).

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import type { ImageMetadata } from 'astro';

export const SOCIAL_CARD_WIDTH = 1280;
export const SOCIAL_CARD_HEIGHT = 640;

// The build runs from the repository root (`npm run build`), the bundled endpoint does not live
// next to its source: resolve from the working directory, and fail loudly if it is not the root.
const FONT_FILE = resolve('src/assets/fonts/BlackOpsOne-Regular.ttf');
const FONT = 'Black Ops One';

// Palette: the --z2-* tokens of src/layouts/V2Layout.astro.
const SOOT = '#1b1a18';
const CREAM_LIGHT = '#f4ead0';
const CREAM_DIM = '#c9bb98';
const RED = '#dc2a1c';

const POSTER = 576; // px, square
const MARGIN = (SOCIAL_CARD_HEIGHT - POSTER) / 2; // 32 px around the poster
const PANEL_X = MARGIN + POSTER + 40; // right column
const PANEL_W = SOCIAL_CARD_WIDTH - PANEL_X - 48;

const escapeMarkup = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A line of text as a transparent PNG, set at `size` px (72 dpi: 1 pt = 1 px). Same size on every
 * card; only a line wider than `maxWidth` is shrunk to fit it.
 */
async function textLine(markup: string, size: number, maxWidth: number) {
  const render = (text: Record<string, unknown>) =>
    sharp({ text: { text: markup, fontfile: FONT_FILE, rgba: true, align: 'centre', ...text } })
      .png()
      .toBuffer({ resolveWithObject: true });
  let { data, info } = await render({ font: `${FONT} ${size}`, dpi: 72 });
  if (info.width > maxWidth) {
    ({ data, info } = await render({ font: FONT, width: maxWidth, height: info.height }));
  }
  return { data, width: info.width, height: info.height };
}

function wallSvg(blocks: string): Buffer {
  const W = SOCIAL_CARD_WIDTH;
  const H = SOCIAL_CARD_HEIGHT;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M80 0H0V80" fill="none" stroke="rgb(140,170,230)" stroke-opacity="0.07" stroke-width="1"/>
    </pattern>
    <radialGradient id="stainA" cx="0.12" cy="0.1" r="0.55">
      <stop offset="0" stop-color="rgb(120,90,50)" stop-opacity="0.16"/>
      <stop offset="1" stop-color="rgb(120,90,50)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="stainB" cx="0.86" cy="0.72" r="0.5">
      <stop offset="0" stop-color="rgb(120,90,50)" stop-opacity="0.12"/>
      <stop offset="1" stop-color="rgb(120,90,50)" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${SOOT}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#stainA)"/>
  <rect width="${W}" height="${H}" fill="url(#stainB)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
  ${blocks}
</svg>`);
}

/**
 * The social card of one product, as a JPEG endpoint Response. `poster` is the product's `poster`
 * import: only its `fsPath` is read, for the reason given in src/lib/brand-images.ts (reading any
 * other property would make Astro copy the heavy original into dist/).
 */
export async function socialCard(poster: ImageMetadata, name: string, slogan: string, signature: string): Promise<Response> {
  if (!existsSync(FONT_FILE)) {
    throw new Error(`social card: font not found at ${FONT_FILE} — run the build from the repository root`);
  }
  const fsPath = (poster as ImageMetadata & { fsPath?: string }).fsPath;
  if (!fsPath) {
    throw new Error('social card: no fsPath on the imported poster — Astro internals changed?');
  }

  const posterPng = await sharp(fsPath).resize(POSTER, POSTER).png().toBuffer();

  // Name in its red block; slogan and signature below, each centred on the right column.
  const nameText = await textLine(
    `<span foreground="${CREAM_LIGHT}">${escapeMarkup(name)}</span>`,
    92,
    PANEL_W - 64,
  );
  const sloganText = await textLine(
    `<span foreground="${CREAM_DIM}" letter_spacing="3000">${escapeMarkup(slogan.toUpperCase())}</span>`,
    26,
    PANEL_W,
  );
  const signText = await textLine(`<span foreground="${CREAM_DIM}">${escapeMarkup(signature)}</span>`, 20, PANEL_W / 2);

  const blockH = nameText.height + 56;
  const gap = 34;
  const totalH = blockH + gap + sloganText.height + gap + signText.height;
  const top = Math.round((SOCIAL_CARD_HEIGHT - totalH) / 2);
  const centreX = (w: number) => Math.round(PANEL_X + (PANEL_W - w) / 2);

  const blockY = top;
  const sloganY = blockY + blockH + gap;
  const signY = sloganY + sloganText.height + gap;
  const signX = centreX(signText.width);
  const ruleY = Math.round(signY + signText.height / 2) - 2;

  // Red name block, a thin cream rule under it, and the two red rules around the signature.
  const blocks = `
  <rect x="${PANEL_X}" y="${blockY}" width="${PANEL_W}" height="${blockH}" fill="${RED}"/>
  <rect x="${PANEL_X}" y="${blockY + blockH + 10}" width="${PANEL_W}" height="3" fill="${CREAM_DIM}" fill-opacity="0.7"/>
  <rect x="${PANEL_X}" y="${ruleY}" width="${signX - 18 - PANEL_X}" height="4" fill="${RED}"/>
  <rect x="${signX + signText.width + 18}" y="${ruleY}" width="${PANEL_X + PANEL_W - (signX + signText.width + 18)}" height="4" fill="${RED}"/>`;

  const jpeg = await sharp(wallSvg(blocks))
    .composite([
      { input: posterPng, left: MARGIN, top: MARGIN },
      { input: nameText.data, left: centreX(nameText.width), top: blockY + Math.round((blockH - nameText.height) / 2) },
      { input: sloganText.data, left: centreX(sloganText.width), top: sloganY },
      { input: signText.data, left: signX, top: signY },
    ])
    .flatten({ background: SOOT })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();

  return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
}
