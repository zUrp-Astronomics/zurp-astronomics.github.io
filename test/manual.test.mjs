// SOURCE: zurp-astronomics-site — the tests of a product's manual (ticket #111): the files read in both backends, the language and its fall-back, the Markdown rendered (front matter, raw HTML, links), the images (served under 600 KB, or left out and reported), the tabs of the page with the Install block in Setup, the report, the simulator's demo manuals, the guard of the pages
// AUTHOR: engineer
// DATE: 2026-10-20
// STATUS: active
//
// Run with `npm test` (needs `npm ci`). The convention is the agency's (§ 7 of
// content/readme-kit/guide.md): a project builds its manual on it, so every rule of it is tested
// here. A case the simulator does not hold is built in a temporary simulator (makeSim).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { githubBackend, simulatorBackend } from '../src/lib/catalog/source.mjs';
import { ASSETS_DIR, readRepoProducts } from '../src/lib/catalog/read.mjs';
import { MANUAL_DIR, MANUAL_IMAGE_MAX_BYTES, MANUAL_LANGS, MANUAL_TABS, manualPath } from '../src/lib/catalog/manual.mjs';
import { readAndSnapshot, readSnapshot } from '../src/lib/catalog/loader.mjs';
import { catalogReport } from '../src/lib/catalog/report.mjs';
import { manualImageUrlPath, manualTabs, manualTexts } from '../src/lib/manual.mjs';
import { catalogContent, siteContent } from '../src/lib/content.mjs';
import { loadBuiltCatalog } from '../scripts/lib/catalog.mjs';
import { manualDirProblems, manualPageProblems } from '../scripts/lib/check-manual.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIM = join(ROOT, 'catalog-simulator');
const sectionIds = catalogContent(ROOT).sections.map((s) => s.id);

const SHEET = `name: Gizmo
tagline: A gizmo.
slogan: Gizmo all the things
category: Gadget
section: gadgets
status: wip
description:
  - First paragraph.
poster: poster.png
posterAlt: Gizmo poster.
accent: '#123456'
`;
const PNG = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#123456' } }).png().toBuffer();
const SMALL = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#05b40e' } }).jpeg().toBuffer();
/** A valid PNG well over the 600 KB ceiling: noise does not compress. */
const HEAVY = await (async () => {
  const w = 1100;
  const h = 800;
  const raw = Buffer.alloc(w * h * 3);
  let seed = 7;
  for (let i = 0; i < raw.length; i++) raw[i] = (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 24;
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
})();
const md = (body, front = true) => (front ? `---\nDate: 2026-10-20\nStatus: test\n---\n\n${body}` : body);
const repo = (manual = {}) => ({ '9_Assets/zurp.yml': SHEET, '9_Assets/poster.png': PNG, ...manual });
const rel = (tag, at) => ({ tag_name: tag, published_at: at, draft: false, prerelease: false });

/** A temporary simulator: repos { name: { path: content } }, releases { name: [{ ...release, files }] }. */
function makeSim(repos, releases = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'zurp-manual-'));
  const write = (path, content) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  };
  for (const [name, files] of Object.entries(repos)) for (const [p, c] of Object.entries(files)) write(join(dir, 'repos', name, p), c);
  for (const [name, list] of Object.entries(releases)) {
    write(join(dir, 'releases', `${name}.json`), JSON.stringify(list.map(({ files, ...r }) => r)));
    for (const r of list) for (const [f, c] of Object.entries(r.files ?? {})) write(join(dir, 'releases', name, r.tag_name, f), c);
  }
  return dir;
}

/** The simulator backend of `dir`, every readFile recorded in `reads` (`<repo>/<path>`). */
function spied(dir) {
  const be = simulatorBackend(dir);
  const reads = [];
  return {
    reads,
    backend: {
      ...be,
      async readFile(r, path) {
        reads.push(`${r}/${path}`);
        return be.readFile(r, path);
      },
    },
  };
}
const read = (backend) => readRepoProducts(backend, { sectionIds });
const bySlug = (products) => Object.fromEntries(products.map((p) => [p.slug, p]));
const tab = (p, id) => p.manual?.tabs.find((t) => t.id === id);
const EIGHT = MANUAL_TABS.flatMap((t) => MANUAL_LANGS.map((l) => `${MANUAL_DIR}/${t}.${l}.md`));

