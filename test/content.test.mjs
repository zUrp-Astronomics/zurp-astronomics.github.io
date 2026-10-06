// SOURCE: zurp-astronomics-site — tests of content/: the local products (same reader as the repositories, migration = moving a folder), the README kit templates, the one source of each text
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — run by `npm test` (CLAUDE.md `## Test`, job `build` of .gitea/workflows/ci.yml)
// REVISED: 2026-10-06 (ticket #53) — the product header holds only URLs (poster, status badge, GitHub licence badge) and its markers; the status JSON
// REVISED: 2026-10-06 (ticket #66) — content/licences/ is gone (the licence is the repository's LICENSE,
//   as GitHub detects it: test/catalog.test.mjs): its tests go with it; the product header has no
//   licence badge any more
// REVISED: 2026-10-06 (ticket #72) — full discovery: no list of products kept by hand — the
//   « Source » link of a local product is its discovered repository, or the organisation
// REVISED: 2026-10-06 (ticket #75) — the product header carries four elements: the poster, the status
//   badge, the software and the hardware licence badges; content/licences.yml holds texts too
//
// Ticket #49. These tests check the MECHANISM, never the words: content/ is the human's to edit, and
// no test here breaks when a text changes. That the output did not change when the texts moved is
// proved once, by the trial .gitea/workflows/trial-compare-dist.yml (main against the branch).
// Broken content is built in temporary copies of content/, never in the repository.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readRepoProducts } from '../src/lib/catalog/read.mjs';
import { simulatorBackend } from '../src/lib/catalog/source.mjs';
import { readLocalProducts } from '../src/lib/catalog/local.mjs';
import { readAndSnapshot } from '../src/lib/catalog/loader.mjs';
import { catalogContent, escapeHtml, fill, inlineMarkdown, licenseContent, markdownParagraphs, readMarkdown, readYaml, siteContent, siteView } from '../src/lib/content.mjs';
import { licenseBadgeSvg } from '../src/lib/license-badge.mjs';
import { statusBadge, statusBadgeJson } from '../src/lib/status-badge.mjs';
import { loadBuiltCatalog } from '../scripts/lib/catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const { sections, statuses } = catalogContent(ROOT);
const sectionIds = sections.map((s) => s.id);
const site = siteContent(ROOT);
const SITE = readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8').match(/\bsite:\s*['"`]([^'"`]+)['"`]/)[1].replace(/\/+$/, '');
const kitTexts = readYaml('readme-kit/kit.yml', ROOT);
const folders = readdirSync(join(CONTENT, 'products')).filter((n) => statSync(join(CONTENT, 'products', n)).isDirectory());

/** A temporary root holding a copy of content/ (and nothing else). */
function tempContent() {
  const root = mkdtempSync(join(tmpdir(), 'zurp-content-'));
  cpSync(CONTENT, join(root, 'content'), { recursive: true });
  return root;
}

// --- Local products: content/products/<slug>/ ---------------------------------------------------

test('content/products: every folder is a valid sheet, read by the code that reads the repositories', async () => {
  const products = await readLocalProducts({ root: ROOT, sectionIds, repositories: [] });
  assert.deepEqual(products.map((p) => p.slug), [...folders].sort(), 'one product per folder, the slug is the folder name');
  for (const p of products) {
    assert.equal(p.origin, `content/products/${p.slug}/`);
    assert.equal(p.release, null, `${p.slug}: no release for a local product`);
    assert.ok(['wip', 'future'].includes(p.status), p.slug);
    assert.equal(p.posterPath, `${p.slug}.webp`, `${p.slug}: the poster is next to the sheet, named after the slug`);
    assert.equal(p.posterFile, `${p.slug}.webp`);
    assert.deepEqual(p.posterBytes, readFileSync(join(CONTENT, 'products', p.slug, p.posterPath)));
  }
});

test('content/products: the « Source » link — its repository when the organisation has one by its name, the organisation otherwise', async () => {
  const none = await readLocalProducts({ root: ROOT, sectionIds, repositories: [] });
  assert.ok(none.every((p) => p.repo === site.org.url), 'no repository listed: every link is the organisation');
  const repositories = [{ name: 'Kaiju', url: `${site.org.url}/Kaiju`, license: null }];
  const one = await readLocalProducts({ root: ROOT, sectionIds, repositories });
  for (const p of one) assert.equal(p.repo, p.slug === 'kaiju' ? `${site.org.url}/Kaiju` : site.org.url, p.slug);
  // No list of products kept by hand: content/catalog.yml holds only the vocabulary of the catalog.
  assert.deepEqual(Object.keys(readYaml('catalog.yml', ROOT)).sort(), ['sections', 'statusBadge', 'statuses']);
  assert.deepEqual(Object.keys(catalogContent(ROOT)).sort(), ['sections', 'statusBadge', 'statuses']);
});

