#!/usr/bin/env node
// SOURCE: zurp-astronomics-site — compare two builds of the site (dist/ of a base ref vs dist/ of a branch): pages, URLs, visible text, image sizes, build stamp
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — run by .gitea/workflows/trial-compare-dist.yml (an on-demand trial, not part of CI)
// REVISED: 2026-10-06 (ticket #46) — the CSS mask of scoping hashes is a valid identifier again
// REVISED: 2026-10-06 (ticket #53) — `--admit-new`: a closed list of files the change adds on purpose
// REVISED: 2026-10-06 (ticket #66) — `--admitted`: a closed list of declared differences inside pages
//   present on both sides (visible text removed or added, URL removed, CSS rule removed)
//
// Usage: node scripts/compare-dist.mjs <baseDist> <headDist> [--admitted <declarations>] [--admit-new <path>...]
//
// ADMITTED DIFFERENCES (ticket #66). A change that alters pages on purpose declares each difference,
// one per line, in ONE argument after `--admitted` (the trial declares the list, in the repository,
// readable in the diff). A line is `<kind> <pages> <value>`: the kind, then a page pattern (a path
// of dist/, `*` for any characters but `/`, `{a,b}` for alternatives), then the rest of the line;
// blank lines and lines starting with `#` are skipped. The kinds:
//   text-removed  <pages> <fragment>   a fragment of visible text the base shows and the head no
//                                      longer does;
//   text-added    <pages> <fragment>   a fragment of visible text the head shows and the base did not;
//   url-removed   <pages> <url>        a URL the base references and the head no longer does;
//   css-removed   <pages> <selector>   a CSS rule (by its selector, as written in the source, without
//                                      Astro's scoping attribute) the base applies and the head no
//                                      longer does.
// Each declaration must be OBSERVED on EVERY page its pattern matches, in each reading where it
// applies (both text readings, the URLs, the stylesheets) — the base holds more of it than the head
// (removed), or the head more than the base (added) — and its pattern must match at least one page:
// a declaration that is not observed fails, so the list cannot hide anything. A declared difference
// is then taken out of both sides (every occurrence: text fragments matched whitespace-insensitively,
// as the two readings place spaces differently around tags; whitespace runs collapsed again after)
// before they are compared: everything else on the page still has to be the same, and still fails
// otherwise.
//
// ADMITTED NEW FILES. A change that adds files to dist/ on purpose names each of them, by its path
// in dist/, after `--admit-new` (the trial declares the list, in the repository, readable in the
// diff). Each one MUST be new in the head (absent from the base, present in the head): a declared
// file that is not fails, so the list cannot hide anything. Nothing else is admitted: any other
// file of one side only still fails.
// Node built-ins only (image sizes are read from the file headers), plus lightningcss when it is
// installed (Vite ships it), for the stylesheets.
//
// WHY. A change that must not alter the rendered site (a framework upgrade, a new data source for the
// catalog) is proved by building the base ref and the branch and comparing the two dist/ trees.
// scripts/check-dist.mjs guards one build; this compares two.
//
// Hashed asset names (`/_astro/<name>.<hash>.<ext>`) are normalised to `/_astro/<name>.#.<ext>`
// everywhere (`/_astro/*.#.<ext>` for CSS and JS bundles, named by the bundler): a hash changes
// with any byte of the asset, its URL is not part of the contract. The build stamp (commit hash,
// build date) differs between two builds by design: it is masked in the comparisons and checked on
// its own (rendered, well-formed).
//
// FAILS (exit 1) on any difference in what the site promises to stay the same:
//   - the set of files in dist/ (hashed names normalised);
//   - the visible text of each page, in two readings: STRICT (tags removed, whitespace runs
//     collapsed: "<b>a</b> <i>b</i>" reads "a b", "<b>a</b><i>b</i>" reads "ab" — catches the
//     whitespace between inline elements) and LOOSE (every tag read as a space);
//   - the URLs referenced by each page (href, src, srcset, content, …);
//   - each image of each page (<img> src and every srcset candidate, og:image, twitter:image, icon
//     links): the pixel size of the file it points to, and its descriptor;
//   - the pixel size of every image file in dist/ (by normalised name);
//   - the build stamp on every page of the branch (a 7-hex commit and a `YYYY-MM-DD HH:MMZ` date);
//   - the stylesheets of each page, in cascade order, once both are rewritten by lightningcss into
//     one canonical form (when lightningcss is installed — Vite ships it; otherwise reported only).
// REPORTS (no failure) what may legitimately move with a toolchain: the normalised markup of each
// page (attribute order, whitespace, the place of a module script), image byte sizes, the
// generator meta.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep, posix } from 'node:path';

