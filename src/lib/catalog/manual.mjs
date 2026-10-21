// SOURCE: zurp-astronomics-site — reads the manual of a product repository: 9_Assets/manual/<tab>.{en,fr}.md, <tab> a tab of the vocabulary of content/site.yml, and the images they show; renders it for the product page's tabs, reports what is wrong in it — a file outside the vocabulary included
// AUTHOR: engineer
// DATE: 2026-10-20
// STATUS: active — ticket #111
// REVISED: 2026-10-21 (ticket #119) — the tabs are the VOCABULARY of content/site.yml
//   `product.manual.tabs` (src/lib/content.mjs, manualContentOf), no list here any more (MANUAL_TABS
//   is gone); the folder is LISTED (the backends' listDir) instead of eight names asked for, and
//   every .md of it outside the vocabulary is reported, never published
//
// THE CONVENTION (the agency's, agreed with Basilisk's architect, 2026-10-20 — published in § 7 of
// content/readme-kit/guide.md):
//   - optional files with FIXED names: 9_Assets/manual/<tab>.<lang>.md, <tab> an id of the
//     vocabulary (content/site.yml `product.manual.tabs`, in that order: the order of the tabs),
//     <lang> one of MANUAL_LANGS. The folder is listed through the backend's listDir (one request on
//     GitHub; a repository without the folder: no manual, nothing reported), and only those names
//     are read, through readFile;
//   - every other `.md` file right under 9_Assets/manual/ (`api.en.md`, `Overview.md`, `setup.md`,
//     `notes.en.md`) is REPORTED, never read nor published: a tab is asked for to the site's
//     architect, who adds it to the vocabulary for every product (§ 7 of the guide). A file that is
//     not a `.md` (the manual's images) and a sub-folder are neither reported nor walked;
//   - the `.en.md` is shown; without it (absent or unreadable) the `.fr.md` is shown in its place,
//     marked lang="fr" on the page;
//   - an optional front matter (`---` … `---` at the top) is never rendered;
//   - no H1: the sections start at `##`. An H1 is REPORTED, and rendered as written (the site does
//     not touch the substance of a project);
//   - raw HTML is NOT interpreted: it shows as text (markdown-it `html: false`). The manuals come from
//     eight repositories: the common form is the site's;
//   - an image is a path relative to the .md file, resolved under 9_Assets/ only, PNG, JPEG, WebP or
//     AVIF. It is decoded, re-encoded as WebP under the 600 KB ceiling of scripts/check-dist.mjs, and
//     served by the site (src/lib/manual.mjs: <slug>/manual/<id>.webp). An image absent, outside
//     9_Assets/, of another format or that does not decode is NOT shown, and reported;
//   - a link to another file of the manual (`assembly.en.md`) goes to the anchor of its tab when the
//     page has that tab; a relative link to any other file goes to that file in the repository, on
//     GitHub; an absolute link (a scheme, or `//`) and an in-page `#anchor` are left as they are;
//   - none of these problems skips the product or fails the build: they are returned, each naming
//     the repository and the file, for the catalog report (the agency's model: the build reports,
//     the agency asks the project to correct). A failed read of the backend (anything but a 404)
//     is not caught: it fails the build, like every other read.
//
// Only 9_Assets/ is read (the human's rule, at the top of read.mjs): manual/ is in it, and an image
// that resolves outside it is never asked for.

import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import MarkdownIt from 'markdown-it';
import sharp from 'sharp';
import { manualTabIds } from '../content.mjs';

/** = ASSETS_DIR of read.mjs, which imports this module (written here, not imported: no import cycle). */
const ASSETS_DIR = '9_Assets';
/** Where a product repository keeps its manual. */
export const MANUAL_DIR = `${ASSETS_DIR}/manual`;
/** The languages of a manual file: the first one is shown, the second is its fall-back. */
export const MANUAL_LANGS = /** @type {const} */ (['en', 'fr']);
/** The path of one manual file in its repository. */
export const manualPath = (tab, lang) => `${MANUAL_DIR}/${tab}.${lang}.md`;

