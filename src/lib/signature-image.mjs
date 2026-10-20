// SOURCE: zurp-astronomics-site — the signature of the product READMEs' footer as an image: content/site.yml's `signature` and `header.subtitle`, drawn by the site at each build, at a stable URL
// AUTHOR: engineer
// DATE: 2026-10-20
// STATUS: active — ticket #115
//
// WHY. The footer block of a product README (content/readme-kit/product-footer.md) is pasted ONCE
// and never again, like the header: it holds only URLs whose content the site serves and keeps up to
// date. The signature is one of them — an image, so that it follows content/site.yml (`signature`,
// filled with `name` and `affiliation`, and `header.subtitle`) without the block being pasted again:
//
//   https://zurp-astronomics.github.io/brand/signature.png
//
// ⚠ A README links this URL FOREVER: never move or rename it (same rule as the other stable URLs of
// src/lib/brand-images.ts).
//
// WHY A PNG, NOT AN SVG. GitHub shows an SVG of a README through <img>, which loads no web font: an
// SVG text would be set in whatever font the viewer has. Here the text is set by sharp (Pango) with
// the site's display face, Black Ops One, from the font file vendored in src/assets/fonts/ — as the
// social cards do (src/lib/social-card.ts) — and baked into pixels: the same on every screen.
//
// BOTH GITHUB THEMES. The signature is a small OPAQUE plate on the site's soot wall (the --z2-* tokens
// of src/layouts/V2Layout.astro): cream text, a cream enamel edge, the subtitle in wide-tracked
// capitals between two red rules, as on the posters. Its own background carries the contrast, so it
// reads the same on GitHub's light and dark backgrounds. 800 px wide: a ~400 px display, at double
// density. Drawn without network and deterministically (same texts → same bytes).
//
// Plain JavaScript, so that the site (src/pages/brand/signature.png.ts) and the tests share it.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

/** Published path, relative to the site root. */
export const SIGNATURE_PATH = 'brand/signature.png';
/** px: displayed ~400 px wide in a README, at double density. */
export const SIGNATURE_WIDTH = 800;

const FONT = 'Black Ops One';
// The build and the tests run from the repository root (`npm run …`); the bundled endpoint does not
// live next to its source: resolve from the working directory, as src/lib/social-card.ts does.
const FONT_FILE = 'src/assets/fonts/BlackOpsOne-Regular.ttf';

// Palette: the --z2-* tokens of src/layouts/V2Layout.astro.
const SOOT = '#1b1a18';
const CREAM_LIGHT = '#f4ead0';
const CREAM_DIM = '#c9bb98';
const RED = '#dc2a1c';

const PAD_X = 44; // px, inside the enamel edge
const PAD_Y = 30;
const GAP = 18; // between the two lines
const EDGE = 6; // the cream edge's inset

const escapeMarkup = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The two texts of the signature image, from content/site.yml (`siteContent`: `signature` comes back filled). */
export const signatureTexts = (site) => ({ signature: site.signature, subtitle: site.header.subtitle });

/** A line of text as a transparent PNG at `size` px (72 dpi); a line wider than `maxWidth` is shrunk to fit it. */
async function textLine(markup, size, maxWidth, fontfile) {
  const render = (text) =>
    sharp({ text: { text: markup, fontfile, rgba: true, align: 'centre', ...text } })
      .png()
      .toBuffer({ resolveWithObject: true });
  let { data, info } = await render({ font: `${FONT} ${size}`, dpi: 72 });
  if (info.width > maxWidth) {
    ({ data, info } = await render({ font: FONT, width: maxWidth, height: info.height }));
  }
  return { data, width: info.width, height: info.height };
}

/**
 * The signature image: an opaque PNG, SIGNATURE_WIDTH px wide.
 * @param {{ signature: string, subtitle: string }} texts  signatureTexts(siteContent())
 * @param {{ fontFile?: string }} [options]
 * @returns {Promise<Buffer>}
 */
export async function signaturePng({ signature, subtitle }, { fontFile = resolve(FONT_FILE) } = {}) {
  if (!signature || !subtitle) throw new Error('signature image: content/site.yml has no `signature` or no `header.subtitle`');
  if (!existsSync(fontFile)) {
    throw new Error(`signature image: font not found at ${fontFile} — run from the repository root`);
  }
  const W = SIGNATURE_WIDTH;
  const inner = W - 2 * PAD_X;
  const sign = await textLine(`<span foreground="${CREAM_LIGHT}">${escapeMarkup(signature)}</span>`, 30, inner, fontFile);
  const sub = await textLine(
    `<span foreground="${CREAM_DIM}" letter_spacing="2600">${escapeMarkup(subtitle.toUpperCase())}</span>`,
    20,
    inner - 2 * 64,
    fontFile,
  );
  const H = PAD_Y + sign.height + GAP + sub.height + PAD_Y;
  const centreX = (w) => Math.round((W - w) / 2);
  const signY = PAD_Y;
  const subY = signY + sign.height + GAP;
  const subX = centreX(sub.width);
  const ruleY = Math.round(subY + sub.height / 2) - 2;
  const ruleL = { x: PAD_X, w: subX - 16 - PAD_X };
  const ruleR = { x: subX + sub.width + 16, w: W - PAD_X - (subX + sub.width + 16) };

  const wall = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="rgb(140,170,230)" stroke-opacity="0.08" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${SOOT}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect x="${EDGE}" y="${EDGE}" width="${W - 2 * EDGE}" height="${H - 2 * EDGE}" fill="none" stroke="${CREAM_DIM}" stroke-opacity="0.75" stroke-width="3"/>
  ${ruleL.w > 0 ? `<rect x="${ruleL.x}" y="${ruleY}" width="${ruleL.w}" height="4" fill="${RED}"/>` : ''}
  ${ruleR.w > 0 ? `<rect x="${ruleR.x}" y="${ruleY}" width="${ruleR.w}" height="4" fill="${RED}"/>` : ''}
</svg>`);

  // Two passes: sharp composites AFTER every other operation of a pipeline, so a flatten in the same
  // pipeline would run before the texts are laid on and leave an alpha channel.
  const composed = await sharp(wall)
    .composite([
      { input: sign.data, left: centreX(sign.width), top: signY },
      { input: sub.data, left: subX, top: subY },
    ])
    .png()
    .toBuffer();
  return sharp(composed).flatten({ background: SOOT }).png({ compressionLevel: 9 }).toBuffer();
}