test('content/products: migrating a product is moving its folder into a repository’s 9_Assets/ — the same product is read', async () => {
  const local = await readLocalProducts({ root: ROOT, sectionIds, repositories: [] });
  const sim = mkdtempSync(join(tmpdir(), 'zurp-sim-'));
  for (const slug of folders) cpSync(join(CONTENT, 'products', slug), join(sim, 'repos', slug, '9_Assets'), { recursive: true });
  const { products: moved } = await readRepoProducts(simulatorBackend(sim), { sectionIds });
  const strip = ({ origin, repo, ...rest }) => rest;
  assert.deepEqual(moved.map(strip), local.map(strip), 'every field, the poster bytes included');
  assert.ok(moved.every((p) => p.origin === `repository ${p.slug}` && p.repo === `https://github.com/zUrp-Astronomics/${p.slug}`));
});

test('content/products: a sheet is validated like a repository sheet — `repo` refused, problems named with the folder', async () => {
  const root = tempContent();
  const kaiju = join(root, 'content', 'products', 'kaiju', 'zurp.yml');
  writeFileSync(kaiju, readFileSync(kaiju, 'utf8') + 'repo: https://github.com/zUrp-Astronomics/kaiju\n');
  const kraken = join(root, 'content', 'products', 'kraken', 'zurp.yml');
  writeFileSync(kraken, readFileSync(kraken, 'utf8').replace(/^section: \w+/m, 'section: telescopes').replace(/^poster: \S+/m, 'poster: missing.webp'));
  await assert.rejects(readLocalProducts({ root, sectionIds, repositories: [] }), (e) => {
    assert.match(e.message, /content\/products\/kaiju\/zurp\.yml: field `repo`: not allowed in the sheet/);
    assert.match(e.message, /content\/products\/kraken\/zurp\.yml: field `section`: unknown section "telescopes"/);
    assert.match(e.message, /content\/products\/kraken\/zurp\.yml: field `poster`: content\/products\/kraken\/missing\.webp does not exist/);
    return true;
  });
});

test('content/products: a folder name in capitals fails the build', async () => {
  const root = tempContent();
  cpSync(join(root, 'content', 'products', 'kaiju'), join(root, 'content', 'products', 'Gizmo'), { recursive: true });
  await assert.rejects(readLocalProducts({ root, sectionIds, repositories: [] }), /content\/products\/Gizmo\/: the folder name is the slug, in lower case/);
});

// The simulator imitates the organisation (catalog-simulator/README.md): a repository with a sheet
// holds a product that is no longer in content/products/; the other products of content/products/
// have an imitated repository without a sheet (kaiju, kraken, berserker: real ones), or none
// (cyclops, wraith: none in the organisation).
test('content/products and the simulator: each product in one place; the imitated repositories without a sheet are those of local products', async () => {
  const local = (await readLocalProducts({ root: ROOT, sectionIds, repositories: [] })).map((p) => p.slug);
  const repos = readdirSync(join(ROOT, 'catalog-simulator', 'repos'));
  const withSheet = repos.filter((r) => existsSync(join(ROOT, 'catalog-simulator', 'repos', r, '9_Assets', 'zurp.yml')));
  assert.deepEqual(withSheet.sort(), ['basilisk', 'maelstrom', 'unicorn']);
  assert.deepEqual(withSheet.filter((r) => local.includes(r)), [], 'no slug both in a repository of the simulator and in content/products/');
  assert.deepEqual(repos.filter((r) => !withSheet.includes(r)).sort(), ['berserker', 'kaiju', 'kraken']);
  assert.deepEqual(local.filter((s) => !repos.includes(s)).sort(), ['cyclops', 'wraith']);
});

// --- content/ files --------------------------------------------------------------------------------

function walk(dir) {
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
}

test('content/: every Markdown file read by the code opens with a front matter, which is never part of the text', () => {
  for (const file of walk(CONTENT).filter((f) => f.endsWith('.md') && !f.endsWith('/content/README.md'))) {
    const rel = relative(CONTENT, file);
    const text = readMarkdown(rel, ROOT);
    assert.ok(!/^---/.test(text) && !/^Date:/m.test(text.split('\n')[0]), rel);
  }
});