// 1 -------------------------------------------------------------------------------------------------
test('1. the manual is 9_Assets/manual/{overview,assembly,setup,usage}.{en,fr}.md: those 8 files are read, in both backends, and no other name — no folder is listed', async () => {
  assert.equal(MANUAL_DIR, `${ASSETS_DIR}/manual`, 'the manual is under 9_Assets/');
  assert.deepEqual(EIGHT, MANUAL_TABS.flatMap((t) => MANUAL_LANGS.map((l) => manualPath(t, l))));
  const files = {
    '9_Assets/manual/overview.en.md': md('Hello.'),
    '9_Assets/manual/usage.fr.md': md('Bonjour.'),
    '9_Assets/manual/extra.en.md': md('Never read.'),
    '9_Assets/manual/setup.md': md('Never read.'),
    '9_Assets/manual/Overview.EN.md': md('Never read.'),
  };
  const sim = makeSim({ alpha: repo(files), bravo: repo() });
  const { reads, backend } = spied(sim);
  const { products } = await read(backend);
  const manualReads = (r) => reads.filter((p) => p.startsWith(`${r}/${MANUAL_DIR}/`)).map((p) => p.slice(r.length + 1));
  assert.deepEqual(manualReads('alpha').sort(), [...EIGHT].sort(), 'the 8 names, each once, and nothing else of manual/');
  assert.deepEqual(manualReads('bravo').sort(), [...EIGHT].sort(), 'a repository without a manual is probed the same way');
  assert.ok(!reads.some((p) => /README|7_Docs/.test(p)), 'never the README or the docs');
  const by = bySlug(products);
  assert.deepEqual(by.alpha.manual.tabs.map((t) => [t.id, t.lang]), [['overview', 'en'], ['usage', 'fr']]);
  assert.equal(by.bravo.manual, null, 'no manual file: no manual');

  // The GitHub backend (simulated): the same 8 requests through the contents endpoint, nothing listed.
  const calls = [];
  const gh = { 'Alpha/9_Assets/zurp.yml': SHEET, 'Alpha/9_Assets/poster.png': PNG, ...Object.fromEntries(Object.entries(files).map(([k, v]) => [`Alpha/${k}`, v])), 'Alpha/9_Assets/manual/img.jpg': SMALL };
  gh['Alpha/9_Assets/manual/overview.en.md'] = md('Hello. ![a picture](img.jpg)');
  const fetchImpl = async (url) => {
    calls.push(url);
    const path = new URL(url).pathname;
    if (path === '/orgs/zUrp-Astronomics/repos') return Response.json([{ name: 'Alpha', html_url: 'https://github.com/zUrp-Astronomics/Alpha', license: null }]);
    if (path === '/repos/zUrp-Astronomics/Alpha/releases') return Response.json([]);
    const m = path.match(/^\/repos\/zUrp-Astronomics\/Alpha\/contents\/(.+)$/);
    const key = m && `Alpha/${decodeURIComponent(m[1])}`;
    return key in gh ? new Response(gh[key]) : new Response('{"message":"Not Found"}', { status: 404 });
  };
  const viaGitHub = await read(githubBackend({ fetchImpl }));
  const manualCalls = calls.map((u) => new URL(u).pathname).filter((p) => p.includes('/contents/9_Assets/manual'));
  assert.deepEqual(
    manualCalls.sort(),
    [...EIGHT, '9_Assets/manual/img.jpg'].map((p) => `/repos/zUrp-Astronomics/Alpha/contents/${p}`).sort(),
    'GitHub: the 8 files and the image shown, by their names',
  );
  assert.deepEqual(viaGitHub.products[0].manual.tabs.map((t) => [t.id, t.lang]), [['overview', 'en'], ['usage', 'fr']]);
  assert.equal(viaGitHub.products[0].manual.images.length, 1);
  // A failed read of a manual file (not a 404) fails the build, like every other read.
  const failing = async (url) => (url.includes('manual/assembly.fr.md') ? new Response('boom', { status: 502 }) : fetchImpl(url));
  await assert.rejects(read(githubBackend({ fetchImpl: failing })), /HTTP 502/);
});

