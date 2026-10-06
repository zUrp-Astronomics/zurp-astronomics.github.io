// SOURCE: zurp-astronomics-site — tests of the catalog reader: explicit source, simulator, GitHub backend (mocked), sheet validation, releases, order, one place per product, published guard, snapshot, README kit
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — run by `npm test` (CLAUDE.md `## Test`, job `build` of .gitea/workflows/ci.yml)
// REVISED: 2026-10-06 (ticket #49) — the local products are content/products/ (test/content.test.mjs tests them); sections from content/catalog.yml
// REVISED: 2026-10-06 (ticket #53) — the basilisk header points to its status JSON, which carries the release tag (was: a static status badge)
// REVISED: 2026-10-06 (ticket #61) — the simulator holds maelstrom and unicorn too, byte copies of their workshop kits;
//   the assembly fixtures follow (LOCAL: content/products/, REMOTE: the simulator), checked against both
// REVISED: 2026-10-06 (ticket #62) — the status is the sheet's, never deduced from a release: `released`
//   accepted in a sheet; a release gives the tag and the rank, the status stays the sheet's
// REVISED: 2026-10-06 (ticket #66) — the licence is the repository's LICENSE as GitHub detects it: read
//   from the list of repositories (simulator and mocked GitHub), snapshotted, given to the products of
//   content/products/ by their repository's name (case ignored), stamped or not
//
// The cases that do not exist in the organisation (a release, a prerelease, two releases, an invalid
// sheet, a slug twice, a published product gone) are built here, in temporary simulators and a
// mocked GitHub: no fictitious product ever enters a deployable build. The README kit test needs
// `npm ci`, like the build.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalogSource, githubBackend, repoLicense, simulatorBackend } from '../src/lib/catalog/source.mjs';
import { latestRelease, readRepoProducts, sheetProblems } from '../src/lib/catalog/read.mjs';
import { licenseOf, readLocalProducts } from '../src/lib/catalog/local.mjs';
import { assembleCatalog } from '../src/lib/catalog/assemble.mjs';
import { readAndSnapshot } from '../src/lib/catalog/loader.mjs';
import { catalogContent, siteContent } from '../src/lib/content.mjs';
import { licenseStamp } from '../src/lib/license-stamp.mjs';
import { publishedSlugs } from '../src/data/published-slugs.mjs';
import { statusBadge, statusBadgeJson } from '../src/lib/status-badge.mjs';
import { loadBuiltCatalog } from '../scripts/lib/catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIM = join(ROOT, 'catalog-simulator');
const { sections, statuses } = catalogContent(ROOT);
const sectionIds = sections.map((s) => s.id);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// Basilisk as src/data/products.ts held it on main before this ticket (8dd6440), word for word.
const BASILISK_ON_MAIN = {
  slug: 'basilisk',
  name: 'Basilisk',
  tagline:
    'Sleek but deadly Sony E adapter for astro cameras, bending glass to your will without leaving the warm room.',
  slogan: 'Bend the glass to your will',
  category: 'Adapter',
  section: 'gadgets',
  repo: 'https://github.com/zUrp-Astronomics/basilisk',
  status: 'wip',
  basedOn: 'Pinefeat',
  description: [
    'Basilisk is a Sony E adapter for astro cameras: put a Sony E lens on your astro camera and drive it remotely. The glass bends to your will, and you never leave the warm room.',
    'Based on the Pinefeat project, with the zUrp treatment. Open hardware like the rest of the catalog.',
  ],
  posterAlt:
    'Basilisk poster on a worn, chipped cream plate: a mechanical serpent with segmented steel coils and green crystal spines, a glowing green eye and a forked tongue, rears with fangs bared in front of the full moon, green rays and blueprint sketches of its head, above the slogan “Bend the glass to your will”.',
  accent: '#05b40e',
};

const VALID_SHEET = `name: Gizmo
tagline: A gizmo.
slogan: Gizmo all the things
category: Gadget
section: gadgets
status: wip
description:
  - First paragraph.
  - Second paragraph.
poster: poster.png
posterAlt: Gizmo poster.
accent: '#123456'
`;
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

/** A temporary simulator: { repoName: { 'path': content } }, releases: { repoName: [...] }, licenses: { repoName: license }. */
function makeSim(repos, releases = {}, licenses = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'zurp-sim-'));
  for (const [name, files] of Object.entries(repos)) {
    mkdirSync(join(dir, 'repos', name), { recursive: true });
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, 'repos', name, path)), { recursive: true });
      writeFileSync(join(dir, 'repos', name, path), content);
    }
  }
  mkdirSync(join(dir, 'releases'), { recursive: true });
  for (const [name, list] of Object.entries(releases)) writeFileSync(join(dir, 'releases', `${name}.json`), JSON.stringify(list));
  mkdirSync(join(dir, 'licenses'), { recursive: true });
  for (const [name, license] of Object.entries(licenses)) writeFileSync(join(dir, 'licenses', `${name}.json`), JSON.stringify(license));
  return dir;
}
const gizmo = (sheet = VALID_SHEET) => ({ '9_Assets/zurp.yml': sheet, '9_Assets/poster.png': PNG });
const read = (dir) => readRepoProducts(simulatorBackend(dir), { sectionIds });

// --- The source is always named ---------------------------------------------------------------