test('content/: Markdown prose is rendered as written — entities kept, no typographic substitution, links with titles', () => {
  assert.equal(inlineMarkdown(`it's 10&nbsp;MB -- "x"`), 'it\'s 10&nbsp;MB -- &quot;x&quot;');
  assert.equal(inlineMarkdown('[a](https://e.org "T") \\*b\\* & c'), '<a href="https://e.org" title="T">a</a> *b* &amp; c');
  assert.deepEqual(markdownParagraphs('one\ntwo\n\n  three  \n'), ['one\ntwo', 'three']);
});

// --- The code holds no text of content/ ------------------------------------------------------------

// The source of src/ and scripts/ without its comments: line comments, block comments (JS, CSS,
// JSX), HTML comments.
function codeWithoutComments() {
  const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'scripts'))].filter((f) => /\.(astro|ts|mjs|js)$/.test(f));
  return files.map((f) => [
    relative(ROOT, f),
    readFileSync(f, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ''),
  ]);
}

function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

test('the code (src/, scripts/) holds none of the texts of content/ — they have one source', () => {
  const texts = new Set([
    ...strings(readYaml('site.yml', ROOT)),
    ...strings(readYaml('readme-kit/kit.yml', ROOT)),
    ...strings(readYaml('licences.yml', ROOT)),
    ...sections.map((s) => s.title),
    ...Object.values(statuses).map((s) => s.label),
    ...['home/pitch.md', 'home/manifesto.md', 'footer/legalese.md']
      .flatMap((f) => readMarkdown(f, ROOT).split(/[\n.:;]/))
      .map((s) => s.replace(/\{\{\{?[^}]*\}?\}\}|\*\*|\[|\]\([^)]*\)/g, ' ').trim()),
    ...['org-readme', 'product-header', 'guide', 'projects-table']
      .flatMap((f) => readMarkdown(`readme-kit/${f}.md`, ROOT).split('\n'))
      .map((s) => s.replace(/\{\{\{?[^}]*\}?\}\}/g, '').trim()),
  ]);
  // Short words (« Source », « GitHub », « WIP ») may be anything in code; a text worth a source of
  // its own is longer than that.
  const checked = [...texts].filter((t) => t.length >= 12 && !/^https?:\/\//.test(t));
  assert.ok(checked.length > 50, `only ${checked.length} texts checked — content/ or this test changed shape?`);
  const found = [];
  for (const [file, code] of codeWithoutComments()) {
    for (const t of checked) if (code.includes(t)) found.push(`${file}: ${JSON.stringify(t)}`);
  }
  assert.deepEqual(found, []);
});

// The texts the site and the org README share (ticket #49, criterion 3) are each written ONCE in
// content/ itself, not only kept out of the code: a second copy in content/ would let one place
// drift when the other is edited (the affiliation of the signature was once also spelt out in the
// footer's product line). Read from content/, so the test holds whatever the words.
test('the shared texts (tagline, pitch, affiliation of the signature) are written once in content/', () => {
  const texts = walk(CONTENT)
    .filter((f) => /\.(md|ya?ml)$/.test(f))
    .map((f) => [relative(ROOT, f), readFileSync(f, 'utf8')]);
  const shared = {
    tagline: site.tagline,
    pitch: readMarkdown('home/pitch.md', ROOT).trim(),
    affiliation: site.affiliation,
  };
  for (const [what, text] of Object.entries(shared)) {
    assert.ok(typeof text === 'string' && text.length >= 12, `${what}: missing or too short in content/`);
    const where = texts.flatMap(([file, body]) => Array(body.split(text).length - 1).fill(file));
    assert.deepEqual(where.length, 1, `${what} ${JSON.stringify(text)} written ${where.length} times: ${where.join(', ')}`);
  }
  // The two lines that carry the affiliation both take it from that one source.
  assert.ok(site.signature.includes(site.affiliation), 'the signature takes `affiliation`');
  assert.ok(site.signature.includes(site.name), 'the signature takes `name`');
  const productLine = fill(site.footer.productLine, { ...siteView(site), product: 'Xyzzy' });
  assert.ok(productLine.includes(site.affiliation), "the footer's product line takes `affiliation`");
  assert.doesNotMatch(`${site.signature}\n${productLine}`, /\{\{|\}\}/);
});

