// SOURCE: zurp-astronomics-site — the tests of the site: the catalog rules we wrote ourselves, and the README kit the organisation consumes
// AUTHOR: engineer
// DATE: 2026-10-06
// REVISED: 2026-10-10 (ticket #79) — one test per rule of the list the human kept, nothing else: the
//   site is a showcase the human looks at on every deployment; only what breaks invisibly is tested.
// STATUS: active
//
// Run with `npm test` (needs `npm ci`). A case the simulator does not hold is built in a temporary
// simulator (makeSim); a temporary site root (tempRoot) when the build's snapshot is needed: the
// loader empties .zurp-catalog/ of its root, never the repository's.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { catalogSource, githubBackend, simulatorBackend } from '../src/lib/catalog/source.mjs';
import { readRepoProducts } from '../src/lib/catalog/read.mjs';
import { readLocalProducts } from '../src/lib/catalog/local.mjs';
import { readAndSnapshot } from '../src/lib/catalog/loader.mjs';
import { catalogContent, licenseContent, siteContent } from '../src/lib/content.mjs';
import { licenseStamps } from '../src/lib/license-stamp.mjs';
import { loadBuiltCatalog } from '../scripts/lib/catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIM = join(ROOT, 'catalog-simulator');
const sectionIds = catalogContent(ROOT).sections.map((s) => s.id);
const SIMULATOR = { ZURP_CATALOG: 'simulator' };