test('no source: the build fails, and the message gives both choices', () => {
  assert.throws(() => catalogSource({}), (e) => /ZURP_CATALOG=simulator/.test(e.message) && /ZURP_CATALOG=github/.test(e.message));
  assert.throws(() => catalogSource({ ZURP_CATALOG: '  ' }), /no source named/);
});

test('unknown source is refused', () => {
  assert.throws(() => catalogSource({ ZURP_CATALOG: 'local' }), /unknown source/);
});

test('the simulator is refused on GitHub Actions (where the site is deployed), accepted elsewhere', () => {
  assert.throws(() => catalogSource({ ZURP_CATALOG: 'simulator', GITHUB_SERVER_URL: 'https://github.com' }), /refused on GitHub Actions/);
  assert.equal(catalogSource({ ZURP_CATALOG: 'simulator', GITHUB_SERVER_URL: 'http://host.docker.internal:10010' }), 'simulator');
  assert.equal(catalogSource({ ZURP_CATALOG: 'simulator' }), 'simulator');
  assert.equal(catalogSource({ ZURP_CATALOG: 'github', GITHUB_SERVER_URL: 'https://github.com' }), 'github');
});

// --- The simulator of this repository ---------------------------------------------------------

test('simulator: basilisk files are the workshop kit, byte for byte', () => {
  const dir = join(SIM, 'repos', 'basilisk', '9_Assets');
  assert.equal(sha256(readFileSync(join(dir, 'zurp.yml'))), '2f3fa126e6fda0f4053c83409536689304693d259fa73a54afb5bf03724a1f0a');
  assert.equal(sha256(readFileSync(join(dir, 'poster.png'))), '862f6098ae43efc59eb376accf1575240ef5848ad6b761f1b118ed2e4764dca5');
  assert.equal(existsSync(join(SIM, 'releases', 'basilisk.json')), false, 'basilisk has no release');
});

// Ticket #61: maelstrom's kit is byte for byte its former content/products/maelstrom/ (main 47d9bb2);
// unicorn's is that sheet with the human's 2.7 poster (poster, posterAlt, accent, comments changed).
const KITS = {
  maelstrom: {
    'zurp.yml': '9a773b9df864d497b4b89fb873bbe407c40918726b0b5e2185d67b6a17b134a1',
    'maelstrom.webp': '8c3cad6d6430d4650e41ca85529dcc3fe28023bc5b248373fda67a8ddf130ce2',
  },
  unicorn: {
    'zurp.yml': '1347d0b12c305addf313e983fce6e1890e8e9ee4ddf4d3c5dff3b860fa442a04',
    'unicorn.png': '4abf22ce2805aaecafb1b69d1cbbcfddb51e950464343210324e93392c3380d8',
  },
};

test('simulator: maelstrom and unicorn files are their workshop kits, byte for byte, in lower-case folders, no release', () => {
  for (const [slug, files] of Object.entries(KITS)) {
    const dir = join(SIM, 'repos', slug, '9_Assets');
    assert.deepEqual(readdirSync(dir).sort(), Object.keys(files).sort(), slug);
    for (const [name, hash] of Object.entries(files)) assert.equal(sha256(readFileSync(join(dir, name))), hash, `${slug}/${name}`);
    assert.equal(existsSync(join(SIM, 'releases', `${slug}.json`)), false, `${slug} has no release`);
  }
});

test('simulator: basilisk reads exactly as products.ts held it on main, no release; its licence is GitHub’s « Other »', async () => {
  const products = await read(SIM);
  assert.deepEqual(products.map((p) => p.slug).sort(), ['basilisk', 'maelstrom', 'unicorn']);
  for (const p of products) {
    assert.equal(p.origin, `repository ${p.slug}`);
    assert.equal(p.repo, `https://github.com/zUrp-Astronomics/${p.slug}`);
    assert.equal(p.release, null);
  }
  const { posterBytes, posterFile, posterPath, origin, release, license, ...fields } = products.find((p) => p.slug === 'basilisk');
  assert.deepEqual(fields, BASILISK_ON_MAIN);
  // Ticket #66: its LICENSE (OCL v1.1, plus a LICENSE-MIT) is not recognised by GitHub.
  assert.deepEqual(license, { spdx_id: 'NOASSERTION', name: 'Other' });
  assert.equal(posterPath, 'poster.png', 'the poster as the sheet names it');
  assert.equal(release, null);
  assert.equal(posterFile, 'basilisk.png', 'the local poster is named after the slug, not after the sheet');
  assert.equal(origin, 'repository basilisk');
  assert.deepEqual(posterBytes, readFileSync(join(SIM, 'repos', 'basilisk', '9_Assets', 'poster.png')));
});

// --- Reading and validating sheets -------------------------------------------------------------

test('a repository without 9_Assets/zurp.yml is not in the catalog; slug = repository name in lower case', async () => {
  const dir = makeSim({ '.github': { 'profile/README.md': '# org' }, 'zurp-site': { 'README.md': 'x' }, Kraken: gizmo() });
  const products = await read(dir);
  assert.deepEqual(products.map((p) => [p.slug, p.repo]), [['kraken', 'https://github.com/zUrp-Astronomics/Kraken']]);
  assert.equal(products[0].posterFile, 'kraken.png');
});