// --- README kit: the templates of content/readme-kit/ ------------------------------------------------

/** The README kit generated from the simulator's catalog, in a temporary directory, and that catalog. */
async function simulatorKit() {
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  cpSync(join(ROOT, 'catalog-simulator'), join(root, 'catalog-simulator'), { recursive: true });
  cpSync(CONTENT, join(root, 'content'), { recursive: true });
  const { snapshot } = await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  const snap = join(root, 'snapshot.json');
  writeFileSync(snap, JSON.stringify(snapshot));
  const out = join(root, 'kit');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'readme-kit.mjs'), '--catalog', snap, '--out', out], { stdio: 'pipe' });
  const { products } = await loadBuiltCatalog({ snapshotFile: snap });
  return { out, products };
}

test('README kit: every marker filled, and the shared texts come from their one source', async () => {
  const { out, products } = await simulatorKit();

  const files = walk(out);
  assert.equal(files.length, 2 + products.length, 'the org README, the guide, one header per product of the built catalog');
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /\{\{|\}\}/, relative(out, f));

  const org = readFileSync(join(out, 'profile', 'README.md'), 'utf8');
  assert.ok(org.includes(`*${site.tagline}*`), 'tagline: content/site.yml');
  assert.ok(org.includes(readMarkdown('home/pitch.md', ROOT).trim()), 'pitch: content/home/pitch.md');
  assert.ok(org.includes(`*${site.signature}*`), 'signature: content/site.yml');
  for (const s of sections.filter((s) => s.id !== 'future')) assert.ok(org.includes(`#### ${s.title}\n`), `section title ${s.title}: content/catalog.yml`);
  // Ticket #66: the org README carries no licence — no badge, no sentence, no project licence.
  assert.doesNotMatch(org, /licen[cs]e|OCL|GPL/i, 'no licence in the org README');
  // Ticket #53: kaiju's status is no longer written in its header, it is in its status JSON.
  const kaiju = JSON.parse(statusBadgeJson(products.find((p) => p.slug === 'kaiju'), catalogContent(ROOT)));
  assert.ok(kaiju.message.includes(statuses.wip.label), 'status label: content/catalog.yml');
  assert.equal(kaiju.color, statuses.wip.badgeColor, 'status colour: content/catalog.yml');
  const guide = readFileSync(join(out, 'readme-kit', 'README.md'), 'utf8');
  assert.ok(guide.includes('`content/products/<slug>/` du site'), 'the guide points to content/products/ (the one text change of ticket #49)');
  assert.ok(!guide.includes('products.ts'));
});

