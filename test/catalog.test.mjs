// SOURCE: zurp-astronomics-site — tests of the catalog reader: explicit source, simulator, GitHub backend (mocked), sheet validation, releases, order, one place per product, published guard, snapshot, README kit
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — run by `npm test` (CLAUDE.md `## Test`, job `build` of .gitea/workflows/ci.yml)
//
// The cases that do not exist in the organisation (a release, a prerelease, two releases, an invalid
// sheet, a slug twice, a published product gone) are built here, in temporary simulators and a
// mocked GitHub: no fictitious product ever enters a deployable build. The README kit test needs
// `npm ci` (esbuild reads products.ts), like the build.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalogSource, githubBackend, simulatorBackend } from '../src/lib/catalog/source.mjs';
import { latestRelease, readRepoProducts, sheetProblems } from '../src/lib/catalog/read.mjs';
import { assembleCatalog } from '../src/lib/catalog/assemble.mjs';
import { readAndSnapshot } from '../src/lib/catalog/loader.mjs';
import { sections } from '../src/data/sections.mjs';
import { publishedSlugs } from '../src/data/published-slugs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIM = join(ROOT, 'catalog-simulator');
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

/** A temporary simulator: { repoName: { 'path': content } }, releases: { repoName: [...] }. */
function makeSim(repos, releases = {}) {
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

test('simulator: basilisk reads exactly as products.ts held it on main, no release', async () => {
  const products = await read(SIM);
  assert.deepEqual(products.map((p) => p.slug), ['basilisk']);
  const { posterBytes, posterFile, origin, release, ...fields } = products[0];
  assert.deepEqual(fields, BASILISK_ON_MAIN);
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
    delta: gizmo(VALID_SHEET.replace('status: wip', 'status: released')),
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
      /repository delta .*field `status`: `released` is not written in the sheet/,
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

// --- Releases ----------------------------------------------------------------------------------

test('one release: released, its tag as is, its published_at', async () => {
  const dir = makeSim({ gizmo: gizmo() }, { gizmo: [{ tag_name: 'v0.1-α', published_at: '2026-09-01T10:00:00Z', draft: false, prerelease: false }] });
  const [p] = await read(dir);
  assert.equal(p.status, 'released');
  assert.deepEqual(p.release, { tag: 'v0.1-α', publishedAt: '2026-09-01T10:00:00.000Z' });
});

test('a prerelease counts like any release (no analysis of name, tag or pre-release box)', async () => {
  const dir = makeSim({ gizmo: gizmo(VALID_SHEET.replace('status: wip', 'status: future')) }, {
    gizmo: [{ tag_name: 'nightly', name: 'DO NOT USE', published_at: '2026-09-02T00:00:00Z', draft: false, prerelease: true }],
  });
  const [p] = await read(dir);
  assert.equal(p.status, 'released');
  assert.equal(p.release.tag, 'nightly');
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

// The products still in src/data/products.ts after this ticket (slug, name, section).
const LOCAL = [
  ['kaiju', 'Kaiju', 'mounts'],
  ['berserker', 'Berserker', 'mounts'],
  ['unicorn', 'Unicorn', 'gadgets'],
  ['kraken', 'Kraken', 'gadgets'],
  ['maelstrom', 'Maelstrom', 'cameras'],
  ['cyclops', 'Cyclops', 'cameras'],
  ['wraith', 'Wraith', 'future'],
].map(([slug, name, section]) => ({ slug, name, section, release: null }));
const basilisk = { slug: 'basilisk', name: 'Basilisk', section: 'gadgets', release: null, origin: 'repository basilisk' };

test('order with no release anywhere: alphabetical inside each section (the expected rendering)', () => {
  const { products, unguarded } = assembleCatalog({ local: LOCAL, remote: [basilisk], published: publishedSlugs, sections });
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

test('a slug in products.ts and in a repository fails the build', () => {
  assert.throws(
    () => assembleCatalog({ local: [...LOCAL, { slug: 'basilisk', name: 'Basilisk', section: 'gadgets', release: null }], remote: [basilisk], published: publishedSlugs, sections }),
    /slug `basilisk` is defined twice: in src\/data\/products\.ts and in repository basilisk/,
  );
});

test('a published product missing from the catalog fails the build (sheet not pushed, repository renamed)', () => {
  assert.throws(
    () => assembleCatalog({ local: LOCAL, remote: [], published: publishedSlugs, sections }),
    /published product\(s\) missing from the catalog: basilisk/,
  );
});

test('a new product not on the published list is built, and reported as unguarded', () => {
  const { products, unguarded } = assembleCatalog({ local: LOCAL, remote: [basilisk, { slug: 'gizmo', name: 'Gizmo', section: 'gadgets', release: null }], published: publishedSlugs, sections });
  assert.ok(products.some((p) => p.slug === 'gizmo'));
  assert.deepEqual(unguarded, ['gizmo']);
});

test('the published list holds every product published before this ticket', () => {
  assert.deepEqual([...publishedSlugs].sort(), ['basilisk', 'berserker', 'cyclops', 'kaiju', 'kraken', 'maelstrom', 'unicorn', 'wraith']);
});

// --- GitHub backend (mocked fetch) -------------------------------------------------------------

function mockGitHub({ repos, files = {}, releases = {}, failOn } = {}) {
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
      const slice = repos.slice((page - 1) * per, page * per).map((name) => ({ name, html_url: `https://github.com/zUrp-Astronomics/${name}` }));
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
  assert.equal(p.status, 'released');
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

// --- README kit (needs `npm ci`: esbuild reads products.ts) -------------------------------------

test('README kit: generated from the built catalog — order, Released section, one header per product', async () => {
  const root = tempSiteWith(SIM);
  const { snapshot } = await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  // A release that exists nowhere in the organisation: only in this temporary snapshot.
  snapshot.products[0].status = 'released';
  snapshot.products[0].release = { tag: 'v1.0', publishedAt: '2026-10-06T00:00:00.000Z' };
  const snap = join(root, 'released.json');
  writeFileSync(snap, JSON.stringify(snapshot));
  const out = join(root, 'kit');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'readme-kit.mjs'), '--catalog', snap, '--out', out], { stdio: 'pipe' });

  const org = readFileSync(join(out, 'profile', 'README.md'), 'utf8');
  const [wip, released] = org.split('### Released ✅');
  const order = (text) => [...text.matchAll(/<b><a href="[^"]+">([^<]+)<\/a><\/b>/g)].map((m) => m[1]);
  assert.deepEqual(order(wip), ['Berserker', 'Kaiju', 'Cyclops', 'Maelstrom', 'Kraken', 'Unicorn', 'Wraith']);
  assert.deepEqual(order(released), ['Basilisk']);
  assert.match(released, /#### Gadgets/);
  for (const slug of publishedSlugs) assert.ok(existsSync(join(out, 'readme-kit', 'repos', `${slug}.md`)), slug);
  assert.match(readFileSync(join(out, 'readme-kit', 'repos', 'basilisk.md'), 'utf8'), /status-Released-brightgreen/);
  assert.match(readFileSync(join(out, 'readme-kit', 'README.md'), 'utf8'), /\| Basilisk \| \[`repos\/basilisk\.md`\]/);
});