test('only 9_Assets/ is read: a sheet elsewhere is ignored', async () => {
  const dir = makeSim({ gizmo: { 'zurp.yml': VALID_SHEET, 'docs/zurp.yml': VALID_SHEET, '9_Assets/poster.png': PNG } });
  assert.deepEqual(await read(dir), []);
});

test('invalid sheets fail with the repository and the field named, all problems at once', async () => {
  const dir = makeSim({
    alpha: gizmo(VALID_SHEET.replace('name: Gizmo\n', '')),
    bravo: gizmo(VALID_SHEET.replace('section: gadgets', 'section: telescopes')),
    charlie: { '9_Assets/zurp.yml': VALID_SHEET },
    delta: gizmo(VALID_SHEET.replace('status: wip', 'status: shipped')),
    echo: gizmo(VALID_SHEET + 'slug: other\norder: 3\nbasedon: typo\n'),
    foxtrot: gizmo('name: [unclosed\n'),
    golf: gizmo(VALID_SHEET.replace("accent: '#123456'", 'accent: red').replace('poster: poster.png', 'poster: ../poster.png')),
  });
  await assert.rejects(read(dir), (e) => {
    const m = e.message;
    const expect = [
      /repository alpha \(9_Assets\/zurp\.yml\): field `name`: missing/,
      /repository bravo .*field `section`: unknown section "telescopes"/,
      /repository charlie .*field `poster`: 9_Assets\/poster\.png does not exist/,
      /repository delta .*field `status`: "shipped" is not one of: wip, future, released/,
      /repository echo .*field `slug`: not allowed/,
      /repository echo .*field `order`: not allowed/,
      /repository echo .*field `basedon`: unknown field/,
      /repository foxtrot .*not valid YAML/,
      /repository golf .*field `accent`/,
      /repository golf .*field `poster`: "\.\.\/poster\.png" must be a path inside 9_Assets/,
    ];
    for (const re of expect) assert.match(m, re);
    return true;
  });
});

test('sheetProblems: a valid sheet has none; description must be a list of texts', () => {
  const ok = { name: 'a', tagline: 'b', slogan: 'c', category: 'd', section: 'mounts', status: 'future', description: ['e'], poster: 'p.webp', posterAlt: 'f', accent: '#AbCdEf', basedOn: 'g' };
  assert.deepEqual(sheetProblems(ok, sectionIds), []);
  assert.match(sheetProblems({ ...ok, description: 'e' }, sectionIds).join('\n'), /field `description`/);
  assert.match(sheetProblems({ ...ok, poster: 'p.svg' }, sectionIds).join('\n'), /field `poster`: "p\.svg" is not a PNG/);
  assert.match(sheetProblems(['x'], sectionIds).join('\n'), /not a YAML mapping/);
});

test('sheetProblems: the status is written in the sheet — wip, future, released accepted; anything else refused', () => {
  const ok = { name: 'a', tagline: 'b', slogan: 'c', category: 'd', section: 'mounts', description: ['e'], poster: 'p.webp', posterAlt: 'f', accent: '#AbCdEf' };
  for (const status of ['wip', 'future', 'released']) assert.deepEqual(sheetProblems({ ...ok, status }, sectionIds), [], status);
  for (const status of ['Released', 'beta', '', null, 1]) {
    assert.match(sheetProblems({ ...ok, status }, sectionIds).join('\n'), /field `status`: .* is not one of: wip, future, released/, String(status));
  }
  assert.match(sheetProblems(ok, sectionIds).join('\n'), /field `status`: missing/);
});

// --- Releases ----------------------------------------------------------------------------------

// Ticket #62 (the human: « repo public != projet releasé »): a release gives the version, the rank and
// a rebuild; the status is always the sheet's.

test('one release: the status of the sheet unchanged, its tag as is, its published_at', async () => {
  const dir = makeSim({ gizmo: gizmo() }, { gizmo: [{ tag_name: 'v0.1-α', published_at: '2026-09-01T10:00:00Z', draft: false, prerelease: false }] });
  const [p] = await read(dir);
  assert.equal(p.status, 'wip');
  assert.deepEqual(p.release, { tag: 'v0.1-α', publishedAt: '2026-09-01T10:00:00.000Z' });
});

test('a sheet `released` without any release: released, no version', async () => {
  const dir = makeSim({ gizmo: gizmo(VALID_SHEET.replace('status: wip', 'status: released')) });
  const [p] = await read(dir);
  assert.equal(p.status, 'released');
  assert.equal(p.release, null);
  const json = statusBadge(p, catalogContent(ROOT));
  assert.equal(json.message, statuses.released.label);
  assert.equal(json.color, statuses.released.badgeColor);
});

test('a sheet `wip` with a release: wip, version = the tag, status JSON « WIP » plus the tag', async () => {
  const dir = makeSim({ gizmo: gizmo() }, { gizmo: [{ tag_name: 'v0.3', published_at: '2026-09-03T00:00:00Z', draft: false, prerelease: false }] });
  const [p] = await read(dir);
  assert.equal(p.status, 'wip');
  assert.equal(p.release.tag, 'v0.3');
  const json = statusBadge(p, catalogContent(ROOT));
  assert.equal(json.message, `${statuses.wip.label} · v0.3`);
  assert.equal(json.color, statuses.wip.badgeColor);
});