const USAGE = 'usage: node scripts/compare-dist.mjs <baseDist> <headDist> [--admitted <declarations>] [--admit-new <path>...]';
const [baseArg, headArg, ...rest] = process.argv.slice(2);
if (!baseArg || !headArg) {
  console.error(USAGE);
  process.exit(2);
}
const ADMITTED_NEW = new Set();
let declarations = '';
for (let i = 0, mode = null; i < rest.length; i++) {
  if (rest[i] === '--admitted') {
    if (i + 1 >= rest.length) {
      console.error(`--admitted needs one argument (the declarations)\n${USAGE}`);
      process.exit(2);
    }
    declarations += `${rest[++i]}\n`;
    mode = null;
  } else if (rest[i] === '--admit-new') mode = 'new';
  else if (mode === 'new') ADMITTED_NEW.add(rest[i]);
  else {
    console.error(`unexpected argument ${JSON.stringify(rest[i])}\n${USAGE}`);
    process.exit(2);
  }
}
const BASE = resolve(baseArg);
const HEAD = resolve(headArg);
const SITE = 'https://zurp-astronomics.github.io';

const failures = [];
const fail = (msg) => failures.push(msg);

// ---------- admitted differences (--admitted) -----------------------------------------------------
const KINDS = ['text-removed', 'text-added', 'url-removed', 'css-removed'];
/** A page pattern → RegExp over a path of dist/ (`*`: anything but `/`, `?`: one such character, `{a,b}`). */
function globRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end < 0) throw new Error(`unclosed { in page pattern ${JSON.stringify(glob)}`);
      re += `(?:${glob.slice(i + 1, end).split(',').map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
      i = end;
    } else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
const ADMITTED = [];
for (const [n, raw] of declarations.split('\n').entries()) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const m = line.match(/^(\S+)\s+(\S+)\s+(.+)$/);
  if (!m || !KINDS.includes(m[1])) {
    console.error(`--admitted, line ${n + 1}: ${JSON.stringify(line)} is not \`<kind> <pages> <value>\` with a kind among ${KINDS.join(', ')}`);
    process.exit(2);
  }
  ADMITTED.push({ kind: m[1], pages: m[2], match: globRegExp(m[2]), value: m[3].trim(), observed: new Map(), missed: [] });
}
const admittedOn = (page, kind) => ADMITTED.filter((a) => a.kind === kind && a.match.test(page));
/** Records where a declaration was looked for: observed (true) or not, per page and reading. */
function observe(a, page, reading, ok) {
  if (ok) a.observed.set(page, [...(a.observed.get(page) ?? []), reading]);
  else a.missed.push(`${page} (${reading})`);
}
const describeAdmitted = (a) => `${a.kind} ${a.pages} ${a.value}`;

// A visible-text fragment, matched whitespace-insensitively: the strict reading glues an element to
// the punctuation that follows it (`OCL v1.1,`), the loose one does not (`OCL v1.1 ,`).
function fragmentRegExp(fragment) {
  const chars = [...fragment.replace(/\s+/g, '')].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(chars.join('\\s*'), 'g');
}
const countMatches = (text, re) => (text.match(re) ?? []).length;
const squeezeText = (t) => t.replace(/[ \t\n\r\f]+/g, ' ').trim();