// Ticket #53. The header is pasted ONCE in the product repository and never again: it holds only
// URLs whose content is served elsewhere — the poster (to the product page), the status badge (the
// site's JSON, through shields.io) — and its two markers. No text of the sheet: it would go stale.
// Ticket #75 (the human: « je veux la licence hardware »): after the status badge, the two licence
// badges the site draws, software then hardware — an empty SVG when the repository declares no such
// licence, so the same four elements for every product, with a repository or without.
test('README kit: a product header holds, in order, the poster, the status badge, the software and the hardware licence badges, and its markers — nothing else', async () => {
  const { out, products } = await simulatorKit();
  const org = site.org.url.replace(/\/+$/, '');
  const texts = licenseContent(ROOT);
  let withRepo = 0;
  let withoutRepo = 0;
  for (const p of products) {
    const text = readFileSync(join(out, 'readme-kit', 'repos', `${p.slug}.md`), 'utf8');
    const hasRepo = p.repo.replace(/\/+$/, '') !== org;
    if (hasRepo) withRepo++;
    else withoutRepo++;
    const expected = [
      `${SITE}/${p.slug}/`,
      `${SITE}/brand/posters/${p.slug}.webp`,
      `https://img.shields.io/endpoint?url=${encodeURIComponent(`${SITE}/brand/status/${p.slug}.json`)}`,
      `${SITE}/brand/badges/${p.slug}/software.svg`,
      `${SITE}/brand/badges/${p.slug}/hardware.svg`,
    ];
    const urls = [...text.matchAll(/\b(?:src|href)="([^"]*)"|\]\(([^)\s]*)\)/g)].map((m) => m[1] ?? m[2]);
    assert.deepEqual(urls, expected, `${p.slug}: the URLs of the header, in order — page and poster, status, software, hardware`);
    // The images, in order: the poster, then the three badges, each with its alt text of kit.yml.
    const images = [...text.matchAll(/<img\b[^>]*\balt="([^"]*)"|!\[([^\]]*)\]\(/g)].map((m) => m[1] ?? m[2]);
    assert.deepEqual(images, [kitTexts.header.posterAlt, kitTexts.header.statusAlt, kitTexts.header.softwareAlt, kitTexts.header.hardwareAlt], p.slug);
    assert.ok(!text.includes('img.shields.io/github/license'), `${p.slug}: no GitHub licence badge`);
    // The licence itself is never written in the header: it is drawn in the SVG, at each build.
    for (const kind of ['software', 'hardware']) {
      const svg = licenseBadgeSvg(p, kind, texts);
      const label = svg.match(/>([^<]+)<\/text><\/g>/)?.[1];
      if (label) assert.ok(!text.includes(label), `${p.slug}: the ${kind} licence ${label} is in the SVG, not in the header`);
    }

    // The markers that delimit the block (content/readme-kit/kit.yml), naming no product.
    assert.ok(text.startsWith(`<!-- ${kitTexts.header.begin} `), `${p.slug}: opens with the begin marker`);
    assert.ok(text.trimEnd().endsWith(`<!-- ${kitTexts.header.end} -->`), `${p.slug}: closes with the end marker`);

    // No text of the sheet, outside the URLs (a repository URL may hold the product's name).
    let rest = text;
    for (const u of expected) rest = rest.split(u).join(' ');
    for (const t of [p.name, p.slogan, p.tagline, p.posterAlt, p.basedOn].filter(Boolean)) {
      assert.ok(!rest.toLowerCase().includes(t.toLowerCase()), `${p.slug}: the header holds ${JSON.stringify(t)}, a text of the sheet`);
    }
    // Nothing else: once the URLs and the texts of kit.yml `header` are removed, only markup is left.
    for (const t of Object.values(kitTexts.header).sort((a, b) => b.length - a.length)) {
      rest = rest.split(escapeHtml(t)).join(' ').split(t).join(' ');
    }
    assert.equal(rest.replace(/<[^>]*>|!\[\s*\]\(\s*\)|—|\s/g, ''), '', `${p.slug}: something else than the poster, the badges and the markers`);
  }
  assert.ok(withRepo > 0 && withoutRepo > 0, `products with (${withRepo}) and without (${withoutRepo}) a repository both checked`);
  // The guide says it, and says that a block pasted before is pasted again, once.
  const guide = readFileSync(join(out, 'readme-kit', 'README.md'), 'utf8');
  assert.ok(guide.includes(`${SITE}/brand/badges/<produit>/software.svg`) && guide.includes(`${SITE}/brand/badges/<produit>/hardware.svg`), 'the guide names the two badges');
  assert.match(guide, /LICENSE-HARDWARE/);
});

// The status JSON (/brand/status/<slug>.json, src/lib/status-badge.mjs): shields' endpoint schema,
// the label and colour of content/catalog.yml, the release tag only when there is a release. The
// product with a release is checked in test/catalog.test.mjs (its scenario injects one), the file in
// dist/ by scripts/check-dist.mjs.
test('status JSON: a product without a release (wip) and a future one — label and colour of the status, no tag', async () => {
  const { products } = await simulatorKit();
  const texts = catalogContent(ROOT);
  const cases = [products.find((p) => p.slug === 'kaiju'), products.find((p) => p.status === 'future')];
  assert.deepEqual(cases.map((p) => p?.status), ['wip', 'future'], 'kaiju is wip, and one product is future');
  for (const p of cases) {
    assert.equal(p.release, null, p.slug);
    const json = JSON.parse(statusBadgeJson(p, texts));
    assert.deepEqual(json, statusBadge(p, texts));
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.label, texts.statusBadge.label);
    assert.ok(typeof json.message === 'string' && json.message.includes(statuses[p.status].label), `${p.slug}: ${json.message}`);
    assert.equal(json.color, statuses[p.status].badgeColor);
    assert.doesNotMatch(json.message, /\{\{|\}\}/);
    // The release part of the message shows only with a release.
    const tag = 'zz-tag-53';
    assert.ok(!json.message.includes(tag));
    assert.ok(statusBadge({ ...p, release: { tag, publishedAt: '2026-10-06T00:00:00.000Z' } }, texts).message.includes(tag), `${p.slug}: the tag shows with a release`);
  }
  assert.throws(() => statusBadge({ slug: 'x', status: 'nope', release: null }, texts), /no status "nope"/);
});