test('a sheet `future` with a prerelease: future, plus the tag (no analysis of name, tag or pre-release box)', async () => {
  const dir = makeSim({ gizmo: gizmo(VALID_SHEET.replace('status: wip', 'status: future')) }, {
    gizmo: [{ tag_name: 'nightly', name: 'DO NOT USE', published_at: '2026-09-02T00:00:00Z', draft: false, prerelease: true }],
  });
  const [p] = await read(dir);
  assert.equal(p.status, 'future');
  assert.equal(p.release.tag, 'nightly');
  const json = statusBadge(p, catalogContent(ROOT));
  assert.equal(json.message, `${statuses.future.label} · nightly`);
  assert.equal(json.color, statuses.future.badgeColor);
});

test('an unknown status is refused, release or not', async () => {
  const dir = makeSim({ gizmo: gizmo(VALID_SHEET.replace('status: wip', 'status: beta')) }, {
    gizmo: [{ tag_name: 'v1', published_at: '2026-09-02T00:00:00Z', draft: false }],
  });
  await assert.rejects(read(dir), /repository gizmo .*field `status`: "beta" is not one of: wip, future, released/);
});

test('two releases: the latest by published_at, whatever the list order; drafts are not on the Releases page', async () => {
  const releases = [
    { tag_name: 'draft-next', published_at: null, draft: true },
    { tag_name: 'v1', published_at: '2026-08-01T00:00:00Z', draft: false },
    { tag_name: 'v2', published_at: '2026-09-15T08:30:00Z', draft: false, prerelease: true },
    { tag_name: 'v1.1', published_at: '2026-08-20T00:00:00Z', draft: false },
  ];
  assert.deepEqual(latestRelease(releases), { tag: 'v2', publishedAt: '2026-09-15T08:30:00.000Z' });
  assert.equal(latestRelease([{ tag_name: 'd', published_at: null, draft: true }]), null);
  assert.equal(latestRelease([]), null);
});

// --- Assembly: one place, published guard, order ----------------------------------------------

// The products of content/products/ (slug, name, section), as the catalog sees them.
const LOCAL = [
  ['kaiju', 'Kaiju', 'mounts'],
  ['berserker', 'Berserker', 'mounts'],
  ['kraken', 'Kraken', 'gadgets'],
  ['cyclops', 'Cyclops', 'cameras'],
  ['wraith', 'Wraith', 'future'],
].map(([slug, name, section]) => ({ slug, name, section, release: null, origin: `content/products/${slug}/` }));
// The products of the simulator's repositories (catalog-simulator/repos/), as the catalog sees them.
const REMOTE = [
  ['basilisk', 'Basilisk', 'gadgets'],
  ['maelstrom', 'Maelstrom', 'cameras'],
  ['unicorn', 'Unicorn', 'gadgets'],
].map(([slug, name, section]) => ({ slug, name, section, release: null, origin: `repository ${slug}` }));
const basilisk = REMOTE[0];

test('the fixtures above are the products of content/products/ and of the simulator', async () => {
  const strip = ({ slug, name, section, release, origin }) => ({ slug, name, section, release, origin });
  const bySlug = (a, b) => a.slug.localeCompare(b.slug);
  const local = await readLocalProducts({ root: ROOT, sectionIds, repositories: [] });
  assert.deepEqual(local.map(strip).sort(bySlug), [...LOCAL].sort(bySlug));
  assert.deepEqual((await read(SIM)).map(strip).sort(bySlug), [...REMOTE].sort(bySlug));
});

test('order with no release anywhere: alphabetical inside each section (the expected rendering)', () => {
  const { products, unguarded } = assembleCatalog({ local: LOCAL, remote: REMOTE, published: publishedSlugs, sections });
  assert.deepEqual(
    products.map((p) => p.name),
    ['Berserker', 'Kaiju', 'Cyclops', 'Maelstrom', 'Basilisk', 'Kraken', 'Unicorn', 'Wraith'],
  );
  assert.deepEqual(unguarded, []);
});

test('order: latest release on top, then the others by name; sections keep their fixed order', () => {
  const r = (slug, name, section, at) => ({ slug, name, section, release: at ? { tag: 't', publishedAt: at } : null });
  const { products } = assembleCatalog({
    local: [],
    remote: [
      r('zed', 'Zed', 'gadgets', '2026-01-01T00:00:00Z'),
      r('amp', 'Amp', 'gadgets', null),
      r('yak', 'Yak', 'gadgets', '2026-06-01T00:00:00Z'),
      r('bee', 'Bee', 'gadgets', null),
      r('mnt', 'Mnt', 'mounts', null),
      r('fut', 'Fut', 'future', '2026-09-01T00:00:00Z'),
    ],
    published: [],
    sections,
  });
  assert.deepEqual(products.map((p) => p.slug), ['mnt', 'yak', 'zed', 'amp', 'bee', 'fut']);
});