/** Takes the admitted text differences of `page` out of both readings; records what was observed. */
function admitText(page, reading, a, b) {
  for (const kind of ['text-removed', 'text-added']) {
    for (const adm of admittedOn(page, kind)) {
      const re = fragmentRegExp(adm.value);
      const inBase = countMatches(a, re);
      const inHead = countMatches(b, re);
      observe(adm, page, `text ${reading}: ${inBase} in base, ${inHead} in head`, kind === 'text-removed' ? inBase > inHead : inHead > inBase);
      a = squeezeText(a.replace(re, ''));
      b = squeezeText(b.replace(re, ''));
    }
  }
  return [a, b];
}

/** Takes the admitted URL removals of `page` out of both lists of URLs (`tag[attr] url`). */
function admitUrls(page, a, b) {
  for (const adm of admittedOn(page, 'url-removed')) {
    const is = (entry) => entry.slice(entry.indexOf(' ') + 1) === adm.value;
    const inBase = a.filter(is).length;
    const inHead = b.filter(is).length;
    observe(adm, page, `urls: ${inBase} in base, ${inHead} in head`, inBase > inHead);
    a = a.filter((e) => !is(e));
    b = b.filter((e) => !is(e));
  }
  return [a, b];
}

// ---------- files -------------------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

// `/_astro/kaiju.Ab12Cd34_Z1xYz9.webp` → `/_astro/kaiju.#.webp`; same for a bare `_astro/…` path.
// A stylesheet or script bundle loses its name too (`_astro/index.#.css`, `_astro/V2Layout.#.css`
// → `_astro/*.#.css`): the bundler names its chunks, and the name moves with the bundler. An image
// keeps its name, which is its source file's.
const HASHED = /(^|\/)_astro\/([^/"'\s,()]+?)\.([A-Za-z0-9_-]{6,})\.([a-z0-9]+)(?=$|[?#"'\s,)])/gi;
const normHash = (s) =>
  s.replace(HASHED, (_, pre, name, hash, ext) => `${pre}_astro/${/^(css|js|mjs)$/i.test(ext) ? '*' : name}.#.${ext}`);

function tree(root) {
  const files = walk(root).map((abs) => ({
    abs,
    rel: relative(root, abs).split(sep).join('/'),
  }));
  for (const f of files) f.norm = normHash(f.rel);
  return files;
}

const baseFiles = tree(BASE);
const headFiles = tree(HEAD);

function multiset(list) {
  const m = new Map();
  for (const x of list) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}

function diffMultisets(a, b) {
  const ma = multiset(a);
  const mb = multiset(b);
  const onlyA = [];
  const onlyB = [];
  for (const [k, n] of ma) for (let i = (mb.get(k) ?? 0); i < n; i++) onlyA.push(k);
  for (const [k, n] of mb) for (let i = (ma.get(k) ?? 0); i < n; i++) onlyB.push(k);
  return { onlyA: onlyA.sort(), onlyB: onlyB.sort() };
}

// ---------- image sizes (from headers) ----------------------------------------------------------
function pngSize(buf) {
  if (buf.length < 24 || buf.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xff) { i++; continue; }
    const length = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}
function webpSize(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  return null;
}
function icoSize(buf) {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return null;
  const count = buf.readUInt16LE(4);
  const sizes = [];
  for (let i = 0; i < count; i++) {
    const e = 6 + 16 * i;
    if (e + 16 > buf.length) return null;
    sizes.push(`${buf[e] || 256}×${buf[e + 1] || 256}`);
  }
  return { label: sizes.join('+') };
}
function svgSize(buf) {
  const head = buf.toString('utf8', 0, 2048);
  const w = head.match(/<svg[^>]*\swidth="([^"]+)"/)?.[1];
  const h = head.match(/<svg[^>]*\sheight="([^"]+)"/)?.[1];
  const vb = head.match(/<svg[^>]*\sviewBox="([^"]+)"/)?.[1];
  return { label: `svg ${w ?? '?'}×${h ?? '?'} viewBox=${vb ?? '?'}` };
}

