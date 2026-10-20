// SOURCE: zurp-astronomics-site — what a product's page and its manual/ folder must be in dist/ after the build: the manual's tabs as the catalog says, the Install block in the Setup tab, the images in place; nothing of a manual without one
// AUTHOR: engineer
// DATE: 2026-10-20
// STATUS: active — ticket #111
//
// Pure checks, called by scripts/check-dist.mjs on every product of the built catalog and tested by
// test/manual.test.mjs. Each returns the list of its problems, empty when the product is as the
// catalog says (src/lib/manual.mjs, manualTabs).
//
// THE PAGE (src/pages/[slug]/index.astro, src/components/v2/ManualTabs.astro):
//   - a product WITHOUT a manual: no [data-manual], no role="tab", no role="tabpanel" — its page is
//     the page it had before ticket #111 (« About », then the #install block when it has one);
//   - a product WITH a manual: exactly one [data-manual]; its tabs (role="tab") are the catalog's, in
//     order, each `id="tab-<tab>"`, `aria-controls="<tab>"`, titled with content/site.yml
//     `product.manual.tabs`; the first one selected (aria-selected="true", tabindex 0), the others
//     not (-1); one panel (role="tabpanel", `id="<tab>"`, aria-labelledby its tab) per tab, in the
//     same order, only the first one without `hidden`; a panel with a file has its text
//     ([data-manual-text]) in the file's language (`lang`); the Install block ([data-install]),
//     when the product has one, inside the Setup panel; no « About » section when there is an
//     Overview tab, one when there is none; every image of a panel served from dist/;
//   - THE manual/ FOLDER (dist/<slug>/manual/): exactly the images of the catalog, each at the size
//     it gives, byte for byte (SHA-256); no folder without one.
// The weight of every image of dist/ (600 KB) is checked by scripts/check-dist.mjs, on every image.
// Found by attributes (`role`, `data-…`), never by a class: a class is styling.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { manualImagePath, manualTabs } from '../../src/lib/manual.mjs';
import { attributesOf, textOf } from './check-install.mjs';

/** Every opening tag `tag` of a page carrying `role="<role>"`: its attributes, its offset, and (for a button) its text. */
const byRole = (html, tag, role) =>
  [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'))]
    .map((m) => ({ attrs: attributesOf(m[1]), at: m.index, end: m.index + m[0].length }))
    .filter(({ attrs }) => attrs.role === role)
    .map((t) => (tag === 'button' ? { ...t, text: textOf(html.slice(t.end, html.indexOf('</button>', t.end))) } : t));

/** Offsets of the opening tags carrying the attribute `marker`. */
const markedAt = (html, marker) =>
  [...html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)].filter((m) => marker in attributesOf(m[2])).map((m) => ({ at: m.index, attrs: attributesOf(m[2]) }));

/**
 * The problems of the manual on the page of `product`.
 * @param {string} html the page, dist/<slug>/index.html
 * @param {{ slug: string, install?: unknown, manual?: null | { tabs: Array<{ id: string, lang: string }>, images: Array<{ name: string }> } }} product from the built catalog
 * @param {{ texts: { tabs: Record<string, string> }, distDir: string }} options `texts`: src/lib/manual.mjs manualTexts(content/site.yml)
 * @returns {string[]}
 */