test('a slug in content/products/ and in a repository fails the build', () => {
  const local = { slug: 'basilisk', name: 'Basilisk', section: 'gadgets', release: null, origin: 'content/products/basilisk/' };
  assert.throws(
    () => assembleCatalog({ local: [...LOCAL, local], remote: REMOTE, published: publishedSlugs, sections }),
    /slug `basilisk` is defined twice: in content\/products\/basilisk\/ and in repository basilisk/,
  );
  assert.throws(
    () => assembleCatalog({ local: [...LOCAL, { ...local, origin: undefined }], remote: REMOTE, published: publishedSlugs, sections }),
    /in content\/products\/ and in repository basilisk — a product lives in one place \(move its folder out of content\/products\//,
  );
});

test('a published product missing from the catalog fails the build (sheet not pushed, repository renamed)', () => {
  assert.throws(
    () => assembleCatalog({ local: LOCAL, remote: REMOTE.filter((p) => p !== basilisk), published: publishedSlugs, sections }),
    /published product\(s\) missing from the catalog: basilisk\./,
  );
});

test('a new product not on the published list is built, and reported as unguarded', () => {
  const { products, unguarded } = assembleCatalog({ local: LOCAL, remote: [...REMOTE, { slug: 'gizmo', name: 'Gizmo', section: 'gadgets', release: null }], published: publishedSlugs, sections });
  assert.ok(products.some((p) => p.slug === 'gizmo'));
  assert.deepEqual(unguarded, ['gizmo']);
});

test('the published list holds every product published before this ticket', () => {
  assert.deepEqual([...publishedSlugs].sort(), ['basilisk', 'berserker', 'cyclops', 'kaiju', 'kraken', 'maelstrom', 'unicorn', 'wraith']);
});

// --- GitHub backend (mocked fetch) -------------------------------------------------------------

function mockGitHub({ repos, files = {}, releases = {}, licenses = {}, failOn } = {}) {
  const calls = [];
  const fetchImpl = async (url, { headers }) => {
    calls.push({ url, headers });
    const u = new URL(url);
    const json = (body, extra = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...extra } });
    if (failOn && url.includes(failOn.match)) return new Response(failOn.body ?? 'boom', { status: failOn.status, headers: failOn.headers ?? {} });
    let m;
    if ((m = u.pathname.match(/^\/orgs\/zUrp-Astronomics\/repos$/))) {
      const page = Number(u.searchParams.get('page') ?? '1');
      const per = 2;
      // A repository object of the list carries `license` (null without a LICENSE), as GitHub's does.
      const slice = repos
        .slice((page - 1) * per, page * per)
        .map((name) => ({ name, html_url: `https://github.com/zUrp-Astronomics/${name}`, license: licenses[name] ?? null }));
      const next = page * per < repos.length ? { link: `<https://api.github.com/orgs/zUrp-Astronomics/repos?type=public&per_page=100&page=${page + 1}>; rel="next"` } : {};
      return json(slice, next);
    }
    if ((m = u.pathname.match(/^\/repos\/zUrp-Astronomics\/([^/]+)\/contents\/(.+)$/))) {
      const key = `${decodeURIComponent(m[1])}/${decodeURIComponent(m[2])}`;
      return key in files ? new Response(files[key], { status: 200 }) : new Response('{"message":"Not Found"}', { status: 404 });
    }
    if ((m = u.pathname.match(/^\/repos\/zUrp-Astronomics\/([^/]+)\/releases$/))) return json(releases[decodeURIComponent(m[1])] ?? []);
    return new Response('unexpected', { status: 500 });
  };
  return { fetchImpl, calls };
}

test('GitHub: public repositories (paginated), sheet and poster through the contents API with the token, releases listed (not /latest)', async () => {
  const { fetchImpl, calls } = mockGitHub({
    repos: ['.github', 'Basilisk', 'zurp-astronomics.github.io'],
    files: {
      'Basilisk/9_Assets/zurp.yml': readFileSync(join(SIM, 'repos', 'basilisk', '9_Assets', 'zurp.yml')),
      'Basilisk/9_Assets/poster.png': PNG,
    },
    releases: {
      Basilisk: [
        { tag_name: 'v1.0.0', published_at: '2026-10-01T12:00:00Z', draft: false, prerelease: false },
        { tag_name: 'v1.1.0-rc1', published_at: '2026-10-05T12:00:00Z', draft: false, prerelease: true },
      ],
    },
  });
  const backend = githubBackend({ token: 'tkn', fetchImpl });
  const products = await readRepoProducts(backend, { sectionIds });
  assert.equal(products.length, 1);
  const p = products[0];
  assert.equal(p.slug, 'basilisk');
  assert.equal(p.repo, 'https://github.com/zUrp-Astronomics/Basilisk');
  assert.equal(p.status, 'wip', 'the status of the sheet, releases or not');
  assert.deepEqual(p.release, { tag: 'v1.1.0-rc1', publishedAt: '2026-10-05T12:00:00.000Z' });
  assert.deepEqual(p.posterBytes, PNG);
  assert.ok(calls.every((c) => c.url.startsWith('https://api.github.com/')), 'api.github.com only, never raw.githubusercontent.com');
  assert.ok(calls.every((c) => c.headers.Authorization === 'Bearer tkn'));
  assert.ok(calls[0].url.includes('type=public'));
  assert.equal(calls.filter((c) => c.url.includes('/orgs/')).length, 2, 'two pages of repositories');
  assert.ok(!calls.some((c) => c.url.includes('/releases/latest')));
  const contents = calls.filter((c) => c.url.includes('/contents/'));
  assert.ok(contents.every((c) => c.headers.Accept === 'application/vnd.github.raw+json'));
  assert.ok(!contents.some((c) => /README|docs/i.test(c.url.split('/contents/')[1])), 'only 9_Assets/ is read');
  assert.ok(contents.every((c) => c.url.split('/contents/')[1].startsWith('9_Assets/')));
});