const IMAGE_EXT = /\.(webp|jpe?g|png|avif|gif|svg|ico)$/i;
function imageLabel(abs) {
  let buf;
  try {
    buf = readFileSync(abs);
  } catch {
    return 'MISSING';
  }
  const ext = abs.match(IMAGE_EXT)?.[1]?.toLowerCase();
  const s =
    ext === 'png' ? pngSize(buf)
    : ext === 'jpg' || ext === 'jpeg' ? jpegSize(buf)
    : ext === 'webp' ? webpSize(buf)
    : ext === 'ico' ? icoSize(buf)
    : ext === 'svg' ? svgSize(buf)
    : null;
  if (!s) return `unreadable ${ext}`;
  return s.label ?? `${s.width}×${s.height}`;
}

// ---------- HTML ---------------------------------------------------------------------------------
const STAMP = /(<div\b[^>]*\bclass="z2-stamp"[^>]*>)([\s\S]*?)(<\/div>)/g;

function readStamp(html) {
  const m = [...html.matchAll(STAMP)];
  if (m.length !== 1) return { ok: false, text: `${m.length} stamp element(s)` };
  const inner = m[0][2];
  const code = inner.match(/<code\b[^>]*>([^<]*)<\/code>/)?.[1]?.trim() ?? '';
  const text = inner.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const date = text.match(/\d{4}-\d\d-\d\d \d\d:\d\dZ/)?.[0] ?? '';
  return { ok: /^[0-9a-f]{7}$/.test(code) && date !== '', text, code, date };
}

function maskStamp(html) {
  return html.replace(STAMP, (_, open, inner, close) =>
    open +
    inner
      .replace(/(<code\b[^>]*>)\s*[0-9a-f]{7}\s*(<\/code>)/, '$1#commit$2')
      .replace(/\d{4}-\d\d-\d\d \d\d:\d\dZ/, '#date') +
    close,
  );
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });

const stripHidden = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<head\b[\s\S]*?<\/head>/i, (h) => (h.match(/<title\b[^>]*>[\s\S]*?<\/title>/i)?.[0] ?? ''));

function visibleText(html, tagAs) {
  return decode(stripHidden(html).replace(/<[^>]*>/g, tagAs))
    .replace(/[ \t\n\r\f]+/g, ' ')
    .trim();
}

const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
const ATTR = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
function tags(html) {
  const out = [];
  for (const m of html.matchAll(TAG)) {
    const attrs = {};
    for (const a of m[2].matchAll(ATTR)) attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
    out.push({ name: m[1].toLowerCase(), attrs });
  }
  return out;
}

const URL_ATTRS = ['href', 'src', 'srcset', 'content', 'action', 'poster', 'data-src'];
function urls(html) {
  const out = [];
  for (const t of tags(html)) {
    for (const a of URL_ATTRS) {
      const v = t.attrs[a];
      if (v === undefined) continue;
      if (a === 'content' && !/^(https?:|\/)/.test(v)) continue;
      if (a === 'srcset') for (const c of v.split(',')) out.push(`${t.name}[srcset] ${normHash(c.trim())}`);
      else out.push(`${t.name}[${a}] ${normHash(v)}`);
    }
  }
  return out;
}