// 2 -------------------------------------------------------------------------------------------------
test('2. the .en.md is shown; without it — absent, or unreadable — the .fr.md, marked fr; an unreadable file is reported, never a skip', async () => {
  const sim = makeSim({
    alpha: repo({
      '9_Assets/manual/overview.en.md': md('English overview.'),
      '9_Assets/manual/overview.fr.md': md('Aperçu en français.'),
      '9_Assets/manual/setup.fr.md': md('Installation, en français.'),
      '9_Assets/manual/usage.en.md': Buffer.from([0xff, 0xfe, 0x00, 0x41]),
      '9_Assets/manual/usage.fr.md': md('Utilisation.'),
      '9_Assets/manual/assembly.en.md': Buffer.from([0xc3, 0x28]),
    }),
  });
  const { products, skipped, manualProblems } = await read(simulatorBackend(sim));
  assert.deepEqual(skipped, []);
  const [p] = products;
  assert.deepEqual(manualProblems.flatMap((r) => r.problems), [
    'repository alpha, 9_Assets/manual/assembly.en.md: unreadable — not UTF-8 text; not published',
    'repository alpha, 9_Assets/manual/usage.en.md: unreadable — not UTF-8 text; not published',
  ]);
  assert.deepEqual(p.manual.tabs.map((t) => [t.id, t.lang, t.file]), [
    ['overview', 'en', '9_Assets/manual/overview.en.md'],
    ['setup', 'fr', '9_Assets/manual/setup.fr.md'],
    ['usage', 'fr', '9_Assets/manual/usage.fr.md'],
  ]);
  assert.match(tab(p, 'overview').html, /English overview/);
  assert.doesNotMatch(tab(p, 'overview').html, /français/);
});

// 3 -------------------------------------------------------------------------------------------------
test('3. the Markdown: the front matter is never rendered, raw HTML is text, a link to the repository goes to GitHub, one to a manual file to its tab, an absolute link is unchanged; an H1 is rendered and reported', async () => {
  const overview = md(
    [
      '# Big title',
      '',
      'Some <b>bold</b> and <script>alert(1)</script>.',
      '',
      '<div class="x">block</div>',
      '',
      '[schematics](../../1_Board/Gizmo-v1.0_1-Schematics.pdf) · [root file](/LICENSE) · [beside](notes/a%20b.txt#part)',
      '[usage](usage.en.md) · [usage fr](./usage.fr.md#x) · [assembly](assembly.en.md) · [out](../../../../x)',
      '[site](https://example.com/a?b=c#d) · [mail](mailto:a@b.c) · [here](#setup) · [proto](//example.org/x)',
    ].join('\n'),
  );
  const sim = makeSim({
    alpha: repo({
      '9_Assets/manual/overview.en.md': overview,
      '9_Assets/manual/usage.en.md': '---\ntitle: no blank line after\n---\n## Usage\n',
    }),
  });
  const { products, manualProblems } = await read(simulatorBackend(sim));
  const [p] = products;
  const html = tab(p, 'overview').html;
  assert.doesNotMatch(html, /Date: 2026|Status: test/, 'no front matter');
  assert.doesNotMatch(tab(p, 'usage').html, /title: no blank line|<hr/, 'no front matter, even right before the text');
  assert.match(tab(p, 'usage').html, /^<h2>Usage<\/h2>/);
  assert.match(html, /<h1>Big title<\/h1>/, 'the H1 is rendered as written');
  assert.match(html, /Some &lt;b&gt;bold&lt;\/b&gt; and &lt;script&gt;alert\(1\)&lt;\/script&gt;\./, 'raw inline HTML is text');
  assert.match(html, /&lt;div class=&quot;x&quot;&gt;block&lt;\/div&gt;/, 'a raw HTML block is text');
  assert.doesNotMatch(html, /<b>|<script|<div/);
  const repoUrl = 'https://github.com/zUrp-Astronomics/alpha';
  assert.ok(html.includes(`href="${repoUrl}/blob/HEAD/1_Board/Gizmo-v1.0_1-Schematics.pdf"`), 'relative to the .md, on GitHub');
  assert.ok(html.includes(`href="${repoUrl}/blob/HEAD/LICENSE"`), 'a leading / is the repository root');
  assert.ok(html.includes(`href="${repoUrl}/blob/HEAD/9_Assets/manual/notes/a%20b.txt#part"`), 'decoded, re-encoded, fragment kept');
  assert.ok(html.includes('href="#usage">usage<') && html.includes('href="#usage">usage fr<'), 'a manual file → its tab');
  assert.ok(html.includes(`href="${repoUrl}/blob/HEAD/9_Assets/manual/assembly.en.md"`), 'a manual file whose tab is not on the page → the file on GitHub');
  assert.ok(html.includes(`href="${repoUrl}">out<`), 'out of the repository → the repository');
  for (const href of ['https://example.com/a?b=c#d', 'mailto:a@b.c', '#setup', '//example.org/x']) assert.ok(html.includes(`href="${href}"`), `${href} unchanged`);

  const report = catalogReport({ read: 'test', products, skipped: [], ignoredReleases: [], manualProblems });
  assert.deepEqual(
    report.warnings,
    ['manual problem (product published) — repository alpha, 9_Assets/manual/overview.en.md: a level-1 heading (# Big title) — the sections of a manual start at ##; rendered as written'],
  );
});