const VALID_SHEET = `name: Gizmo
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
const gizmo = (sheet = VALID_SHEET, extra = {}) => ({ '9_Assets/zurp.yml': sheet, '9_Assets/poster.png': PNG, ...extra });

/** A temporary simulator: repos { name: { path: content } }, releases { name: [...] }, licenses { name: license }. */
function makeSim(repos, { releases = {}, licenses = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'zurp-sim-'));
  const write = (path, content) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  };
  for (const [name, files] of Object.entries(repos)) {
    mkdirSync(join(dir, 'repos', name), { recursive: true });
    for (const [path, content] of Object.entries(files)) write(join(dir, 'repos', name, path), content);
  }
  for (const [name, list] of Object.entries(releases)) write(join(dir, 'releases', `${name}.json`), JSON.stringify(list));
  for (const [name, license] of Object.entries(licenses)) write(join(dir, 'licenses', `${name}.json`), JSON.stringify(license));
  return dir;
}
const readSim = (dir) => readRepoProducts(simulatorBackend(dir), { sectionIds });

/** A temporary site root: a copy of content/ and of the simulator, which `edit(simDir)` may change. */
function tempRoot(edit = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  cpSync(join(ROOT, 'content'), join(root, 'content'), { recursive: true });
  cpSync(SIM, join(root, 'catalog-simulator'), { recursive: true });
  edit(join(root, 'catalog-simulator'));
  return root;
}

/** The build's snapshot of a temporary root, and the catalog the scripts after the build assemble from it. */
async function built(root) {
  await readAndSnapshot({ root, env: SIMULATOR, sectionIds });
  const snapshotFile = join(root, '.zurp-catalog', 'remote.json');
  return { snapshotFile, ...(await loadBuiltCatalog({ snapshotFile, root })) };
}

// 1 -------------------------------------------------------------------------------------------------
test('1. the build fails without a named catalog source; `simulator` is refused on GitHub Actions', async () => {
  assert.throws(() => catalogSource({}), /no source named/);
  await assert.rejects(readAndSnapshot({ root: tempRoot(), env: {}, sectionIds }), /no source named/);
  const onActions = { ZURP_CATALOG: 'simulator', GITHUB_SERVER_URL: 'https://github.com' };
  assert.throws(() => catalogSource(onActions), /refused on GitHub Actions/);
  await assert.rejects(readAndSnapshot({ root: tempRoot(), env: onActions, sectionIds }), /refused on GitHub Actions/);
  assert.equal(catalogSource({ ZURP_CATALOG: 'github', GITHUB_SERVER_URL: 'https://github.com' }), 'github');
});

// 2 -------------------------------------------------------------------------------------------------
test('2. an invalid repository sheet or an unreadable poster skips that product, the others are read; an invalid sheet of content/products/ fails the build', async () => {
  const sim = makeSim({
    alpha: gizmo(VALID_SHEET.replace('name: Gizmo\n', '')),
    bravo: { ...gizmo(), '9_Assets/poster.png': 'not an image' },
    charlie: gizmo(),
  });
  const { products, skipped } = await readSim(sim);
  assert.deepEqual(products.map((p) => p.slug), ['charlie']);
  assert.deepEqual(skipped.map((s) => s.repo), ['alpha', 'bravo']);
  assert.match(skipped[0].problems.join('\n'), /repository alpha .*field `name`: missing/);
  assert.match(skipped[1].problems.join('\n'), /repository bravo .*field `poster`/);

  const root = tempRoot();
  const sheet = join(root, 'content', 'products', 'cyclops', 'zurp.yml');
  writeFileSync(sheet, readFileSync(sheet, 'utf8').replace(/^name:.*\n/m, ''));
  await assert.rejects(readLocalProducts({ root, sectionIds, repositories: [] }), /content\/products\/cyclops\/zurp\.yml: field `name`: missing/);
  await assert.rejects(built(root), /field `name`: missing/);
});

// 3 -------------------------------------------------------------------------------------------------
test('3. a repository without 9_Assets/zurp.yml is not in the catalog, without an error', async () => {
  const sim = makeSim({ '.github': { 'profile/README.md': '# org\n' }, docs: { 'README.md': '# docs\n', '9_Assets/notes.txt': 'x' }, charlie: gizmo() });
  const { products, skipped } = await readSim(sim);
  assert.deepEqual(products.map((p) => p.slug), ['charlie']);
  assert.deepEqual(skipped, []);
});

// 4 -------------------------------------------------------------------------------------------------
test('4. a slug both in a repository and in content/products/: the repository wins', async () => {
  const root = tempRoot((sim) => {
    for (const [path, content] of Object.entries(gizmo())) {
      mkdirSync(dirname(join(sim, 'repos', 'cyclops', path)), { recursive: true });
      writeFileSync(join(sim, 'repos', 'cyclops', path), content);
    }
  });
  const { products, overridden } = await built(root);
  const cyclops = products.filter((p) => p.slug === 'cyclops');
  assert.equal(cyclops.length, 1);
  assert.equal(cyclops[0].name, 'Gizmo', "the repository's sheet");
  assert.equal(cyclops[0].repo, 'https://github.com/zUrp-Astronomics/cyclops');
  assert.deepEqual(overridden.map((o) => o.slug), ['cyclops']);
});

// 5 -------------------------------------------------------------------------------------------------
test('5. the status is the sheet’s, the version is the tag of the latest release; an unknown status skips the product', async () => {
  const sheet = (status) => VALID_SHEET.replace('status: wip', `status: ${status}`);
  const rel = (tag, at, more = {}) => ({ tag_name: tag, published_at: at, draft: false, prerelease: false, ...more });
  const sim = makeSim(
    { alpha: gizmo(sheet('released')), bravo: gizmo(sheet('wip')), charlie: gizmo(sheet('future')), delta: gizmo(sheet('beta')) },
    {
      releases: {
        bravo: [rel('v1.0', '2026-09-01T00:00:00Z'), rel('v2.0-rc1', '2026-10-01T00:00:00Z', { prerelease: true }), rel('v3', null, { draft: true })],
        delta: [rel('v1.0', '2026-09-01T00:00:00Z')],
      },
    },
  );
  const { products, skipped } = await readSim(sim);
  const by = Object.fromEntries(products.map((p) => [p.slug, p]));
  assert.deepEqual([by.alpha.status, by.alpha.release], ['released', null], 'released by its sheet, without any release');
  assert.deepEqual([by.bravo.status, by.bravo.release?.tag], ['wip', 'v2.0-rc1'], 'a release does not change the status');
  assert.equal(by.charlie.status, 'future');
  assert.deepEqual(skipped.map((s) => s.repo), ['delta']);
  assert.match(skipped[0].problems.join('\n'), /field `status`: "beta" is not one of/);
});

// 6 -------------------------------------------------------------------------------------------------
test('6. licences: a recognised spdx_id gives its stamp, NOASSERTION the generic one, null none; the hardware licence is the first line of LICENSE-HARDWARE, none without the file', async () => {
  const texts = licenseContent(ROOT);
  const sim = makeSim(
    {
      alpha: gizmo(VALID_SHEET, { 'LICENSE-HARDWARE': '\n  Open Community License (OCL v1.1)\n\nThe text of the licence.\n' }),
      bravo: gizmo(),
      charlie: gizmo(),
    },
    {
      licenses: {
        alpha: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0', url: null, node_id: 'n' },
        bravo: { key: 'other', name: 'Other', spdx_id: 'NOASSERTION', url: null, node_id: 'o' },
        charlie: null,
      },
    },
  );
  const { products } = await readSim(sim);
  const stamps = Object.fromEntries(products.map((p) => [p.slug, { p, ...licenseStamps(p, texts) }]));
  assert.equal(stamps.alpha.software.text, 'Software · GPL-3.0');
  assert.equal(stamps.bravo.software.label, texts.software.unrecognised);
  assert.equal(stamps.charlie.p.license, null);
  assert.equal(stamps.charlie.software, null);
  assert.deepEqual(stamps.alpha.p.hardwareLicense, { title: 'Open Community License (OCL v1.1)' });
  assert.equal(stamps.alpha.hardware.text, 'Hardware · OCL v1.1');
  assert.equal(stamps.bravo.p.hardwareLicense, null, 'no LICENSE-HARDWARE: no hardware licence');
  assert.equal(stamps.bravo.hardware, null);
});

// 7 -------------------------------------------------------------------------------------------------
test('7. a local product without a repository (Cyclops, Wraith): its « Source » link is the organisation', async () => {
  const orgUrl = siteContent(ROOT).org.url.replace(/\/+$/, '');
  const repositories = await simulatorBackend(SIM).listRepos();
  const products = await readLocalProducts({ root: ROOT, sectionIds, repositories });
  assert.deepEqual(products.map((p) => p.slug), ['cyclops', 'wraith']);
  for (const p of products) {
    assert.equal(p.repo, orgUrl, p.slug);
    assert.equal(p.license, null, p.slug);
  }
});

// 8 -------------------------------------------------------------------------------------------------
/** A fetch answering like api.github.com for `repos` and `files` ({ 'Repo/path': bytes }); 404 elsewhere; `fail` answers `status` to URLs holding `match`. */
function mockGitHub({ repos, files, fail }) {
  return async (url) => {
    if (fail && url.includes(fail.match)) return new Response('boom', { status: fail.status });
    const path = new URL(url).pathname;
    if (path === '/orgs/zUrp-Astronomics/repos') {
      return Response.json(repos.map((name) => ({ name, html_url: `https://github.com/zUrp-Astronomics/${name}`, license: null })));
    }
    const m = path.match(/^\/repos\/zUrp-Astronomics\/([^/]+)\/(contents\/(.+)|releases)$/);
    if (m?.[2] === 'releases') return Response.json([]);
    const key = m && `${decodeURIComponent(m[1])}/${decodeURIComponent(m[3])}`;
    return key in files ? new Response(files[key]) : new Response('{"message":"Not Found"}', { status: 404 });
  };
}

