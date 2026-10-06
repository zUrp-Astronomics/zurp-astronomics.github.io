// SOURCE: zurp-astronomics-site — tests of content/: the local products (same reader as the repositories, migration = moving a folder), the README kit templates, the one source of each text
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — run by `npm test` (CLAUDE.md `## Test`, job `build` of .gitea/workflows/ci.yml)
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
import { catalogContent, fill, inlineMarkdown, licencesContent, markdownParagraphs, readMarkdown, readYaml, siteContent } from '../src/lib/content.mjs';
import { publishedSlugs } from '../src/data/published-slugs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const { sections, statuses, withoutRepository } = catalogContent(ROOT);
const sectionIds = sections.map((s) => s.id);
const site = siteContent(ROOT);
const folders = readdirSync(join(CONTENT, 'products')).filter((n) => statSync(join(CONTENT, 'products', n)).isDirectory());

/** A temporary root holding a copy of content/ (and nothing else). */
function tempContent() {
  const root = mkdtempSync(join(tmpdir(), 'zurp-content-'));
  cpSync(CONTENT, join(root, 'content'), { recursive: true });
  return root;
}

// --- Local products: content/products/<slug>/ ---------------------------------------------------

test('content/products: every folder is a valid sheet, read by the code that reads the repositories', async () => {
  const products = await readLocalProducts({ root: ROOT, sectionIds });
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

test('content/products: the « Source » link — the organisation for a product without a repository, its future repository otherwise', async () => {
  const products = await readLocalProducts({ root: ROOT, sectionIds });
  for (const p of products) {
    const expected = withoutRepository.includes(p.slug) ? site.org.url : `${site.org.url}/${p.slug}`;
    assert.equal(p.repo, expected, p.slug);
  }
  assert.ok(withoutRepository.every((s) => folders.includes(s)));
});

test('content/products: migrating a product is moving its folder into a repository’s 9_Assets/ — the same product is read', async () => {
  const local = await readLocalProducts({ root: ROOT, sectionIds });
  const sim = mkdtempSync(join(tmpdir(), 'zurp-sim-'));
  for (const slug of folders) cpSync(join(CONTENT, 'products', slug), join(sim, 'repos', slug, '9_Assets'), { recursive: true });
  const moved = await readRepoProducts(simulatorBackend(sim), { sectionIds });
  const strip = ({ origin, repo, ...rest }) => rest;
  assert.deepEqual(moved.map(strip), local.map(strip), 'every field, the poster bytes included');
  assert.ok(moved.every((p) => p.origin === `repository ${p.slug}` && p.repo === `https://github.com/zUrp-Astronomics/${p.slug}`));
});

test('content/products: a sheet is validated like a repository sheet — `repo` refused, problems named with the folder', async () => {
  const root = tempContent();
  const kaiju = join(root, 'content', 'products', 'kaiju', 'zurp.yml');
  writeFileSync(kaiju, readFileSync(kaiju, 'utf8') + 'repo: https://github.com/zUrp-Astronomics/kaiju\n');
  const unicorn = join(root, 'content', 'products', 'unicorn', 'zurp.yml');
  writeFileSync(unicorn, readFileSync(unicorn, 'utf8').replace(/^section: \w+/m, 'section: telescopes').replace(/^poster: \S+/m, 'poster: missing.webp'));
  await assert.rejects(readLocalProducts({ root, sectionIds }), (e) => {
    assert.match(e.message, /content\/products\/kaiju\/zurp\.yml: field `repo`: not allowed in the sheet/);
    assert.match(e.message, /content\/products\/unicorn\/zurp\.yml: field `section`: unknown section "telescopes"/);
    assert.match(e.message, /content\/products\/unicorn\/zurp\.yml: field `poster`: content\/products\/unicorn\/missing\.webp does not exist/);
    return true;
  });
});

test('content/products: a stale `withoutRepository` entry and a folder name in capitals fail the build', async () => {
  const root = tempContent();
  const catalog = join(root, 'content', 'catalog.yml');
  writeFileSync(catalog, readFileSync(catalog, 'utf8').replace(/withoutRepository:\n/, 'withoutRepository:\n  - ghost\n'));
  cpSync(join(root, 'content', 'products', 'kaiju'), join(root, 'content', 'products', 'Gizmo'), { recursive: true });
  await assert.rejects(readLocalProducts({ root, sectionIds }), (e) => {
    assert.match(e.message, /withoutRepository names "ghost", which is not a folder of content\/products\//);
    assert.match(e.message, /content\/products\/Gizmo\/: the folder name is the slug, in lower case/);
    return true;
  });
});

test('content/products: every published product the repositories do not hold is here', async () => {
  const local = (await readLocalProducts({ root: ROOT, sectionIds })).map((p) => p.slug);
  const sim = readdirSync(join(ROOT, 'catalog-simulator', 'repos'));
  assert.deepEqual([...local, ...sim].sort(), [...publishedSlugs].sort());
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
  assert.equal(fill('[{{hardware.short}}]({{hardware.url}})', licencesContent(ROOT)), `[${licencesContent(ROOT).hardware.short}](${licencesContent(ROOT).hardware.url})`);
});

test('content/: the site’s licence sentence links both licences, with their names as titles', () => {
  const { hardware, software } = licencesContent(ROOT);
  const html = inlineMarkdown(fill(readMarkdown('licences/site.md', ROOT), licencesContent(ROOT)));
  for (const l of [hardware, software]) assert.ok(html.includes(`<a href="${l.url}" title="${l.name}">${l.short}</a>`), l.short);
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
    ...strings(readYaml('licences/licences.yml', ROOT)),
    ...strings(readYaml('readme-kit/kit.yml', ROOT)),
    ...sections.map((s) => s.title),
    ...Object.values(statuses).map((s) => s.label),
    ...['home/pitch.md', 'home/manifesto.md', 'footer/legalese.md', 'licences/site.md', 'licences/org-readme.md', 'licences/product-readme.md']
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

// --- README kit: the templates of content/readme-kit/ ------------------------------------------------

test('README kit: every marker filled, and the shared texts come from their one source', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  cpSync(join(ROOT, 'catalog-simulator'), join(root, 'catalog-simulator'), { recursive: true });
  const { snapshot } = await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  const snap = join(root, 'snapshot.json');
  writeFileSync(snap, JSON.stringify(snapshot));
  const out = join(root, 'kit');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'readme-kit.mjs'), '--catalog', snap, '--out', out], { stdio: 'pipe' });

  const files = walk(out);
  assert.equal(files.length, 2 + publishedSlugs.length);
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /\{\{|\}\}/, relative(out, f));

  const org = readFileSync(join(out, 'profile', 'README.md'), 'utf8');
  assert.ok(org.includes(`*${site.tagline}*`), 'tagline: content/site.yml');
  assert.ok(org.includes(readMarkdown('home/pitch.md', ROOT).trim()), 'pitch: content/home/pitch.md');
  assert.ok(org.includes(`*${site.signature}*`), 'signature: content/site.yml');
  for (const s of sections.filter((s) => s.id !== 'future')) assert.ok(org.includes(`#### ${s.title}\n`), `section title ${s.title}: content/catalog.yml`);
  const kaiju = readFileSync(join(out, 'readme-kit', 'repos', 'kaiju.md'), 'utf8');
  assert.ok(kaiju.includes(`status-${statuses.wip.label}-${statuses.wip.badgeColor}`), 'status label: content/catalog.yml');
  const guide = readFileSync(join(out, 'readme-kit', 'README.md'), 'utf8');
  assert.ok(guide.includes('`content/products/<slug>/` du site'), 'the guide points to content/products/ (the one text change of ticket #49)');
  assert.ok(!guide.includes('products.ts'));
});