// 4 -------------------------------------------------------------------------------------------------
test('4. the images: relative to the .md, under 9_Assets/, PNG / JPEG / WebP / AVIF, re-encoded under 600 KB and served; absent, outside 9_Assets/, of another format or undecodable: not shown, reported, the product published', async () => {
  assert.ok(HEAVY.length > 600 * 1024, `the source image weighs ${HEAVY.length} bytes, over 600 KB`);
  const body = [
    '![heavy](images/heavy.png)',
    '![again](./images/heavy.png)',
    '![small](../small.jpg)',
    '![missing](images/missing.png)',
    '![outside](../../1_Board/view.png)',
    '![remote](https://example.com/x.png)',
    '![svg](images/logo.svg)',
    '![broken](images/broken.webp)',
  ].join('\n\n');
  const sim = makeSim({
    alpha: repo({
      '9_Assets/manual/assembly.en.md': md(body),
      '9_Assets/manual/images/heavy.png': HEAVY,
      '9_Assets/small.jpg': SMALL,
      '9_Assets/manual/images/logo.svg': '<svg/>',
      '9_Assets/manual/images/broken.webp': 'not an image',
      '1_Board/view.png': PNG,
    }),
  });
  const { reads, backend } = spied(sim);
  const { products, skipped, manualProblems } = await read(backend);
  assert.deepEqual(skipped, []);
  const [p] = products;
  assert.ok(!reads.some((r) => r.includes('1_Board')), 'nothing outside 9_Assets/ is read');
  assert.equal(p.manual.images.length, 2, 'the heavy image (shown twice, served once) and the small one');
  for (const image of p.manual.images) {
    assert.ok(image.size <= MANUAL_IMAGE_MAX_BYTES && image.size < 600 * 1024, `${image.source}: ${image.size} bytes`);
    assert.match(image.name, /^[0-9a-f]{16}\.webp$/);
  }
  const heavy = p.manual.images.find((i) => i.source === '9_Assets/manual/images/heavy.png');
  assert.ok(heavy.width <= 1600 && heavy.height > 0);
  const html = tab(p, 'assembly').html;
  assert.equal((html.match(/<img /g) ?? []).length, 3, 'heavy twice, small once — and none of the others');
  assert.ok(html.includes(`src="${manualImageUrlPath('alpha', heavy)}" alt="heavy" width="${heavy.width}" height="${heavy.height}" loading="lazy" decoding="async"`));
  for (const gone of ['missing', 'outside', 'remote', 'svg', 'broken']) assert.ok(!html.includes(`alt="${gone}"`), `${gone} not shown`);
  assert.doesNotMatch(html, /<p>\s*<\/p>/, 'no empty paragraph where an image was left out');
  const problems = manualProblems.flatMap((r) => r.problems);
  const at = 'repository alpha, 9_Assets/manual/assembly.en.md: image';
  const expected = [
    `${at} "images/missing.png" (9_Assets/manual/images/missing.png) does not exist in the repository — not shown`,
    `${at} "../../1_Board/view.png" is not under 9_Assets/ of the repository — not shown`,
    `${at} "https://example.com/x.png" is not under 9_Assets/ of the repository — not shown`,
    `${at} "images/logo.svg" (9_Assets/manual/images/logo.svg) is not a PNG, JPEG, WebP or AVIF file — not shown`,
  ];
  assert.deepEqual(problems.slice(0, 4), expected, 'one problem per image left out, in the order of the file');
  assert.match(problems[4], /^repository alpha, 9_Assets\/manual\/assembly\.en\.md: image "images\/broken\.webp" \(9_Assets\/manual\/images\/broken\.webp\) (does not decode|is not a PNG).* — not shown$/);
  assert.equal(problems.length, 5);
});