export function manualPageProblems(html, product, { texts, distDir }) {
  const where = `dist/${product.slug}/index.html`;
  const expected = manualTabs(product);
  const roots = markedAt(html, 'data-manual');
  const tabs = byRole(html, 'button', 'tab');
  const panels = byRole(html, 'div', 'tabpanel');
  const about = /<section\b[^>]*\bclass="[^"]*\bdescription\b/i.test(html);
  if (!expected) {
    const found = [[roots, 'manual block [data-manual]'], [tabs, 'tab'], [panels, 'tab panel']].filter(([l]) => l.length);
    const problems = found.map(([l, what]) => `${where}: ${l.length} ${what}(s), the catalog holds no manual for ${product.slug}`);
    if (!about) problems.push(`${where}: no « About » section, the catalog holds no manual for ${product.slug} (its page must not change)`);
    return problems;
  }

  const problems = [];
  if (roots.length !== 1) problems.push(`${where}: ${roots.length} manual block(s) [data-manual], expected 1`);
  const ids = expected.map((t) => t.id);
  const tabIds = tabs.map((t) => t.attrs['aria-controls'] ?? null);
  if (JSON.stringify(tabIds) !== JSON.stringify(ids)) problems.push(`${where}: tabs ${JSON.stringify(tabIds)}, the catalog gives ${JSON.stringify(ids)}`);
  const panelIds = panels.map((p) => p.attrs.id ?? null);
  if (JSON.stringify(panelIds) !== JSON.stringify(ids)) problems.push(`${where}: tab panels ${JSON.stringify(panelIds)}, the catalog gives ${JSON.stringify(ids)}`);
  if (problems.length) return problems;

  expected.forEach((want, i) => {
    const tab = tabs[i];
    const panel = panels[i];
    const first = i === 0;
    if (tab.attrs.id !== `tab-${want.id}`) problems.push(`${where}: the ${want.id} tab's id is ${JSON.stringify(tab.attrs.id ?? null)}, expected "tab-${want.id}"`);
    if (tab.text !== textOf(texts.tabs[want.id])) problems.push(`${where}: the ${want.id} tab says ${JSON.stringify(tab.text)}, expected ${JSON.stringify(texts.tabs[want.id])} (content/site.yml)`);
    if (tab.attrs['aria-selected'] !== String(first)) problems.push(`${where}: the ${want.id} tab's aria-selected is ${JSON.stringify(tab.attrs['aria-selected'] ?? null)}, expected "${first}"`);
    if (tab.attrs.tabindex !== (first ? '0' : '-1')) problems.push(`${where}: the ${want.id} tab's tabindex is ${JSON.stringify(tab.attrs.tabindex ?? null)}, expected "${first ? 0 : -1}"`);
    if (panel.attrs['aria-labelledby'] !== `tab-${want.id}`) problems.push(`${where}: the ${want.id} panel is labelled by ${JSON.stringify(panel.attrs['aria-labelledby'] ?? null)}, expected "tab-${want.id}"`);
    if (('hidden' in panel.attrs) === first) problems.push(`${where}: the ${want.id} panel is ${first ? 'hidden' : 'shown'} at load, expected ${first ? 'shown (the first tab)' : 'hidden'}`);
    const segment = html.slice(panel.at, panels[i + 1]?.at ?? html.length);
    const text = markedAt(segment, 'data-manual-text');
    if (want.html === null) {
      if (text.length) problems.push(`${where}: the ${want.id} panel has a text, the catalog holds no file for it (Install only)`);
    } else if (text.length !== 1) {
      problems.push(`${where}: the ${want.id} panel has ${text.length} text(s), expected 1`);
    } else if (text[0].attrs.lang !== want.lang) {
      problems.push(`${where}: the ${want.id} text's lang is ${JSON.stringify(text[0].attrs.lang ?? null)}, expected ${JSON.stringify(want.lang)} (the file shown)`);
    }
  });

  // The Install block, in the Setup panel and in no other.
  const install = markedAt(html, 'data-install');
  if (product.install) {
    const s = ids.indexOf('setup');
    const start = panels[s]?.at;
    const end = panels[s + 1]?.at ?? html.length;
    if (s < 0) problems.push(`${where}: no Setup tab, the product has something to install`);
    else if (install.length !== 1 || !(install[0].at > start && install[0].at < end)) {
      problems.push(`${where}: the #install block is not in the Setup tab (${install.length} block(s))`);
    }
  }

  const overview = ids.includes('overview');
  if (overview && about) problems.push(`${where}: an « About » section beside the Overview tab, which replaces it`);
  if (!overview && !about) problems.push(`${where}: no « About » section, and no Overview tab to replace it`);

  // Every image of the panels (and of what follows them on the page), served from dist/.
  for (const [, attrs] of html.slice(panels[0].at).matchAll(/<img\b([^>]*)>/gi)) {
    const src = attributesOf(attrs).src ?? '';
    const file = src.startsWith('/') ? join(distDir, decodeURIComponent(src.slice(1).split(/[?#]/)[0])) : null;
    if (!file || !existsSync(file)) problems.push(`${where}: an image of the manual, ${JSON.stringify(src)}, is not a file of dist/`);
  }
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
 * The problems of dist/<slug>/manual/ for `product`: exactly the images of its manual, byte for byte
 * (size, SHA-256); no folder when it has none.
 * @param {string} distDir
 * @param {{ slug: string, manual?: null | { images: Array<{ name: string, size: number, sha256: string }> } }} product
 * @returns {string[]}
 */
export function manualDirProblems(distDir, product) {
  const dir = join(distDir, product.slug, 'manual');
  const where = `dist/${product.slug}/manual/`;
  const images = product.manual?.images ?? [];
  if (!images.length) return existsSync(dir) ? [`${where} exists, the catalog holds no image of a manual for ${product.slug}`] : [];
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`${where} is missing, the catalog holds ${images.length} image(s) of its manual`];
  const expected = new Map(images.map((i) => [manualImagePath(product.slug, i), i]));
  const found = walk(dir).map((abs) => relative(distDir, abs).split(sep).join('/'));
  const problems = found.filter((rel) => !expected.has(rel)).map((rel) => `dist/${rel}: not an image of the manual of ${product.slug} in the catalog`);
  for (const [rel, image] of expected) {
    const file = join(distDir, rel);
    if (!existsSync(file)) {
      problems.push(`dist/${rel} is missing (${image.source})`);
      continue;
    }
    const bytes = readFileSync(file);
    if (bytes.length !== image.size) problems.push(`dist/${rel} is ${bytes.length} bytes, the catalog gives ${image.size}`);
    else if (createHash('sha256').update(bytes).digest('hex') !== image.sha256) problems.push(`dist/${rel} is not the image of the catalog byte for byte`);
  }
  return problems;
}
