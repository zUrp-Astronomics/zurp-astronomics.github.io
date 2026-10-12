// SOURCE: zurp-astronomics-site — what a product's page and its firmware/ folder must be in dist/ after the build: the « Flash » block when the catalog holds a firmware, nothing of it otherwise
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #96 (rework of the qualifier's review: the page itself is checked)
//
// Two pure checks, called by scripts/check-dist.mjs on every product of the built catalog and tested
// by test/firmware.test.mjs (test 7) against pages that pass and pages that do not. Each returns
// the list of its problems, empty when the product is as the catalog says.
//
// THE « FLASH » BLOCK (src/pages/[slug]/index.astro, texts of content/site.yml `product.flash`):
//   - a product WITH a firmware: exactly one <section data-flash> on its page; its h2 is the title;
//     its paragraphs are, in order, the intro (filled with the firmware's tag) and the erase
//     warning; its links are one per chip of the catalog, in the catalog's order, each with
//     `data-chip`, the Launchpad link of the TOML at its stable URL, and the text naming its chip
//     (the aria-hidden arrow is not part of it).
//   - a product WITHOUT a firmware: no <section data-flash>, and no Launchpad link anywhere on the
//     page.
// The block is found by its `data-flash` attribute, not by its class: a class is styling, Astro may
// rewrite it (scoped style strategy); the attribute is there for this check.
//
// THE firmware/ FOLDER OF A PRODUCT (dist/<slug>/firmware/):
//   - WITH a firmware: exactly the TOML of each chip (<chip>.toml) and each part it cites
//     (<sha256:16>/<file>), nothing else — a stale file would be served by Pages;
//   - WITHOUT a firmware: no firmware/ folder at all.
// What the TOML says and the parts' sizes are checked by check-dist itself (section 4).

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fill } from '../../src/lib/content.mjs';
import { LAUNCHPAD_URL, chipLabel, firmwarePartPath, firmwareTomlPath, launchpadLink } from '../../src/lib/firmware.mjs';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** The text of an HTML fragment: tags dropped, entities decoded, white space collapsed. */
function textOf(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m))
    .replace(/\s+/g, ' ')
    .trim();
}

/** The attributes of an opening tag's attribute text, values decoded. */
function attributesOf(text) {
  const out = {};
  for (const [, name, , dq, sq, bare] of text.matchAll(/([^\s=/>]+)(\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out[name.toLowerCase()] = textOf(dq ?? sq ?? bare ?? '');
  }
  return out;
}

/** Each `<section …data-flash…>…</section>` of a page (sections are not nested on a product page). */
function flashSections(html) {
  return [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)]
    .filter(([, attrs]) => 'data-flash' in attributesOf(attrs))
    .map(([, , inner]) => inner);
}

/**
 * The problems of the « Flash » block on the page of `product`.
 * @param {string} html the page, dist/<slug>/index.html
 * @param {{ slug: string, firmware: null | { tag: string, chips: Array<{ chip: string }> } }} product from the built catalog
 * @param {{ site: string, texts: { title: string, intro: string, link: string, erase: string } }} options
 *   `site` the site's absolute URL without a trailing slash; `texts` content/site.yml `product.flash`
 * @returns {string[]}
 */
export function flashBlockProblems(html, product, { site, texts }) {
  const where = `dist/${product.slug}/index.html`;
  const sections = flashSections(html);
  if (!product.firmware) {
    const problems = [];
    if (sections.length) problems.push(`${where}: a « Flash » block, the catalog holds no firmware for ${product.slug}`);
    if (html.includes(LAUNCHPAD_URL)) problems.push(`${where}: an ESP Launchpad link, the catalog holds no firmware for ${product.slug}`);
    return problems;
  }
  if (sections.length !== 1) return [`${where}: ${sections.length} « Flash » block(s), the catalog holds a firmware (${product.firmware.tag}): expected 1`];

  const [block] = sections;
  const problems = [];
  const title = textOf(block.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '');
  if (title !== textOf(texts.title)) problems.push(`${where}: the « Flash » block's title is ${JSON.stringify(title)}, expected ${JSON.stringify(texts.title)}`);

  const paragraphs = [...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(([, inner]) => textOf(inner));
  const expectedParagraphs = [fill(texts.intro, { tag: product.firmware.tag }), texts.erase].map(textOf);
  if (JSON.stringify(paragraphs) !== JSON.stringify(expectedParagraphs)) {
    problems.push(`${where}: the « Flash » block says ${JSON.stringify(paragraphs)}, expected ${JSON.stringify(expectedParagraphs)}`);
  }

  const links = [...block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(([, attrs, inner]) => {
    const a = attributesOf(attrs);
    return { chip: a['data-chip'] ?? null, href: a.href ?? null, text: textOf(inner.replace(/<span\b[^>]*\baria-hidden="true"[^>]*>[\s\S]*?<\/span>/gi, '')) };
  });
  const expectedLinks = product.firmware.chips.map(({ chip }) => ({
    chip,
    href: launchpadLink(`${site}/${firmwareTomlPath(product.slug, chip)}`),
    text: textOf(fill(texts.link, { chip: chipLabel(chip) })),
  }));
  if (links.length !== expectedLinks.length) {
    problems.push(`${where}: ${links.length} link(s) in the « Flash » block, the firmware has ${expectedLinks.length} chip(s): ${expectedLinks.map((l) => l.chip).join(', ')}`);
  }
  expectedLinks.forEach((want, i) => {
    const got = links[i];
    if (!got) return;
    for (const key of ['chip', 'href', 'text']) {
      if (got[key] !== want[key]) problems.push(`${where}: « Flash » link ${i + 1} (${want.chip}): ${key} is ${JSON.stringify(got[key])}, expected ${JSON.stringify(want[key])}`);
    }
  });
  return problems;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/**
 * The problems of dist/<slug>/firmware/ for `product`: exactly the TOML of each chip and each part
 * when the catalog holds a firmware, no folder at all when it does not.
 * @param {string} distDir
 * @param {{ slug: string, firmware: null | { chips: Array<{ chip: string, parts: Array<{ file: string, sha256: string }> }> } }} product
 * @returns {string[]}
 */
export function firmwareDirProblems(distDir, product) {
  const dir = join(distDir, product.slug, 'firmware');
  const where = `dist/${product.slug}/firmware/`;
  if (!product.firmware) return existsSync(dir) ? [`${where} exists, the catalog holds no firmware for ${product.slug}`] : [];
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`${where} is missing, the catalog holds a firmware (${product.firmware.tag})`];
  const expected = new Set(product.firmware.chips.flatMap(({ chip, parts }) => [firmwareTomlPath(product.slug, chip), ...parts.map((p) => firmwarePartPath(product.slug, p))]));
  const found = walk(dir).map((abs) => relative(distDir, abs).split(sep).join('/'));
  return found.filter((rel) => !expected.has(rel)).map((rel) => `dist/${rel}: not a file of the firmware ${product.firmware.tag} of the catalog`);
}