// A URL of the site → its file in dist/ (null for an external URL).
function distFile(root, url) {
  let path = url;
  if (path.startsWith(SITE)) path = path.slice(SITE.length);
  if (/^[a-z]+:/i.test(path) || path.startsWith('//')) return null;
  path = path.split(/[?#]/)[0];
  if (!path.startsWith('/')) return null;
  return join(root, ...posix.normalize(path).split('/').filter(Boolean));
}

// Every image a page shows or declares, with the size of the file behind it.
function pageImages(root, html) {
  const out = [];
  const add = (where, url, descriptor = '') => {
    const file = distFile(root, url);
    if (!file) return out.push(`${where} ${url} (external)`);
    out.push(`${where} ${normHash(url)}${descriptor ? ' ' + descriptor : ''} → ${imageLabel(file)}`);
  };
  for (const t of tags(html)) {
    const { name, attrs } = t;
    if (name === 'img') {
      const keep = ['alt', 'width', 'height', 'sizes', 'loading', 'decoding', 'fetchpriority'];
      const desc = keep.filter((k) => k in attrs).map((k) => `${k}=${JSON.stringify(attrs[k])}`).join(' ');
      out.push(`img {${desc}}`);
      if (attrs.src) add('  img src', attrs.src);
      if (attrs.srcset) {
        for (const c of attrs.srcset.split(',')) {
          const [u, d = ''] = c.trim().split(/\s+/);
          add('  img srcset', u, d);
        }
      }
    } else if (name === 'meta' && /^(og:image|twitter:image)$/.test(attrs.property ?? attrs.name ?? '')) {
      add(`meta ${attrs.property ?? attrs.name}`, attrs.content);
    } else if (name === 'link' && /\b(icon|apple-touch-icon)\b/.test(attrs.rel ?? '')) {
      add(`link rel=${attrs.rel} sizes=${attrs.sizes ?? ''}`, attrs.href);
    }
  }
  return out;
}

// Markup with the volatile parts masked, one tag per line (for a readable diff).
function markup(html) {
  return maskStamp(html)
    .replace(/(<meta\b[^>]*\bname="generator"[^>]*\bcontent=")[^"]*"/, '$1#generator"')
    .replace(/data-astro-cid-[a-z0-9]+/g, 'data-astro-cid-#')
    .replace(/\bastro-[a-z0-9]{8}\b/g, 'astro-#')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '<style>#css</style>')
    .split(/(?=<)|(?<=>)/)
    .map((s) => (s && /^\s+$/.test(s) ? '␠' : normHash(s.replace(/\s+/g, ' ').trim())))
    .filter(Boolean);
}

// Line diff (LCS); falls back to a multiset difference when the inputs are too large.
function lineDiff(a, b, limit = 40) {
  const n = a.length;
  const m = b.length;
  if (n * m > 25_000_000) {
    const { onlyA, onlyB } = diffMultisets(a, b);
    return [...onlyA.map((l) => `- ${l}`), ...onlyB.map((l) => `+ ${l}`)].slice(0, limit);
  }
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i++; j++; }
    else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) out.push(`+ ${b[j++]}`);
    else out.push(`- ${a[i++]}`);
  }
  return out;
}

function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 60);
  return `at char ${i}:\n      base: …${a.slice(from, i + 80)}…\n      head: …${b.slice(from, i + 80)}…`;
}

const show = (title, lines, max = 40) => {
  console.log(title);
  for (const l of lines.slice(0, max)) console.log(`    ${l}`);
  if (lines.length > max) console.log(`    … ${lines.length - max} more`);
};

// ---------- 1. files ----------------------------------------------------------------------------
console.log(`base: ${BASE} (${baseFiles.length} files)\nhead: ${HEAD} (${headFiles.length} files)\n`);
{
  const { onlyA, onlyB: onlyHead } = diffMultisets(baseFiles.map((f) => f.norm), headFiles.map((f) => f.norm));
  const admitted = onlyHead.filter((f) => ADMITTED_NEW.has(f));
  const onlyB = onlyHead.filter((f) => !ADMITTED_NEW.has(f));
  const notNew = [...ADMITTED_NEW].filter((f) => !admitted.includes(f)).sort();
  if (onlyA.length || onlyB.length) {
    fail('the set of files in dist/ differs');
    show('FILES only in base:', onlyA);
    show('FILES only in head:', onlyB);
  } else console.log(`FILES: same ${baseFiles.length} files in the base and the head, apart from the ${admitted.length} admitted new file(s) (hashed names normalised)`);
  if (notNew.length) {
    fail('a file declared as admitted (--admit-new) is not new in the head');
    show('FILES declared admitted but not new in head (absent from the head, or already in the base):', notNew);
  }
  if (admitted.length) show(`FILES admitted, new in head (--admit-new, ${admitted.length}):`, admitted);
}