test('8. GitHub: a failed request fails the build, except the 404 of a sheet, a poster or LICENSE-HARDWARE', async () => {
  const repos = ['Alpha', 'Bravo', 'Charlie'];
  const files = { 'Bravo/9_Assets/zurp.yml': VALID_SHEET, 'Charlie/9_Assets/zurp.yml': VALID_SHEET, 'Charlie/9_Assets/poster.png': PNG };
  const read = (fail) => readRepoProducts(githubBackend({ fetchImpl: mockGitHub({ repos, files, fail }) }), { sectionIds });
  // Alpha: no sheet (404); Bravo: no poster (404), skipped; Charlie: no LICENSE-HARDWARE (404).
  const { products, skipped } = await read();
  assert.deepEqual(products.map((p) => [p.slug, p.hardwareLicense]), [['charlie', null]]);
  assert.deepEqual(skipped.map((s) => s.repo), ['Bravo']);
  for (const fail of [
    { match: '/orgs/', status: 502 },
    { match: 'Charlie/contents/9_Assets/zurp.yml', status: 500 },
    { match: 'Charlie/contents/9_Assets/poster.png', status: 403 },
    { match: 'Charlie/contents/LICENSE-HARDWARE', status: 500 },
    { match: 'Charlie/releases', status: 502 },
  ]) {
    await assert.rejects(read(fail), new RegExp(`HTTP ${fail.status}`), fail.match);
  }
  const offline = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(readRepoProducts(githubBackend({ fetchImpl: offline }), { sectionIds }), /fetch failed/);
});

// 9 -------------------------------------------------------------------------------------------------
test('9. the README kit is generated from the built catalog: one header per product, no Mustache marker left empty', async () => {
  const root = tempRoot();
  const { snapshotFile, products } = await built(root);
  const out = join(root, 'kit');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'readme-kit.mjs'), '--catalog', snapshotFile, '--out', out], { stdio: 'pipe' });
  const headers = readdirSync(join(out, 'readme-kit', 'repos')).sort();
  assert.deepEqual(headers, products.map((p) => `${p.slug}.md`).sort(), 'one header per product of the built catalog');
  const files = ['profile/README.md', 'readme-kit/README.md', ...headers.map((h) => `readme-kit/repos/${h}`)];
  for (const f of files) {
    const text = readFileSync(join(out, f), 'utf8');
    assert.doesNotMatch(text, /\{\{|\}\}/, `${f}: a marker left as is`);
    assert.doesNotMatch(text, /="\s*"|\]\(\s*\)|!\[\s*\]|<a href="[^"]+">\s*<\/a>|<!--\s*—/, `${f}: a marker filled with nothing`);
  }
  for (const p of products) {
    const header = readFileSync(join(out, 'readme-kit', 'repos', `${p.slug}.md`), 'utf8');
    assert.ok(header.includes(`/brand/posters/${p.slug}.webp`) && header.includes(`/brand/badges/${p.slug}/hardware.svg`), p.slug);
  }
  const org = readFileSync(join(out, 'profile', 'README.md'), 'utf8');
  for (const p of products) assert.ok(org.includes(`>${p.name}</a>`), `${p.name} in the organisation README`);
});
