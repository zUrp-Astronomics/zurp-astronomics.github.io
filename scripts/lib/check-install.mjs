// SOURCE: zurp-astronomics-site — what a product's page and its firmware/ folder must be in dist/ after the build: the #install block, the ESP Web Tools button and the manifest folder when the catalog holds them, nothing of them otherwise
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #101 (replaces scripts/lib/check-firmware.mjs, the ESP Launchpad checks of ticket #96)
// REVISED: 2026-10-16 (ticket #107) — the web bench: its button, dialog frame and « new tab » link in
//   the #install block, its file in dist/<slug>/bench/, none of them without a bench
//
// Pure checks, called by scripts/check-dist.mjs on every product of the built catalog and tested by
// test/install.test.mjs against pages and folders that pass and that do not. Each returns the list of
// its problems, empty when the product is as the catalog says.
//
// THE #install BLOCK (src/pages/[slug]/index.astro, texts of content/site.yml `product.install`):
//   - a product WITH an install: exactly one <section data-install id="install"> on its page, its h2
//     the title, a paragraph giving the version (the release's tag); when the catalog holds an ESP
//     publication, exactly one <esp-web-install-button>, in the block, whose `manifest` is the URL
//     path of the copied manifest, and a module script of the page, in dist/, that defines the
//     element (with every chunk it lazy-loads): a button without its script is a dead tag; the
//     download links (`data-download`) are the catalog's, in its order grouped by kind (hex, then
//     img), each to its GitHub URL;
//   - the web bench (ticket #107): when the catalog holds one, exactly one bench button
//     (<button data-bench>) on the page, in the block, whose `data-bench` is the bench's URL path,
//     a file of dist/ at the size the catalog gives; exactly one « new tab » link (<a
//     data-bench-tab>) to that same URL; exactly one frame (<iframe data-bench-frame>) with
//     allow="serial" and no `src` (set when the dialog opens: nothing loads before the click); the
//     button's and the link's texts those of content/site.yml. Without a bench: none of the three;
//   - a product WITHOUT an install: no <section data-install>, no <esp-web-install-button>, nothing
//     of a bench.
// The block is found by its `data-install` attribute, not by its class: a class is styling, Astro may
// rewrite it; the attribute is there for this check.
//
// THE firmware/ FOLDER OF A PRODUCT (dist/<slug>/firmware/):
//   - WITH an ESP publication: exactly <id>/manifest.json and the files it names
//     (src/lib/install.mjs) — a stale file would be served by Pages; the manifest at the size the
//     catalog gives, valid JSON, and each `path` of its builds' parts a file of the same folder at the
//     size the catalog gives;
//   - WITHOUT one: no firmware/ folder at all.
//
// THE bench/ FOLDER OF A PRODUCT (dist/<slug>/bench/, ticket #107):
//   - WITH a bench: exactly <id>/<file>, byte for byte the bench of the catalog (its size and its
//     SHA-256);
//   - WITHOUT one: no bench/ folder at all; and no file of dist/ ending in `_bench.html` but the
//     benches of the catalog (strayBenchProblems).

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { BENCH_SUFFIX } from '../../src/lib/catalog/install.mjs';
import { fill } from '../../src/lib/content.mjs';
import { benchPath, benchUrlPath, espDirPath, espManifestUrlPath, espPublishedPaths } from '../../src/lib/install.mjs';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const DEFINES_BUTTON = /customElements\.define\(\s*["'`]esp-web-install-button["'`]/;

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

/** Each `<section …data-install…>…</section>` of a page, with its attributes (sections are not nested on a product page). */
function installSections(html) {
  return [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)]
    .map(([, attrs, inner]) => ({ attrs: attributesOf(attrs), inner }))
    .filter(({ attrs }) => 'data-install' in attrs);
}

/** Each <esp-web-install-button> of an HTML fragment, its attributes. */
const espButtons = (html) => [...html.matchAll(/<esp-web-install-button\b([^>]*)>/gi)].map(([, attrs]) => attributesOf(attrs));

/** Each element `tag` of an HTML fragment carrying the attribute `marker`: its attributes and its text. */
const marked = (html, tag, marker) =>
  [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi'))]
    .map(([, attrs, inner]) => ({ attrs: attributesOf(attrs), text: textOf(inner.replace(/<span\b[^>]*\baria-hidden="true"[^>]*>[\s\S]*?<\/span>/gi, '')) }))
    .filter(({ attrs }) => marker in attrs);

/** The bench's button, « new tab » link and frame in an HTML fragment. */
const benchParts = (html) => ({
  buttons: marked(html, 'button', 'data-bench'),
  tabs: marked(html, 'a', 'data-bench-tab'),
  frames: marked(html, 'iframe', 'data-bench-frame'),
});

/** The problems of the bench's parts in the #install block, the catalog holding `bench`. */
function benchBlockProblems(page, block, slug, bench, { texts, distDir }, where) {
  const all = benchParts(page);
  const own = benchParts(block);
  const url = benchUrlPath(slug, bench);
  const problems = [];
  if (all.buttons.length !== 1 || own.buttons.length !== 1) {
    problems.push(`${where}: ${all.buttons.length} bench button(s), ${own.buttons.length} in the #install block — expected exactly 1, in it`);
  } else {
    const [button] = own.buttons;
    if (button.attrs['data-bench'] !== url) problems.push(`${where}: the bench button opens ${JSON.stringify(button.attrs['data-bench'] ?? null)}, expected ${JSON.stringify(url)}`);
    else {
      const file = join(distDir, benchPath(slug, bench));
      if (!existsSync(file) || !statSync(file).isFile()) problems.push(`${where}: the bench button opens ${url}, missing: dist/${benchPath(slug, bench)}`);
      else if (statSync(file).size !== bench.size) problems.push(`${where}: the bench button opens ${url}, ${statSync(file).size} bytes, the catalog gives ${bench.size}`);
    }
    if (button.text !== textOf(texts.bench.button)) problems.push(`${where}: the bench button says ${JSON.stringify(button.text)}, expected ${JSON.stringify(texts.bench.button)}`);
  }
  if (all.tabs.length !== 1 || own.tabs.length !== 1) {
    problems.push(`${where}: ${all.tabs.length} bench « new tab » link(s), ${own.tabs.length} in the #install block — expected exactly 1, in it`);
  } else {
    const [tab] = own.tabs;
    if (tab.attrs.href !== url) problems.push(`${where}: the bench « new tab » link goes to ${JSON.stringify(tab.attrs.href ?? null)}, expected ${JSON.stringify(url)} (the bench button's URL)`);
    if (tab.text !== textOf(texts.bench.tab)) problems.push(`${where}: the bench « new tab » link says ${JSON.stringify(tab.text)}, expected ${JSON.stringify(texts.bench.tab)}`);
  }
  if (all.frames.length !== 1 || own.frames.length !== 1) {
    problems.push(`${where}: ${all.frames.length} bench frame(s), ${own.frames.length} in the #install block — expected exactly 1, in it`);
  } else {
    const [{ attrs }] = own.frames;
    if (!(attrs.allow ?? '').split(/[;\s]+/).includes('serial')) problems.push(`${where}: the bench frame's allow is ${JSON.stringify(attrs.allow ?? null)}: Web Serial needs allow="serial"`);
    if ('src' in attrs) problems.push(`${where}: the bench frame has a src (${JSON.stringify(attrs.src)}): it is set when the dialog opens, nothing loads before the click`);
  }
  return problems;
}

/** The problems of a page showing something of a bench the catalog does not hold. */
function noBenchProblems(page, product, why) {
  const where = `dist/${product.slug}/index.html`;
  const { buttons, tabs, frames } = benchParts(page);
  const found = [[buttons, 'bench button'], [tabs, 'bench « new tab » link'], [frames, 'bench frame']].filter(([l]) => l.length);
  return found.map(([l, what]) => `${where}: ${l.length} ${what}(s), the catalog holds no bench for ${product.slug}${why}`);
}

/**
 * Whether one of the page's module scripts, in dist/, defines <esp-web-install-button>; the problems
 * otherwise (or a chunk it lazy-loads that is missing).
 */
function buttonScriptProblems(html, distDir, where) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(([, attrs]) => attributesOf(attrs)).filter((a) => a.type === 'module' && a.src?.startsWith('/'));
  for (const { src } of scripts) {
    const file = join(distDir, decodeURIComponent(src.split(/[?#]/)[0].replace(/^\/+/, '')));
    if (!existsSync(file)) continue;
    const code = readFileSync(file, 'utf8');
    if (!DEFINES_BUTTON.test(code)) continue;
    const chunks = [...new Set([...code.matchAll(/["'`](_astro\/[^"'`]+\.js)["'`]/g)].map(([, c]) => c))];
    return chunks.filter((c) => !existsSync(join(distDir, c))).map((c) => `${where}: the ESP Web Tools script ${src} loads dist/${c}, which is missing`);
  }
  return [`${where}: no module script of the page defines <esp-web-install-button> — the install button is a dead tag`];
}

/**
 * The problems of the #install block on the page of `product`.
 * @param {string} html the page, dist/<slug>/index.html
 * @param {{ slug: string, install: null | { tag: string, esp: any, downloads: Array<{ kind: string, name: string, url: string }>, bench?: null | { id: string, name: string, size: number } } }} product from the built catalog
 * @param {{ texts: { title: string, version: string, download: string, bench: { button: string, tab: string } }, distDir: string }} options
 *   `texts` content/site.yml `product.install`; `distDir` where the page's scripts and the bench are
 * @returns {string[]}
 */
export function installBlockProblems(html, product, { texts, distDir }) {
  const where = `dist/${product.slug}/index.html`;
  const sections = installSections(html);
  const buttons = espButtons(html);
  const install = product.install;
  if (!install) {
    const problems = [];
    if (sections.length) problems.push(`${where}: an #install block, the catalog holds nothing to install for ${product.slug}`);
    if (buttons.length) problems.push(`${where}: an ESP Web Tools button, the catalog holds nothing to install for ${product.slug}`);
    problems.push(...noBenchProblems(html, product, ' (nothing to install)'));
    return problems;
  }
  if (sections.length !== 1) return [`${where}: ${sections.length} #install block(s), the catalog holds an install (${install.tag}): expected 1`];

  const [{ attrs, inner: block }] = sections;
  const problems = [];
  if (attrs.id !== 'install') problems.push(`${where}: the install block's id is ${JSON.stringify(attrs.id ?? null)}, expected "install" (the stable anchor)`);
  const title = textOf(block.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '');
  if (title !== textOf(texts.title)) problems.push(`${where}: the #install block's title is ${JSON.stringify(title)}, expected ${JSON.stringify(texts.title)}`);
  const version = textOf(fill(texts.version, { tag: install.tag }));
  const paragraphs = [...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(([, inner]) => textOf(inner));
  if (!paragraphs.includes(version)) problems.push(`${where}: the #install block does not say ${JSON.stringify(version)} (the version installed)`);

  // The ESP Web Tools button.
  const inBlock = espButtons(block);
  if (!install.esp) {
    if (buttons.length) problems.push(`${where}: an ESP Web Tools button, the catalog holds no ESP publication for ${product.slug} (${install.tag})`);
  } else {
    const manifest = espManifestUrlPath(product.slug, install.esp);
    if (buttons.length !== 1 || inBlock.length !== 1) {
      problems.push(`${where}: ${buttons.length} ESP Web Tools button(s), ${inBlock.length} in the #install block — expected exactly 1, in it`);
    } else if (inBlock[0].manifest !== manifest) {
      problems.push(`${where}: the ESP Web Tools button's manifest is ${JSON.stringify(inBlock[0].manifest ?? null)}, expected ${JSON.stringify(manifest)}`);
    }
    problems.push(...buttonScriptProblems(html, distDir, where));
  }

  // The web bench.
  if (install.bench) problems.push(...benchBlockProblems(html, block, product.slug, install.bench, { texts, distDir }, where));
  else problems.push(...noBenchProblems(html, product, ` (${install.tag})`));

  // The download links.
  const links = [...block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(([, a, inner]) => ({ attrs: attributesOf(a), inner }))
    .filter(({ attrs: a }) => 'data-download' in a)
    .map(({ attrs: a, inner }) => ({
      kind: a['data-download'],
      href: a.href ?? null,
      text: textOf(inner.replace(/<span\b[^>]*\baria-hidden="true"[^>]*>[\s\S]*?<\/span>/gi, '')),
    }));
  const expected = ['hex', 'img'].flatMap((kind) =>
    install.downloads.filter((d) => d.kind === kind).map((d) => ({ kind, href: d.url, text: textOf(fill(texts.download, { file: d.name })) })),
  );
  if (links.length !== expected.length) {
    problems.push(`${where}: ${links.length} download link(s) in the #install block, the catalog has ${expected.length}: ${expected.map((l) => l.href).join(', ') || 'none'}`);
  }
  expected.forEach((want, i) => {
    const got = links[i];
    if (!got) return;
    for (const key of ['kind', 'href', 'text']) {
      if (got[key] !== want[key]) problems.push(`${where}: download link ${i + 1}: ${key} is ${JSON.stringify(got[key])}, expected ${JSON.stringify(want[key])}`);
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
 * The problems of dist/<slug>/firmware/ for `product`: exactly the manifest and the files it names
 * when the catalog holds an ESP publication — the manifest valid, each file it names in place at the
 * size the catalog gives — no folder at all when it does not.
 * @param {string} distDir
 * @param {{ slug: string, install: null | { tag: string, esp: null | { id: string, manifest: { name: string, size: number }, files: Array<{ name: string, size: number }> } } }} product
 * @returns {string[]}
 */
export function espDirProblems(distDir, product) {
  const dir = join(distDir, product.slug, 'firmware');
  const where = `dist/${product.slug}/firmware/`;
  const esp = product.install?.esp;
  if (!esp) return existsSync(dir) ? [`${where} exists, the catalog holds no ESP publication for ${product.slug}`] : [];
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`${where} is missing, the catalog holds an ESP publication (${product.install.tag})`];
  const expected = new Set(espPublishedPaths(product.slug, esp));
  const found = walk(dir).map((abs) => relative(distDir, abs).split(sep).join('/'));
  const problems = found.filter((rel) => !expected.has(rel)).map((rel) => `dist/${rel}: not a file of the ESP publication ${product.install.tag} of the catalog`);

  const folder = espDirPath(product.slug, esp);
  const manifestFile = join(distDir, folder, esp.manifest.name);
  const at = `dist/${folder}/${esp.manifest.name}`;
  if (!existsSync(manifestFile)) return [...problems, `${at} is missing`];
  if (statSync(manifestFile).size !== esp.manifest.size) problems.push(`${at} is ${statSync(manifestFile).size} bytes, the catalog gives ${esp.manifest.size}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestFile, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    return [...problems, `${at}: not valid JSON — ${String(e?.message ?? e).split('\n')[0]}`];
  }
  const sizes = new Map(esp.files.map((f) => [f.name, f.size]));
  const paths = new Set((Array.isArray(manifest?.builds) ? manifest.builds : []).flatMap((b) => (Array.isArray(b?.parts) ? b.parts : []).map((p) => p?.path)));
  if (!paths.size) problems.push(`${at}: names no file`);
  for (const path of paths) {
    const file = join(distDir, folder, String(path));
    if (!sizes.has(path)) problems.push(`${at}: names ${JSON.stringify(path)}, not a file of the catalog's ESP publication`);
    else if (!existsSync(file) || !statSync(file).isFile()) problems.push(`${at}: names ${JSON.stringify(path)}, missing: dist/${folder}/${path}`);
    else if (statSync(file).size !== sizes.get(path)) problems.push(`dist/${folder}/${path} is ${statSync(file).size} bytes, the catalog gives ${sizes.get(path)}`);
  }
  return problems;
}

/**
 * The problems of dist/<slug>/bench/ for `product`: exactly the bench of the catalog, byte for byte
 * (its size and SHA-256), when the catalog holds one; no folder at all when it does not.
 * @param {string} distDir
 * @param {{ slug: string, install: null | { tag: string, bench?: null | { id: string, name: string, size: number, sha256: string } } }} product
 * @returns {string[]}
 */
export function benchDirProblems(distDir, product) {
  const dir = join(distDir, product.slug, 'bench');
  const where = `dist/${product.slug}/bench/`;
  const bench = product.install?.bench;
  if (!bench) return existsSync(dir) ? [`${where} exists, the catalog holds no bench for ${product.slug}`] : [];
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`${where} is missing, the catalog holds a bench (${product.install.tag})`];
  const expected = benchPath(product.slug, bench);
  const found = walk(dir).map((abs) => relative(distDir, abs).split(sep).join('/'));
  const problems = found.filter((rel) => rel !== expected).map((rel) => `dist/${rel}: not the bench ${bench.name} of the catalog (${product.install.tag})`);
  const file = join(distDir, expected);
  if (!existsSync(file) || !statSync(file).isFile()) return [...problems, `dist/${expected} is missing`];
  const bytes = readFileSync(file);
  if (bytes.length !== bench.size) problems.push(`dist/${expected} is ${bytes.length} bytes, the catalog gives ${bench.size}`);
  else if (createHash('sha256').update(bytes).digest('hex') !== bench.sha256) problems.push(`dist/${expected} is not the bench of the release byte for byte (its SHA-256 differs from the catalog's)`);
  return problems;
}

/**
 * Every file of dist/ whose name ends in `_bench.html` and is not a bench of the built catalog: a
 * bench the catalog does not hold must not be served.
 * @param {string} distDir
 * @param {Array<{ slug: string, install: null | { bench?: null | { id: string, name: string } } }>} products
 * @returns {string[]}
 */
export function strayBenchProblems(distDir, products) {
  const expected = new Set(products.filter((p) => p.install?.bench).map((p) => benchPath(p.slug, p.install.bench)));
  return walk(distDir)
    .map((abs) => relative(distDir, abs).split(sep).join('/'))
    .filter((rel) => rel.endsWith(BENCH_SUFFIX) && !expected.has(rel))
    .map((rel) => `dist/${rel}: a bench file, not a bench of the built catalog`);
}