// ---------- 2. every image file: pixel size (fail) and bytes (report) ----------------------------
{
  const label = (files) => files.filter((f) => IMAGE_EXT.test(f.rel)).map((f) => `${f.norm} ${imageLabel(f.abs)}`);
  const { onlyA, onlyB } = diffMultisets(label(baseFiles), label(headFiles));
  const count = headFiles.filter((f) => IMAGE_EXT.test(f.rel)).length;
  if (onlyA.length || onlyB.length) {
    fail('image file sizes (pixels) differ');
    show('IMAGE SIZES only in base:', onlyA);
    show('IMAGE SIZES only in head:', onlyB);
  } else console.log(`IMAGE SIZES: same pixel size for all ${count} image files`);

  // Bytes, by stable path (non-hashed) or by normalised name + pixel size.
  const bytes = (files) => {
    const m = new Map();
    for (const f of files.filter((f) => IMAGE_EXT.test(f.rel))) {
      const k = `${f.norm} ${imageLabel(f.abs)}`;
      m.set(k, [...(m.get(k) ?? []), statSync(f.abs).size]);
    }
    return m;
  };
  const bb = bytes(baseFiles);
  const hb = bytes(headFiles);
  const rows = [];
  let tb = 0;
  let th = 0;
  for (const [k, list] of [...hb].sort()) {
    const b = (bb.get(k) ?? []).reduce((x, y) => x + y, 0);
    const h = list.reduce((x, y) => x + y, 0);
    tb += b;
    th += h;
    if (b !== h) rows.push(`${k}: ${b} → ${h} bytes (${b ? (((h - b) / b) * 100).toFixed(1) : '∞'} %)`);
  }
  console.log(`IMAGE BYTES (report only): total ${tb} → ${th} bytes; ${rows.length} file group(s) changed`);
  for (const r of rows) console.log(`    ${r}`);
}

// ---------- 3. pages ----------------------------------------------------------------------------
const pages = headFiles.filter((f) => f.rel.endsWith('.html')).map((f) => f.rel).sort();
const basePages = new Set(baseFiles.filter((f) => f.rel.endsWith('.html')).map((f) => f.rel));
for (const page of pages) {
  console.log(`\n=== ${page}`);
  if (!basePages.has(page)) {
    fail(`${page}: not in base`);
    console.log('  only in head');
    continue;
  }
  const bh = readFileSync(join(BASE, page), 'utf8');
  const hh = readFileSync(join(HEAD, page), 'utf8');

  const stamp = readStamp(hh);
  const baseStamp = readStamp(bh);
  if (!stamp.ok) fail(`${page}: build stamp missing or malformed (${stamp.text})`);
  console.log(`  stamp: head "${stamp.text}" ${stamp.ok ? 'ok' : 'BAD'} | base "${baseStamp.text}"`);

  for (const [mode, tagAs] of [['strict', ''], ['loose', ' ']]) {
    const admitted = admittedOn(page, 'text-removed').length + admittedOn(page, 'text-added').length;
    const [a, b] = admitText(page, mode, visibleText(maskStamp(bh), tagAs), visibleText(maskStamp(hh), tagAs));
    if (a === b) console.log(`  text (${mode}): same (${b.length} chars)${admitted ? `, once the ${admitted} admitted fragment(s) are taken out` : ''}`);
    else {
      fail(`${page}: visible text differs (${mode})`);
      console.log(`  text (${mode}): DIFFERS ${firstDifference(a, b)}`);
    }
  }

  {
    const [ua, ub] = admitUrls(page, urls(bh), urls(hh));
    const admitted = urls(bh).length - ua.length;
    const { onlyA, onlyB } = diffMultisets(ua, ub);
    if (onlyA.length || onlyB.length) {
      fail(`${page}: referenced URLs differ`);
      show('  URLS only in base:', onlyA);
      show('  URLS only in head:', onlyB);
    } else console.log(`  urls: same (${ub.length})${admitted ? `, apart from ${admitted} admitted removed reference(s)` : ''}`);
  }

  {
    const a = pageImages(BASE, bh);
    const b = pageImages(HEAD, hh);
    const d = lineDiff(a, b);
    if (d.length) {
      fail(`${page}: images differ`);
      show('  IMAGES:', d);
    } else {
      console.log(`  images: same (${b.filter((l) => !l.startsWith('img {')).length} references)`);
      for (const l of b) console.log(`    ${l}`);
    }
  }

  {
    const d = lineDiff(markup(bh), markup(hh));
    const gen = (h) => h.match(/<meta\b[^>]*\bname="generator"[^>]*\bcontent="([^"]*)"/)?.[1];
    console.log(`  generator (report only): ${gen(bh)} → ${gen(hh)}`);
    if (d.length) show(`  markup (report only): ${d.length} differing line(s)`, d, 30);
    else console.log('  markup (report only): same');
  }
}

