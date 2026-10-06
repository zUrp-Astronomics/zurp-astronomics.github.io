// SOURCE: zurp-astronomics-site — the licence badges of a product README: two SVG files per product, drawn by the site at each build, at stable URLs
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — ticket #75
//
// WHY. The README header of a product repository (content/readme-kit/product-header.md) is pasted
// ONCE and never again (ticket #53): it holds only URLs whose content is served, and kept up to date,
// elsewhere. Its two licence badges are files the site draws itself at each build, one per kind of
// licence, from the catalog (src/lib/license-stamp.mjs — the same licences as the product page):
//
//   https://zurp-astronomics.github.io/brand/badges/<slug>/software.svg
//   https://zurp-astronomics.github.io/brand/badges/<slug>/hardware.svg
//
// ⚠ A README links these URLs FOREVER: never move or rename them (same rule as the other stable URLs
// of src/lib/brand-images.ts).
//
// THE BADGE. A licence present: a badge in the style of the shields.io « flat » badges, its left part
// the label of its kind, its right part the short label of the licence (`software | MIT`,
// `hardware | OCL v1.1`) — labels and colours from content/licences.yml. A licence absent: an EMPTY
// SVG, of zero size, that GitHub shows as nothing — so the header pasted today shows the licence the
// day the file arrives in the repository, and nothing until then.
//
// Drawn without network and deterministically: the width of a text is estimated from the advance
// widths of Verdana at 11 px (the font shields measures with), and each text is given that width
// (`textLength`), so that it fits its box whatever font the viewer has.
//
// Plain JavaScript, so that the site (src/pages/brand/badges/[slug]/[kind].svg.ts), the README kit
// (scripts/readme-kit.mjs), the post-build guard (scripts/check-dist.mjs) and the tests share it.

import { productLicense } from './license-stamp.mjs';

/** Published path, relative to the site root. */
export const licenseBadgePath = (slug, kind) => `brand/badges/${slug}/${kind}.svg`;

/** The badge of a licence that is absent: zero size, nothing drawn. */
export const EMPTY_BADGE = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"/>\n';

// Advance widths of Verdana (units per em: 2048), printable ASCII from the space (0x20) to `~`
// (0x7e). Anything else is counted as a digit's width.
const VERDANA = [
  720, 805, 942, 1675, 1303, 2216, 1484, 548, 909, 909, 1303, 1675, 745, 909, 745, 1260, // space … /
  1303, 1303, 1303, 1303, 1303, 1303, 1303, 1303, 1303, 1303, 909, 909, 1675, 1675, 1675, 1110, // 0 … ?
  2048, 1401, 1405, 1434, 1577, 1294, 1178, 1587, 1540, 863, 924, 1424, 1141, 1734, 1532, 1612, // @ … O
  1235, 1612, 1440, 1405, 1255, 1503, 1401, 2025, 1405, 1255, 1405, 909, 1260, 909, 1675, 1303, // P … _
  1303, 1229, 1276, 1067, 1276, 1208, 720, 1276, 1296, 562, 705, 1198, 562, 1992, 1296, 1243, // ` … o
  1276, 1276, 874, 1067, 807, 1296, 1198, 1667, 1198, 1198, 1061, 1303, 909, 1303, 1675, // p … ~
];
const FONT_SIZE = 11;
const PADDING = 5; // px, on each side of each text, as shields draws them

/** Estimated width of `text` in Verdana 11 px, in px (one decimal). */
export function textWidth(text) {
  let units = 0;
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    units += c >= 0x20 && c <= 0x7e ? VERDANA[c - 0x20] : 1303;
  }
  return Math.round((units * FONT_SIZE * 10) / 2048) / 10;
}

const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A « flat » badge: `label` on `labelColor`, `message` on `color`.
 * @param {{ label: string, message: string, color: string, labelColor: string }} badge
 */
export function flatBadgeSvg({ label, message, color, labelColor }) {
  const lt = textWidth(label);
  const mt = textWidth(message);
  const lw = Math.round(lt + 2 * PADDING);
  const mw = Math.round(mt + 2 * PADDING);
  const w = lw + mw;
  const aria = escapeXml(`${label}: ${message}`);
  // Texts are drawn at 10× and scaled down (shields' way: finer positioning).
  const text = (x, t, len) =>
    `<text aria-hidden="true" x="${x}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${len}">${escapeXml(t)}</text>` +
    `<text x="${x}" y="140" transform="scale(.1)" fill="#fff" textLength="${len}">${escapeXml(t)}</text>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${aria}">` +
    `<title>${aria}</title>` +
    '<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>' +
    `<clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>` +
    `<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="${labelColor}"/><rect x="${lw}" width="${mw}" height="20" fill="${color}"/><rect width="${w}" height="20" fill="url(#s)"/></g>` +
    '<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">' +
    text(lw * 5, label, Math.round(lt * 10)) +
    text(Math.round((lw + mw / 2) * 10), message, Math.round(mt * 10)) +
    '</g></svg>\n'
  );
}

/**
 * The badge of the licence of `kind` of a product: the « flat » badge when it has one, EMPTY_BADGE
 * when it has none.
 * @param {{ license?: any, hardwareLicense?: any }} product
 * @param {'software' | 'hardware'} kind
 * @param {any} texts content/licences.yml (licenseContent)
 */
export function licenseBadgeSvg(product, kind, texts) {
  const licence = productLicense(product, kind, texts);
  if (!licence) return EMPTY_BADGE;
  return flatBadgeSvg({ label: texts[kind].badge.label, message: licence.label, color: texts[kind].badge.color, labelColor: texts.badge.labelColor });
}