// 5 -------------------------------------------------------------------------------------------------
test('5. the tabs of a page: the files shown in the order Overview, Assembly, Setup, Usage; a Setup tab whenever there is something to install, holding the Install block; none without a manual', async () => {
  const install = { tag: 'v1', publishedAt: '2026-10-01T00:00:00Z', esp: null, downloads: [], bench: null };
  const t = (id, lang = 'en') => ({ id, lang, file: `9_Assets/manual/${id}.${lang}.md`, html: `<p>${id}</p>` });
  assert.equal(manualTabs({ manual: null, install }), null, 'no manual: no tabs, the Install block in its place');
  assert.equal(manualTabs({ manual: { tabs: [], images: [] }, install }), null);
  assert.deepEqual(manualTabs({ manual: { tabs: [t('usage'), t('overview', 'fr')], images: [] }, install: null }).map((x) => [x.id, x.lang, x.install]), [
    ['overview', 'fr', false],
    ['usage', 'en', false],
  ]);
  assert.deepEqual(manualTabs({ manual: { tabs: [t('usage'), t('overview')], images: [] }, install }).map((x) => [x.id, x.lang, x.html, x.install]), [
    ['overview', 'en', '<p>overview</p>', false],
    ['setup', null, null, true],
    ['usage', 'en', '<p>usage</p>', false],
  ], 'a manual without setup and an install: a Setup tab with the Install block only');
  assert.deepEqual(manualTabs({ manual: { tabs: [t('setup', 'fr'), t('assembly')], images: [] }, install }).map((x) => [x.id, x.install]), [
    ['assembly', false],
    ['setup', true],
  ]);
  const texts = manualTexts(siteContent(ROOT));
  assert.deepEqual(texts.tabs, { overview: 'Overview', assembly: 'Assembly', setup: 'Setup', usage: 'Usage' }, 'the titles are the site’s (content/site.yml)');
  assert.throws(() => manualTexts({ product: { manual: { label: 'x', tabs: { overview: 'O' } } } }), /product\.manual\.tabs\.assembly/);
});