test('GitHub: no token, no Authorization header', async () => {
  const { fetchImpl, calls } = mockGitHub({ repos: ['.github'] });
  await readRepoProducts(githubBackend({ fetchImpl }), { sectionIds });
  assert.ok(calls.every((c) => !('Authorization' in c.headers)));
});

test('GitHub: any failed read fails the build (no fallback), rate limit named', async () => {
  const rate = mockGitHub({ repos: ['Basilisk'], failOn: { match: '/contents/', status: 403, body: '{"message":"API rate limit exceeded"}', headers: { 'x-ratelimit-remaining': '0' } } });
  await assert.rejects(readRepoProducts(githubBackend({ fetchImpl: rate.fetchImpl }), { sectionIds }), /HTTP 403 \(rate limit exhausted\)/);
  const down = mockGitHub({ repos: [], failOn: { match: '/orgs/', status: 502 } });
  await assert.rejects(readRepoProducts(githubBackend({ fetchImpl: down.fetchImpl }), { sectionIds }), /HTTP 502/);
  const offline = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(readRepoProducts(githubBackend({ fetchImpl: offline }), { sectionIds }), /failed: fetch failed/);
});

// --- Snapshot (what the build leaves for check-dist and the README kit) -------------------------

function tempSiteWith(simDir) {
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  cpSync(simDir, join(root, 'catalog-simulator'), { recursive: true });
  return root;
}

test('snapshot: posters named after the slug, remote.json without image bytes', async () => {
  const root = tempSiteWith(SIM);
  const { snapshot } = await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  assert.equal(snapshot.source, 'simulator');
  const onDisk = JSON.parse(readFileSync(join(root, '.zurp-catalog', 'remote.json'), 'utf8'));
  assert.deepEqual(onDisk, snapshot);
  assert.equal(onDisk.products[0].posterFile, 'basilisk.png');
  assert.ok(!('posterBytes' in onDisk.products[0]));
  assert.deepEqual(readFileSync(join(root, '.zurp-catalog', 'posters', 'basilisk.png')), readFileSync(join(SIM, 'repos', 'basilisk', '9_Assets', 'poster.png')));
});

test('snapshot: a failed read (or no source) leaves nothing of the previous build behind', async () => {
  const root = tempSiteWith(SIM);
  await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  assert.ok(existsSync(join(root, '.zurp-catalog', 'remote.json')));
  await assert.rejects(readAndSnapshot({ root, env: {}, sectionIds }), /no source named/);
  assert.equal(existsSync(join(root, '.zurp-catalog')), false);
  await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  writeFileSync(join(root, 'catalog-simulator', 'repos', 'basilisk', '9_Assets', 'zurp.yml'), 'name: Basilisk\n');
  await assert.rejects(readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds }), /repository basilisk/);
  assert.equal(existsSync(join(root, '.zurp-catalog')), false);
});

// --- README kit (needs `npm ci`) ------------------------------------------------------------------

test('README kit: generated from the built catalog — order, Released section by the sheet status, one header per product', async () => {
  const root = tempSiteWith(SIM);
  const { snapshot } = await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  // A status and releases that exist nowhere in the organisation: only in this temporary snapshot.
  // Basilisk's sheet says `released` (the human's decision, ticket #62) and it has a release;
  // maelstrom's says `wip` and it has a release too: a release does not make it released.
  const bySlug = (slug) => snapshot.products.find((p) => p.slug === slug);
  bySlug('basilisk').status = 'released';
  bySlug('basilisk').release = { tag: 'v1.0', publishedAt: '2026-10-06T00:00:00.000Z' };
  assert.equal(bySlug('maelstrom').status, 'wip');
  bySlug('maelstrom').release = { tag: 'v0.3', publishedAt: '2026-10-05T00:00:00.000Z' };
  const snap = join(root, 'released.json');
  writeFileSync(snap, JSON.stringify(snapshot));
  const out = join(root, 'kit');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'readme-kit.mjs'), '--catalog', snap, '--out', out], { stdio: 'pipe' });

  const org = readFileSync(join(out, 'profile', 'README.md'), 'utf8');
  const [wip, released] = org.split('### Released ✅');
  const order = (text) => [...text.matchAll(/<b><a href="[^"]+">([^<]+)<\/a><\/b>/g)].map((m) => m[1]);
  // Maelstrom stays in the work in progress; its release ranks it first in its section (cameras).
  assert.deepEqual(order(wip), ['Berserker', 'Kaiju', 'Maelstrom', 'Cyclops', 'Kraken', 'Unicorn', 'Wraith']);
  assert.deepEqual(order(released), ['Basilisk']);
  assert.match(released, /#### Gadgets/);
  for (const slug of publishedSlugs) assert.ok(existsSync(join(out, 'readme-kit', 'repos', `${slug}.md`)), slug);
  // Ticket #53: the header carries no status any more, only the shields.io badge of the status JSON
  // the site publishes for basilisk; that JSON carries the status and the tag of the release.
  const header = readFileSync(join(out, 'readme-kit', 'repos', 'basilisk.md'), 'utf8');
  const site = readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8').match(/\bsite:\s*['"`]([^'"`]+)['"`]/)[1].replace(/\/+$/, '');
  const endpoint = header.match(/https:\/\/img\.shields\.io\/endpoint\?url=([^)"\s]+)/);
  assert.ok(endpoint, 'the header of basilisk has a shields.io endpoint badge');
  assert.equal(decodeURIComponent(endpoint[1]), `${site}/brand/status/basilisk.json`);
  const { products } = await loadBuiltCatalog({ snapshotFile: snap });
  const json = JSON.parse(statusBadgeJson(products.find((p) => p.slug === 'basilisk'), catalogContent(ROOT)));
  assert.equal(json.schemaVersion, 1);
  assert.ok(json.message.includes(statuses.released.label), json.message);
  assert.ok(json.message.includes('v1.0'), json.message);
  assert.equal(json.color, statuses.released.badgeColor);
  // The JSON follows the sheet's status: maelstrom stays « WIP », with its tag.
  const wipJson = JSON.parse(statusBadgeJson(products.find((p) => p.slug === 'maelstrom'), catalogContent(ROOT)));
  assert.equal(wipJson.message, `${statuses.wip.label} · v0.3`);
  assert.equal(wipJson.color, statuses.wip.badgeColor);
  assert.match(readFileSync(join(out, 'readme-kit', 'README.md'), 'utf8'), /\| Basilisk \| \[`repos\/basilisk\.md`\]/);
});