// ---------- 4. CSS -------------------------------------------------------------------------------
// The stylesheets of each page, in order (linked files, then inline <style>), with the scoping
// hashes (data-astro-cid-…) masked. Two minifiers write the same rules differently (`rgba(…)` or
// `#rrggbbaa`, declaration order, whitespace), so with lightningcss available (Vite ships it) both
// sides are first rewritten by it, with the same options, into one canonical form: a difference left
// after that is a difference in the rules, and fails. Without lightningcss the raw comparison is
// only reported.
let lightningcss = null;
try {
  lightningcss = await import('lightningcss');
} catch {
  // reported below
}
const CSS_TARGETS = { chrome: 111 << 16, edge: 111 << 16, firefox: 114 << 16, safari: (16 << 16) | (4 << 8) };
// The mask must stay a valid CSS identifier: `[data-astro-cid-#]` is an invalid selector, and
// lightningcss (errorRecovery) silently dropped every scoped rule with it — the comparison only saw
// the global rules and reported every page « same » (found in ticket #46).
const maskCid = (css) => css.replace(/data-astro-cid-[a-z0-9]+/g, 'data-astro-cid-masked').replace(/\bastro-[a-z0-9]{8}\b/g, 'astro-masked');
// lightningcss leaves some values as it finds them (a value holding `var()`, `clip: rect(…)`): one
// minifier writes `a, b`, the other `a,b`. Whitespace next to a comma, after `(` or before `)` is
// never significant in CSS; it is dropped here, outside quoted strings.
function squeezeCss(css) {
  let out = '';
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      out += c;
      if (c === '\\') out += css[++i] ?? '';
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
      out += c;
    } else if (/\s/.test(c)) {
      let j = i;
      while (j + 1 < css.length && /\s/.test(css[j + 1])) j++;
      const prev = out.at(-1);
      const next = css[j + 1];
      if (!(prev === ',' || prev === '(' || next === ',' || next === ')')) out += ' ';
      i = j;
    } else out += c;
  }
  return out;
}
function canonicalCss(code, name) {
  if (!lightningcss) return maskCid(code);
  const out = lightningcss.transform({ filename: name, code: Buffer.from(maskCid(code)), minify: true, targets: CSS_TARGETS, errorRecovery: true });
  return squeezeCss(out.code.toString());
}
function pageCss(root, html) {
  const sheets = [];
  for (const t of tags(html)) {
    if (t.name === 'link' && /\bstylesheet\b/.test(t.attrs.rel ?? '')) {
      const file = distFile(root, t.attrs.href ?? '');
      if (file) sheets.push(canonicalCss(readFileSync(file, 'utf8'), t.attrs.href));
      else sheets.push(`/* external */ @import "${t.attrs.href}";`);
    }
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) sheets.push(canonicalCss(m[1], 'inline.css'));
  return sheets.join('\n');
}
const cssLines = (css) => css.split(/(?<=[{};])/).map((s) => normHash(s.trim())).filter(Boolean);