/** The image formats a manual may show, as their extension and as sharp reports them (AVIF is a HEIF container). */
const IMAGE_EXT = /\.(png|jpe?g|webp|avif)$/i;
const IMAGE_FORMATS = new Set(['png', 'jpeg', 'webp', 'heif']);
/** The ceiling of scripts/check-dist.mjs (600 KB), with a margin: every image served stays under it. */
export const MANUAL_IMAGE_MAX_BYTES = 560 * 1024;
/** Widest image served: the manual's column is under 700 px, so twice that covers dense screens. */
const MANUAL_IMAGE_WIDTH = 1600;
/** Re-encoding attempts, until one is under MANUAL_IMAGE_MAX_BYTES: [max width, WebP quality]. */
const ENCODINGS = [
  [MANUAL_IMAGE_WIDTH, 80],
  [MANUAL_IMAGE_WIDTH, 68],
  [1280, 64],
  [1024, 60],
  [800, 56],
  [640, 50],
];

const FRONT_MATTER = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** The text of a manual file without its byte order mark and its front matter; null when its bytes are not UTF-8. */
export function manualText(bytes) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  return text.replace(/^﻿/, '').replace(FRONT_MATTER, '');
}

/**
 * Where a relative reference of a manual file points in its repository: a normalised path from the
 * repository root, or null when it climbs out of the repository. A leading `/` is the repository
 * root, as on GitHub.
 * @param {string} ref the reference, without its query or fragment, percent-decoded
 */
export function resolveInRepo(ref) {
  const joined = ref.startsWith('/') ? ref.slice(1) : posix.join(MANUAL_DIR, ref);
  const p = posix.normalize(joined);
  if (p === '..' || p.startsWith('../') || p.startsWith('/')) return null;
  return p === '.' ? '' : p.replace(/\/$/, '');
}