// --- Licences (ticket #66) -------------------------------------------------------------------------
// The human's rule: the licence of a product is the LICENSE file of its repository, as GitHub detects
// it — the `license` of the repository in the list of the organisation's repositories, which the
// build already reads (no other request, no file read). Nothing to show is never an error. That the
// page shows it is checked on the built pages by scripts/check-dist.mjs.

const GPL_API = { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0', url: 'https://api.github.com/licenses/gpl-3.0', node_id: 'n' };
const OTHER_API = { key: 'other', name: 'Other', spdx_id: 'NOASSERTION', url: null, node_id: 'o' };
const GPL = { spdx_id: 'GPL-3.0', name: 'GNU General Public License v3.0' };
const OTHER = { spdx_id: 'NOASSERTION', name: 'Other' };
const productTexts = siteContent(ROOT).product;

/** A temporary site root holding the simulator plus `extra` repositories ({ name: license | undefined }, no sheet). */
function tempSiteWithRepos(extra) {
  const root = tempSiteWith(SIM);
  for (const [name, license] of Object.entries(extra)) {
    mkdirSync(join(root, 'catalog-simulator', 'repos', name), { recursive: true });
    writeFileSync(join(root, 'catalog-simulator', 'repos', name, 'README.md'), `# ${name}\n`);
    if (license !== undefined) {
      mkdirSync(join(root, 'catalog-simulator', 'licenses'), { recursive: true });
      writeFileSync(join(root, 'catalog-simulator', 'licenses', `${name}.json`), JSON.stringify(license));
    }
  }
  return root;
}

/** The snapshot of a temporary site, written next to it, and the catalog the scripts build from it. */
async function builtFrom(root) {
  const { snapshot } = await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  const { products } = await loadBuiltCatalog({ snapshotFile: join(root, '.zurp-catalog', 'remote.json') });
  return { snapshot, bySlug: Object.fromEntries(products.map((p) => [p.slug, p])) };
}

test('licence: the simulator imitates the real repositories — maelstrom and unicorn GPL-3.0, basilisk « Other » (NOASSERTION)', async () => {
  const products = await read(SIM);
  assert.deepEqual(Object.fromEntries(products.map((p) => [p.slug, p.license])), { basilisk: OTHER, maelstrom: GPL, unicorn: GPL });
});

test('licence recognised: its SPDX id in the snapshot (the product and its repository), stamped with it', async () => {
  const { snapshot, bySlug } = await builtFrom(tempSiteWith(SIM));
  assert.deepEqual(snapshot.products.find((p) => p.slug === 'maelstrom').license, GPL);
  assert.deepEqual(snapshot.repositories, [
    { name: 'basilisk', license: OTHER },
    { name: 'maelstrom', license: GPL },
    { name: 'unicorn', license: GPL },
  ]);
  for (const slug of ['maelstrom', 'unicorn']) {
    assert.deepEqual(bySlug[slug].license, GPL, slug);
    assert.deepEqual(licenseStamp(bySlug[slug].license, productTexts), { label: 'GPL-3.0', title: GPL.name }, slug);
  }
});

test('licence not recognised (NOASSERTION, « Other »): the generic stamp of content/site.yml, no name invented', async () => {
  const { bySlug } = await builtFrom(tempSiteWith(SIM));
  assert.deepEqual(bySlug.basilisk.license, OTHER);
  const stamp = licenseStamp(bySlug.basilisk.license, productTexts);
  assert.deepEqual(stamp, { label: productTexts.licenseOther.trim(), title: null });
  assert.notEqual(stamp.label, 'Other', 'GitHub’s « Other » is not shown as a licence name');
  assert.deepEqual(licenseStamp({ spdx_id: null, name: null }, productTexts), stamp, 'a licence without an SPDX id: the generic stamp too');
});

test('no LICENSE: no licence, no stamp, never an error — no file, or `null`, in the simulator; `null` from GitHub', async () => {
  assert.equal((await read(makeSim({ Gizmo: gizmo() })))[0].license, null);
  assert.equal((await read(makeSim({ Gizmo: gizmo() }, {}, { Gizmo: null })))[0].license, null);
  const { fetchImpl } = mockGitHub({ repos: ['Gizmo'], files: { 'Gizmo/9_Assets/zurp.yml': VALID_SHEET, 'Gizmo/9_Assets/poster.png': PNG } });
  assert.equal((await readRepoProducts(githubBackend({ fetchImpl }), { sectionIds }))[0].license, null);
  assert.equal(licenseStamp(null, productTexts), null);
  assert.equal(licenseStamp(undefined, productTexts), null);
  assert.equal(repoLicense(null), null);
  assert.equal(repoLicense(undefined), null);
});

test('a product without a repository (withoutRepository: Cyclops, Wraith): no licence, even when a repository by its name has one', async () => {
  const { bySlug } = await builtFrom(tempSiteWithRepos({ Cyclops: GPL_API, wraith: OTHER_API }));
  for (const slug of catalogContent(ROOT).withoutRepository) {
    assert.equal(bySlug[slug].license, null, slug);
    assert.equal(licenseStamp(bySlug[slug].license, productTexts), null, slug);
  }
});

test('a product of content/products/ takes the licence of its repository, the case of the name ignored (Kraken → kraken); none when the repository has no LICENSE or is not listed', async () => {
  const { snapshot, bySlug } = await builtFrom(tempSiteWithRepos({ Kraken: GPL_API, Kaiju: undefined }));
  // Kraken and Kaiju have no sheet: they are not products of the snapshot, only repositories.
  assert.ok(!snapshot.products.some((p) => ['kraken', 'kaiju'].includes(p.slug)));
  assert.deepEqual(snapshot.repositories.find((r) => r.name === 'Kraken'), { name: 'Kraken', license: GPL });
  assert.equal(bySlug.kraken.origin, 'content/products/kraken/');
  assert.deepEqual(bySlug.kraken.license, GPL, 'kraken: the licence of Kraken');
  assert.equal(licenseStamp(bySlug.kraken.license, productTexts).label, 'GPL-3.0');
  assert.equal(bySlug.kaiju.license, null, 'kaiju: its repository has no LICENSE');
  assert.equal(bySlug.berserker.license, null, 'berserker: no repository by that name in the list');
  // The same lookup, on its own.
  assert.deepEqual(licenseOf('kraken', [{ name: 'Kraken', license: GPL }]), GPL);
  assert.equal(licenseOf('kraken', []), null);
  assert.equal(licenseOf('kraken', [{ name: 'Kraken-firmware', license: GPL }]), null, 'the whole name, not a prefix');
});

test('the licence of a local product is never guessed: readLocalProducts needs the repositories of the build', async () => {
  await assert.rejects(readLocalProducts({ root: ROOT, sectionIds }), /needs `repositories`/);
  const local = await readLocalProducts({ root: ROOT, sectionIds, repositories: [{ name: 'Kaiju', license: GPL }] });
  assert.deepEqual(local.find((p) => p.slug === 'kaiju').license, GPL);
  assert.ok(local.filter((p) => p.slug !== 'kaiju').every((p) => p.license === null));
});

test('GitHub: the licence comes with the list of repositories — listed once, no other request, no LICENSE read', async () => {
  const { fetchImpl, calls } = mockGitHub({
    repos: ['.github', 'Basilisk', 'Kraken'],
    files: {
      'Basilisk/9_Assets/zurp.yml': readFileSync(join(SIM, 'repos', 'basilisk', '9_Assets', 'zurp.yml')),
      'Basilisk/9_Assets/poster.png': PNG,
    },
    licenses: { Basilisk: OTHER_API, Kraken: GPL_API },
  });
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  const { snapshot } = await readAndSnapshot({ root, env: { ZURP_CATALOG: 'github' }, sectionIds, backend: githubBackend({ fetchImpl }) });
  assert.deepEqual(snapshot.repositories, [
    { name: '.github', license: null },
    { name: 'Basilisk', license: OTHER },
    { name: 'Kraken', license: GPL },
  ]);
  assert.deepEqual(snapshot.products.map((p) => [p.slug, p.license]), [['basilisk', OTHER]]);
  assert.equal(calls.filter((c) => c.url.includes('/orgs/')).length, 2, 'the two pages of repositories, read once');
  assert.ok(!calls.some((c) => /\/license\b/i.test(c.url)), 'no request to the licence endpoint');
  const contents = calls.filter((c) => c.url.includes('/contents/'));
  assert.ok(contents.every((c) => c.url.split('/contents/')[1].startsWith('9_Assets/')), 'no LICENSE file read');
  assert.equal(calls.length, 2 + contents.length + 1, 'repositories (2 pages), 9_Assets/ files, the releases of the one repository with a sheet — nothing else');
});

test('a sheet may not carry a licence: it is the repository’s LICENSE', async () => {
  await assert.rejects(read(makeSim({ Gizmo: gizmo(VALID_SHEET + 'license: MIT\n') })), /field `license`: not allowed in the sheet \(the licence is the repository's LICENSE file/);
  assert.throws(() => repoLicense('MIT', 'repository Gizmo'), /repository Gizmo: `license` is not a licence object/);
});