// The style rules of a canonical (minified) stylesheet: [start, end) of each `selector{…}` that holds
// declarations, at any depth (inside @media too), with its selector. At-rule blocks are walked into,
// not returned. Strings and escapes are skipped.
function styleRules(css) {
  const rules = [];
  const stack = []; // { start, prelude }
  let preludeStart = 0;
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '\\') i++;
    else if (c === '{') {
      stack.push({ start: preludeStart, prelude: css.slice(preludeStart, i).trim() });
      preludeStart = i + 1;
    } else if (c === '}') {
      const open = stack.pop();
      if (open && !open.prelude.startsWith('@')) rules.push({ start: open.start, end: i + 1, selector: open.prelude });
      preludeStart = i + 1;
    } else if (c === ';') preludeStart = i + 1;
  }
  return rules;
}
// A rule's selector as written in the source: Astro's scoping attribute (masked) taken out.
const unscoped = (selector) => selector.replace(/\[data-astro-cid-masked\]|:where\(\.astro-masked\)|\.astro-masked/g, '').trim();

/** Takes the admitted CSS rules of `page` out of both stylesheets; records what was observed. */
function admitCss(page, a, b) {
  for (const adm of admittedOn(page, 'css-removed')) {
    const cut = (css) => {
      const hit = styleRules(css).filter((r) => unscoped(r.selector) === adm.value);
      let out = css;
      for (const r of [...hit].sort((x, y) => y.start - x.start)) out = out.slice(0, r.start) + out.slice(r.end);
      return [out, hit.length];
    };
    let inBase;
    let inHead;
    [a, inBase] = cut(a);
    [b, inHead] = cut(b);
    observe(adm, page, `css: ${inBase} rule(s) in base, ${inHead} in head`, inBase > inHead);
  }
  return [a, b];
}
console.log(`\nCSS: ${lightningcss ? 'canonical form (lightningcss), per page, in cascade order' : 'lightningcss not found — raw comparison, report only'}`);
for (const page of pages.filter((p) => basePages.has(p))) {
  const admitted = admittedOn(page, 'css-removed').length;
  if (admitted && !lightningcss) fail(`${page}: CSS rules are admitted (css-removed), but lightningcss is not installed to read the stylesheets`);
  const [a, b] = admitCss(page, pageCss(BASE, readFileSync(join(BASE, page), 'utf8')), pageCss(HEAD, readFileSync(join(HEAD, page), 'utf8')));
  if (a === b) {
    console.log(`  ${page}: same (${b.length} chars)${admitted ? `, once the ${admitted} admitted removed rule selector(s) are taken out` : ''}`);
    continue;
  }
  if (lightningcss) fail(`${page}: stylesheets differ`);
  show(`  ${page}: DIFFERS`, lineDiff(cssLines(a), cssLines(b)), 40);
}

// ---------- admitted differences: each one observed, on every page its pattern matches -------------
if (ADMITTED.length) {
  console.log(`\nADMITTED DIFFERENCES (--admitted, ${ADMITTED.length} declared):`);
  for (const a of ADMITTED) {
    const matched = pages.filter((p) => basePages.has(p) && a.match.test(p));
    if (!matched.length) fail(`admitted difference matches no page present on both sides: ${describeAdmitted(a)}`);
    if (a.missed.length) {
      fail(`admitted difference not observed: ${describeAdmitted(a)} — on ${a.missed.join('; ')}`);
    }
    const unchecked = matched.filter((p) => !a.observed.has(p) && !a.missed.some((m) => m.startsWith(`${p} (`)));
    if (unchecked.length) fail(`admitted difference never looked for on: ${unchecked.join(', ')} (${describeAdmitted(a)})`);
    console.log(`  ${a.missed.length || !matched.length || unchecked.length ? 'NOT OBSERVED' : 'observed    '}  ${describeAdmitted(a)}`);
    console.log(`      on ${matched.length} page(s): ${matched.join(', ') || 'none'}`);
  }
}

console.log('');
if (failures.length) {
  console.log(`DIFFERENCES (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`SAME: files${ADMITTED_NEW.size ? ` (apart from the ${ADMITTED_NEW.size} admitted new)` : ''}, image sizes, visible text, URLs, page images${lightningcss ? ', stylesheets' : ''}${ADMITTED.length ? ` (apart from the ${ADMITTED.length} admitted differences, each observed)` : ''}; build stamp rendered on every page.`);