// 6 -------------------------------------------------------------------------------------------------
test('6. the report, through the real chain (readAndSnapshot, loadBuiltCatalog, catalogReport): per product its tabs and their language, each manual problem a warning of its own naming the repository and the file; the image bytes beside the snapshot, never in it', async () => {
  const sim = makeSim(
    {
      echo: repo({
        '9_Assets/manual/overview.en.md': md('# Title\n\n![x](gone.png)\n\n![y](img.jpg)'),
        '9_Assets/manual/usage.fr.md': md('## Utilisation'),
        '9_Assets/manual/img.jpg': SMALL,
      }),
      foxtrot: repo({ '9_Assets/manual/usage.en.md': md('## Usage') }),
      golf: repo(),
    },
    { foxtrot: [{ ...rel('v1', '2026-09-01T00:00:00Z'), files: { 'gizmo_1.0.0_stm32f411.hex': 'hex' } }] },
  );
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  cpSync(join(ROOT, 'content'), join(root, 'content'), { recursive: true });
  await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds, backend: simulatorBackend(sim) });
  const snapshotFile = join(root, '.zurp-catalog', 'remote.json');
  const report = catalogReport(await loadBuiltCatalog({ snapshotFile, root }));
  const line = (slug) => report.lines.find((l) => l.startsWith(`  ${slug} `));
  assert.match(line('echo'), /  manual overview en, usage fr  nothing to install$/);
  assert.match(line('foxtrot'), /  manual setup install only, usage en  install v1: download gizmo_1\.0\.0_stm32f411\.hex$/, 'the install labels end the line, as they did');
  assert.match(line('golf'), /  no manual  nothing to install$/);
  assert.match(report.lines[0], / 2 with a manual, 2 manual problem\(s\), .* 1 with something to install, 0 ESP manifest\(s\) rejected$/);
  assert.deepEqual(report.warnings, [
    'manual problem (product published) — repository echo, 9_Assets/manual/overview.en.md: a level-1 heading (# Title) — the sections of a manual start at ##; rendered as written',
    'manual problem (product published) — repository echo, 9_Assets/manual/overview.en.md: image "gone.png" (9_Assets/manual/gone.png) does not exist in the repository — not shown',
  ]);
  assert.match(report.markdown, /\| Product \| Slug \| Origin \| Source link \| Install \| Manual \|/);
  assert.match(report.markdown, /\| `foxtrot` \| .* \| install v1: download gizmo_1\.0\.0_stm32f411\.hex \| manual setup install only, usage en \|/);
  assert.match(report.markdown, /### Manual problems \(the product is published\)\n\n- repository echo, 9_Assets\/manual\/overview\.en\.md: a level-1 heading/);

  const snapshot = JSON.parse(readFileSync(snapshotFile, 'utf8'));
  assert.equal(snapshot.manualProblems.length, 1);
  const { manualProblems: _, ...rest } = snapshot;
  const old = join(root, 'old.json');
  writeFileSync(old, JSON.stringify(rest));
  assert.throws(() => readSnapshot(old), /not a catalog snapshot .*manualProblems.* — rebuild/);
  const echo = snapshot.products.find((p) => p.slug === 'echo');
  assert.equal(echo.manual.images.length, 1);
  assert.ok(!('manualFiles' in echo), 'no image bytes in the snapshot');
  const kept = readdirSync(join(root, '.zurp-catalog', 'manual'));
  assert.deepEqual(kept, [echo.manual.images[0].sha256], 'the served bytes, named after their SHA-256, beside the snapshot');
  assert.equal(statSync(join(root, '.zurp-catalog', 'manual', kept[0])).size, echo.manual.images[0].size);
  rmSync(root, { recursive: true, force: true });
});