/** A reference split into its path (percent-decoded) and its `?…#…` suffix. */
function splitRef(ref) {
  const i = ref.search(/[?#]/);
  const raw = i < 0 ? ref : ref.slice(0, i);
  let path = raw;
  try {
    path = decodeURIComponent(raw);
  } catch {
    // A malformed escape: keep it as written.
  }
  return { path, suffix: i < 0 ? '' : ref.slice(i) };
}

/**
 * The file of the manual a name of 9_Assets/manual/ is, as { tab, lang }, or null when the name is
 * not `<tab>.<lang>.md` with <tab> in `tabIds` and <lang> one of MANUAL_LANGS (case counts).
 * @param {string} name
 * @param {readonly string[]} tabIds the ids of the vocabulary
 */
export function manualFileOf(name, tabIds) {
  const m = name.match(/^([^./]+)\.([^./]+)\.md$/);
  return m && tabIds.includes(m[1]) && MANUAL_LANGS.includes(m[2]) ? { tab: m[1], lang: m[2] } : null;
}

/** The manual file a repository path names, as its tab, or null. */
const manualTabOf = (path, tabIds) => {
  const name = path.startsWith(`${MANUAL_DIR}/`) ? path.slice(MANUAL_DIR.length + 1) : null;
  return (name !== null && manualFileOf(name, tabIds)?.tab) || null;
};

/** What the report says of a .md of 9_Assets/manual/ outside the vocabulary. */
const unknownFileProblem = (origin, name, tabIds) =>
  `${origin}, ${MANUAL_DIR}/${name}: not a file of the manual — its name is not <tab>.<lang>.md with <tab> one of ` +
  `${tabIds.join(', ')} and <lang> one of ${MANUAL_LANGS.join(', ')}; not published. A tab that does not exist is ` +
  `asked for to the site's architect (§ 7 of the README kit guide)`;

/**
 * Decodes an image of a manual and re-encodes it as WebP under MANUAL_IMAGE_MAX_BYTES (orientation
 * applied, never enlarged). Returns { bytes, width, height } or { problem }.
 * @param {Buffer} source
 */
export async function encodeManualImage(source) {
  try {
    const meta = await sharp(source).metadata();
    if (!IMAGE_FORMATS.has(meta.format) || !meta.width || !meta.height) {
      return { problem: `is not a PNG, JPEG, WebP or AVIF image (read as ${JSON.stringify(meta.format ?? null)})` };
    }
    await sharp(source).stats();
    for (const [width, quality] of ENCODINGS) {
      const { data, info } = await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
      if (data.length <= MANUAL_IMAGE_MAX_BYTES) return { bytes: data, width: info.width, height: info.height };
    }
    return { problem: `stays over ${MANUAL_IMAGE_MAX_BYTES} bytes even re-encoded at ${ENCODINGS.at(-1)[0]} px` };
  } catch (e) {
    return { problem: `does not decode as an image (${String(e?.message ?? e).split('\n')[0]})` };
  }
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** The published name of an image of a manual: it changes as soon as the image served does. */
export const manualImageName = (servedSha256) => `${servedSha256.slice(0, 16)}.webp`;

const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });

/** Every inline token of a token list, children included, with the list that holds it. */
function* inlineTokens(tokens) {
  for (const t of tokens) {
    if (t.children) for (let i = 0; i < t.children.length; i++) yield { token: t.children[i], list: t.children };
  }
}

/**
 * Reads the manual of repository `repo` (the listing of 9_Assets/manual/, its files of the
 * vocabulary, then the images the files shown name) and renders it. Never throws for something
 * wrong in the manual: it is in `problems`, each prefixed by the repository and the file — a file
 * outside the vocabulary first. A failed read of the backend (anything but a 404) throws.
 * @param {{ readFile(repo: string, path: string): Promise<Buffer | null>, listDir(repo: string, path: string): Promise<null | Array<{ name: string, type: string }>> }} backend
 * @param {string} repo the repository's name
 * @param {{ slug: string, repoUrl: string, origin: string }} product
 * @param {{ tabIds?: readonly string[] }} [options] the ids of the vocabulary (default: content/site.yml's)
 * @returns {Promise<{ manual: null | { tabs: Array<{ id: string, lang: string, file: string, html: string }>, images: Array<{ name: string, source: string, size: number, sha256: string, width: number, height: number }> }, problems: string[], files: Map<string, Buffer> }>}
 *   `files`: sha256 → bytes of each image served, written beside the snapshot (never in it)
 */
export async function readManual(backend, repo, { slug, repoUrl, origin }, { tabIds = manualTabIds() } = {}) {
  const problems = [];
  const read = [];
  const entries = await backend.listDir(repo, MANUAL_DIR);
  if (entries === null) return { manual: null, problems, files: new Map() };
  const present = new Set();
  for (const name of entries.filter((e) => e.type === 'file').map((e) => e.name).sort()) {
    if (!/\.md$/i.test(name)) continue;
    if (manualFileOf(name, tabIds)) present.add(name);
    else problems.push(unknownFileProblem(origin, name, tabIds));
  }
  for (const tab of tabIds) {
    for (const lang of MANUAL_LANGS) {
      if (!present.has(`${tab}.${lang}.md`)) continue;
      const file = manualPath(tab, lang);
      const bytes = await backend.readFile(repo, file);
      if (bytes === null) continue;
      const text = manualText(bytes);
      if (text === null) {
        problems.push(`${origin}, ${file}: unreadable — not UTF-8 text; not published`);
        continue;
      }
      read.push({ tab, lang, file, text });
    }
  }
  const shown = tabIds.map((tab) => read.find((r) => r.tab === tab && r.lang === MANUAL_LANGS[0]) ?? read.find((r) => r.tab === tab)).filter(Boolean);
  if (!shown.length) return { manual: null, problems, files: new Map() };

  const tabsShown = new Set(shown.map((s) => s.tab));
  const blob = (path) => `${repoUrl.replace(/\/+$/, '')}${path ? `/blob/HEAD/${path.split('/').map(encodeURIComponent).join('/')}` : ''}`;
  const images = new Map(); // repository path → { name, …, sha256 } | { problem }
  const files = new Map();
  const tabs = [];
  for (const { tab, lang, file, text } of shown) {
    const env = {};
    const tokens = markdown.parse(text, env);
    for (const t of tokens) {
      if (t.type === 'heading_open' && t.tag === 'h1') {
        const title = tokens[tokens.indexOf(t) + 1]?.content ?? '';
        problems.push(`${origin}, ${file}: a level-1 heading (# ${title}) — the sections of a manual start at ##; rendered as written`);
      }
    }
    const drop = [];
    for (const { token, list } of inlineTokens(tokens)) {
      if (token.type === 'link_open') {
        const href = token.attrGet('href') ?? '';
        if (!href || href.startsWith('#') || href.startsWith('?') || href.startsWith('//') || SCHEME.test(href)) continue;
        const { path, suffix } = splitRef(href);
        const target = resolveInRepo(path);
        const toTab = target !== null && manualTabOf(target, tabIds);
        if (toTab && tabsShown.has(toTab)) token.attrSet('href', `#${toTab}`);
        else token.attrSet('href', target === null ? repoUrl : `${blob(target)}${suffix.startsWith('#') ? suffix : ''}`);
      } else if (token.type === 'image') {
        const src = token.attrGet('src') ?? '';
        const quoted = JSON.stringify(src);
        const { path } = splitRef(src);
        const target = src.startsWith('//') || SCHEME.test(src) ? null : resolveInRepo(path);
        let image;
        if (target === null || !target.startsWith(`${ASSETS_DIR}/`)) {
          image = { problem: `image ${quoted} is not under ${ASSETS_DIR}/ of the repository — not shown` };
        } else if (!IMAGE_EXT.test(target)) {
          image = { problem: `image ${quoted} (${target}) is not a PNG, JPEG, WebP or AVIF file — not shown` };
        } else if (images.has(target)) {
          image = images.get(target);
        } else {
          const bytes = await backend.readFile(repo, target);
          if (bytes === null) image = { problem: `image ${quoted} (${target}) does not exist in the repository — not shown` };
          else {
            const encoded = await encodeManualImage(bytes);
            if (encoded.problem) image = { problem: `image ${quoted} (${target}) ${encoded.problem} — not shown` };
            else {
              const served = sha256(encoded.bytes);
              files.set(served, encoded.bytes);
              image = { name: manualImageName(served), source: target, size: encoded.bytes.length, sha256: served, width: encoded.width, height: encoded.height };
            }
          }
          images.set(target, image);
        }
        if (image.problem) {
          problems.push(`${origin}, ${file}: ${image.problem}`);
          drop.push({ token, list });
          continue;
        }
        token.attrSet('src', manualImageUrlPath(slug, image.name));
        token.attrSet('width', String(image.width));
        token.attrSet('height', String(image.height));
        token.attrSet('loading', 'lazy');
        token.attrSet('decoding', 'async');
      }
    }
    for (const { token, list } of drop) list.splice(list.indexOf(token), 1);
    // A paragraph left with nothing but blanks once its images are dropped is dropped too.
    const lists = new Set(drop.map((d) => d.list));
    const kept = tokens.filter((t, i, all) => {
      const blank = (inline) => inline?.type === 'inline' && lists.has(inline.children) && inline.children.every((c) => c.type.endsWith('break') || (c.type === 'text' && !c.content.trim()));
      if (t.type === 'paragraph_open') return !blank(all[i + 1]);
      if (t.type === 'inline') return !(all[i - 1]?.type === 'paragraph_open' && blank(t));
      if (t.type === 'paragraph_close') return !(all[i - 2]?.type === 'paragraph_open' && blank(all[i - 1]));
      return true;
    });
    tabs.push({ id: tab, lang, file, html: markdown.renderer.render(kept, markdown.options, env) });
  }
  const served = [...new Map([...images.values()].filter((i) => !i.problem).map((i) => [i.name, i])).values()];
  return { manual: { tabs, images: served }, problems, files };
}

/** The URL path of an image of a manual on the site (mirror of src/lib/manual.mjs, manualImagePath). */
const manualImageUrlPath = (slug, name) => `/${slug}/manual/${name}`;