// 7 -------------------------------------------------------------------------------------------------
test('7. the simulator: Basilisk’s demo manual (an absent tab, a tab in .fr only, an image over 600 KB, a missing image, an H1), Cyclops’s without setup but with an install; Kaiju and Maelstrom without a manual', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  cpSync(join(ROOT, 'content'), join(root, 'content'), { recursive: true });
  cpSync(SIM, join(root, 'catalog-simulator'), { recursive: true });
  await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  const catalog = await loadBuiltCatalog({ snapshotFile: join(root, '.zurp-catalog', 'remote.json'), root });
  const by = bySlug(catalog.products);
  assert.deepEqual(manualTabs(by.basilisk).map((t) => [t.id, t.lang, t.install]), [
    ['overview', 'en', false],
    ['setup', 'fr', true],
    ['usage', 'en', false],
  ], 'no Assembly; Setup in .fr only, with the Install block');
  const source = statSync(join(SIM, 'repos', 'basilisk', by.basilisk.manual.images[0].source)).size;
  assert.ok(source > 600 * 1024, `Basilisk’s image source weighs ${source} bytes, over 600 KB`);
  assert.ok(by.basilisk.manual.images[0].size < 600 * 1024, 'served under 600 KB');
  const warnings = catalog.manualProblems.flatMap((r) => r.problems);
  assert.ok(warnings.some((w) => /^repository basilisk, 9_Assets\/manual\/usage\.en\.md: a level-1 heading/.test(w)));
  assert.ok(warnings.some((w) => /^repository basilisk, 9_Assets\/manual\/usage\.en\.md: image "images\/missing-top-view\.png" .* does not exist/.test(w)));
  assert.ok(warnings.some((w) => /^repository basilisk, 9_Assets\/manual\/usage\.en\.md: image ".*" is not under 9_Assets\//.test(w)));
  assert.ok(by.basilisk.install, 'Basilisk installs something');
  assert.deepEqual(manualTabs(by.cyclops).map((t) => [t.id, t.lang, t.install]), [
    ['overview', 'en', false],
    ['setup', null, true],
    ['usage', 'en', false],
  ], 'a Setup tab with the Install block only');
  assert.ok(by.cyclops.install);
  for (const slug of ['kaiju', 'maelstrom']) assert.equal(by[slug].manual, null, `${slug}: no manual, its page unchanged`);
  assert.ok(by.maelstrom.install, 'Maelstrom: no manual, something to install');
  rmSync(root, { recursive: true, force: true });
});

// 8 -------------------------------------------------------------------------------------------------
test('8. the guard of the pages (scripts/check-manual.mjs): tabs as the catalog says, the #install block in Setup, the texts in their language; nothing of a manual without one', () => {
  const texts = manualTexts(siteContent(ROOT));
  const distDir = mkdtempSync(join(tmpdir(), 'zurp-dist-'));
  const image = { name: '0123456789abcdef.webp', source: '9_Assets/manual/a.png', size: 3, sha256: '', width: 1, height: 1 };
  mkdirSync(join(distDir, 'gizmo', 'manual'), { recursive: true });
  writeFileSync(join(distDir, 'gizmo', 'manual', image.name), 'abc');
  image.sha256 = createHash('sha256').update('abc').digest('hex');
  const install = { tag: 'v1', publishedAt: 'x', esp: null, downloads: [], bench: null };
  const product = {
    slug: 'gizmo',
    install,
    manual: { tabs: [{ id: 'overview', lang: 'en', file: 'o', html: '' }, { id: 'usage', lang: 'fr', file: 'u', html: '' }], images: [image] },
  };
  const tabBtn = (id, i) => `<button type="button" class="manual-tab" role="tab" id="tab-${id}" aria-controls="${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${id}">${texts.tabs[id]}</button>`;
  const panel = (id, i, inner) => `<div class="manual-panel" role="tabpanel" id="${id}" aria-labelledby="tab-${id}" tabindex="0"${i ? ' hidden' : ''} data-tab-panel="${id}">${inner}</div>`;
  const installBlock = '<section class="install" id="install" data-install><h2>Install</h2></section>';
  const page = (setupInner = installBlock, after = '') =>
    `<main><section class="lead"></section><div class="manual" data-manual><div role="tablist">${['overview', 'setup', 'usage'].map(tabBtn).join('')}</div>` +
    panel('overview', 0, `<div class="manual-text" lang="en" data-manual-text><img src="/gizmo/manual/${image.name}"></div>`) +
    panel('setup', 1, setupInner) +
    panel('usage', 2, '<div class="manual-text" lang="fr" data-manual-text><p>x</p></div>') +
    `</div>${after}<section class="repo"></section></main>`;
  assert.deepEqual(manualPageProblems(page(), product, { texts, distDir }), []);
  assert.deepEqual(manualDirProblems(distDir, product), []);
  assert.match(manualPageProblems(page('', installBlock), product, { texts, distDir }).join('\n'), /the #install block is not in the Setup tab/);
  assert.match(manualPageProblems(page().replace('lang="fr"', 'lang="en"'), product, { texts, distDir }).join('\n'), /the usage text's lang is "en", expected "fr"/);
  assert.match(manualPageProblems(page().replace('<section class="lead"></section>', '<section class="description"></section>'), product, { texts, distDir }).join('\n'), /« About » section beside the Overview tab/);
  assert.match(manualPageProblems(page().replace(`/gizmo/manual/${image.name}`, '/gizmo/manual/nope.webp'), product, { texts, distDir }).join('\n'), /is not a file of dist\//);
  assert.match(manualPageProblems(page().replace('>Usage<', '>Use<'), product, { texts, distDir }).join('\n'), /the usage tab says "Use", expected "Usage"/);
  // Without a manual: nothing of one, and « About » in its place.
  const plain = { slug: 'gizmo', install, manual: null };
  const before = '<main><section class="lead"></section><section class="description"></section>' + installBlock + '<section class="repo"></section></main>';
  assert.deepEqual(manualPageProblems(before, plain, { texts, distDir }), []);
  assert.match(manualPageProblems(page(), plain, { texts, distDir }).join('\n'), /manual block \[data-manual\]\(s\), the catalog holds no manual/);
  assert.match(manualDirProblems(distDir, plain).join('\n'), /exists, the catalog holds no image/);
  rmSync(distDir, { recursive: true, force: true });
});
