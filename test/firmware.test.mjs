// SOURCE: zurp-astronomics-site — the tests of the firmware a product publishes (ticket #96): the release selected, the manifest's validation, the downloads (GitHub: 200 and 302, the token kept off the storage host), the Launchpad TOML, the report
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active
//
// Run with `npm test` (needs `npm ci`). The contract with the products (src/lib/catalog/firmware.mjs)
// is external: a product builds its release workflow on it, so every rule of it is tested here. The
// GitHub backend is tested without the network: a simulated fetch, and for the redirect two local
// HTTP servers (127.0.0.1, two ports: two origins) behind Node's own fetch — the one that follows
// the 302 and must drop the token.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse as parseToml } from 'smol-toml';

import { githubBackend, simulatorBackend } from '../src/lib/catalog/source.mjs';
import { readRepoProducts } from '../src/lib/catalog/read.mjs';
import { FIRMWARE_MANIFEST, firmwareManifestProblems } from '../src/lib/catalog/firmware.mjs';
import { readAndSnapshot } from '../src/lib/catalog/loader.mjs';
import { catalogReport } from '../src/lib/catalog/report.mjs';
import { chipLabel, firmwarePartPath, firmwareToml, firmwareTomlPath, launchpadLink } from '../src/lib/firmware.mjs';
import { catalogContent } from '../src/lib/content.mjs';
import { loadBuiltCatalog } from '../scripts/lib/catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sectionIds = catalogContent(ROOT).sections.map((s) => s.id);
const SITE = 'https://zurp-astronomics.github.io';

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
const repo = () => ({ '9_Assets/zurp.yml': SHEET, '9_Assets/poster.png': PNG });
const rel = (tag, at, more = {}) => ({ tag_name: tag, published_at: at, draft: false, prerelease: false, ...more });
const manifest = (chips) => JSON.stringify({ chips });
const MULTI = {
  esp32s3: { parts: [{ offset: '0x0', file: 'boot.bin' }, { offset: '0x8000', file: 'pt.bin' }, { offset: '0x10000', file: 'app.bin' }] },
  esp32c3: { parts: [{ offset: '0x0', file: 'merged.bin' }] },
};
const FILES = { 'boot.bin': 'B'.repeat(100), 'pt.bin': 'P'.repeat(10), 'app.bin': 'A'.repeat(50), 'merged.bin': 'M'.repeat(70) };

/**
 * A temporary simulator: repos { name: files }, releases { name: [{ ...release, files: { name: content } }] }
 * — the files of a release written where the simulator lists them (releases/<name>/<tag>/).
 */
function makeSim(repos, releases = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'zurp-fw-'));
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

/** The simulator backend of `dir`, every download recorded in `downloads` (`<tag>/<name>`). */
function spied(dir) {
  const be = simulatorBackend(dir);
  const downloads = [];
  return {
    downloads,
    backend: {
      ...be,
      async downloadAsset(r, release, asset) {
        downloads.push(`${release.tag_name}/${asset.name}`);
        return be.downloadAsset(r, release, asset);
      },
    },
  };
}

// 1 -------------------------------------------------------------------------------------------------
test('1. the firmware is the latest published release that carries zurp-firmware.json; a later release without one takes nothing away; nothing else attached is downloaded', async () => {
  const sim = makeSim(
    { alpha: repo(), bravo: repo() },
    {
      alpha: [
        rel('v1', '2026-09-01T00:00:00Z', { files: { [FIRMWARE_MANIFEST]: manifest({ esp32: { parts: [{ offset: '0x0', file: 'old.bin' }] } }), 'old.bin': 'old' } }),
        rel('v2-rc1', '2026-09-15T00:00:00Z', { prerelease: true, files: { [FIRMWARE_MANIFEST]: manifest(MULTI), ...FILES, 'notes.txt': 'not named' } }),
        // Published after, its files still being attached: no manifest yet — the firmware stays v2-rc1's.
        rel('v3', '2026-10-01T00:00:00Z', { files: { 'app.bin': 'new' } }),
        rel('v4', null, { draft: true, files: { [FIRMWARE_MANIFEST]: manifest(MULTI), ...FILES } }),
      ],
    },
  );
  const { backend, downloads } = spied(sim);
  const { products, firmwareRejected } = await readRepoProducts(backend, { sectionIds });
  const by = Object.fromEntries(products.map((p) => [p.slug, p]));
  assert.equal(by.alpha.release.tag, 'v3', 'the version shown is still the latest release');
  assert.equal(by.alpha.firmware.tag, 'v2-rc1', 'the firmware is the latest release carrying a manifest, a prerelease counts');
  assert.deepEqual(by.alpha.firmware.chips.map((c) => [c.chip, c.parts.map((p) => [p.offset, p.file, p.size])]), [
    ['esp32s3', [['0x0', 'boot.bin', 100], ['0x8000', 'pt.bin', 10], ['0x10000', 'app.bin', 50]]],
    ['esp32c3', [['0x0', 'merged.bin', 70]]],
  ]);
  assert.match(by.alpha.firmware.chips[0].parts[0].sha256, /^[0-9a-f]{64}$/);
  assert.equal(by.bravo.firmware, null, 'no release: no firmware, and no error');
  assert.deepEqual(firmwareRejected, []);
  assert.deepEqual(downloads.sort(), ['v2-rc1/app.bin', 'v2-rc1/boot.bin', 'v2-rc1/merged.bin', 'v2-rc1/pt.bin', `v2-rc1/${FIRMWARE_MANIFEST}`].sort(),
    'only the manifest of ONE release and the files it names');
});

// 2 -------------------------------------------------------------------------------------------------
test('2. the manifest is validated: every rule of the contract, each problem naming its field', () => {
  const assets = Object.entries(FILES).map(([name, c]) => ({ name, size: c.length }));
  const problems = (m) => firmwareManifestProblems(m, assets).join('\n');
  assert.equal(problems({ chips: MULTI }), '', 'the manifest of the contract is valid');
  assert.match(problems([]), /not a JSON object/);
  assert.match(problems({ chips: MULTI, product: 'gizmo' }), /field `product`: not allowed in the manifest \(the product is the repository\)/);
  assert.match(problems({ chips: MULTI, version: '1.0' }), /field `version`: not allowed .*release's tag/);
  assert.match(problems({ chips: MULTI, board: 'x' }), /field `board`: unknown field/);
  assert.match(problems({}), /field `chips`: missing/);
  assert.match(problems({ chips: {} }), /field `chips`: must be a table of at least one chip/);
  assert.match(problems({ chips: { 'ESP32-S3': MULTI.esp32s3 } }), /field `chips.ESP32-S3`: .* not an ESP-IDF \/ esptool target name/);
  assert.match(problems({ chips: { esp32: { parts: [] } } }), /field `chips.esp32.parts`: must be a list of at least one part/);
  assert.match(problems({ chips: { esp32: { parts: MULTI.esp32c3.parts, flash: '4MB' } } }), /field `chips.esp32.flash`: unknown field/);
  assert.match(problems({ chips: { esp32: { parts: [{ offset: '0x0', file: 'merged.bin', size: 70 }] } } }), /field `chips.esp32.parts\[0\].size`: unknown field/);
  assert.match(problems({ chips: { esp32: { parts: [{ file: 'merged.bin' }] } } }), /field `chips.esp32.parts\[0\].offset`: missing/);
  assert.match(problems({ chips: { esp32: { parts: [{ offset: 4096, file: 'merged.bin' }] } } }), /parts\[0\].offset`: 4096 is not a hexadecimal text/);
  assert.match(problems({ chips: { esp32: { parts: [{ offset: '0x0', file: '../merged.bin' }] } } }), /parts\[0\].file`: .* must be a bare file name/);
  assert.match(problems({ chips: { esp32: { parts: [{ offset: '0x0', file: 'dir/merged.bin' }] } } }), /parts\[0\].file`: .* must be a bare file name/);
  assert.match(problems({ chips: { esp32: { parts: [{ offset: '0x0', file: 'gone.bin' }] } } }), /parts\[0\].file`: "gone.bin" is not a file attached to this release/);
  // boot.bin is 100 bytes: from 0x0 it covers up to 0x64.
  assert.match(problems({ chips: { esp32: { parts: [{ offset: '0x0', file: 'boot.bin' }, { offset: '0x50', file: 'pt.bin' }] } } }),
    /field `chips.esp32.parts`: parts\[0\] \(0x0, 100 bytes\) overlaps parts\[1\] \(0x50\)/);
  assert.equal(problems({ chips: { esp32: { parts: [{ offset: '0x64', file: 'pt.bin' }, { offset: '0x0', file: 'boot.bin' }] } } }), '', 'adjacent parts, in any order');
});

// 3 -------------------------------------------------------------------------------------------------
test('3. an invalid manifest, or a file it names that is not attached: the product is published WITHOUT firmware, never an older one, and the report says why', async () => {
  const older = rel('v1', '2026-09-01T00:00:00Z', { files: { [FIRMWARE_MANIFEST]: manifest(MULTI), ...FILES } });
  const sim = makeSim(
    { alpha: repo(), bravo: repo(), charlie: repo() },
    {
      alpha: [older, rel('v2', '2026-10-01T00:00:00Z', { files: { [FIRMWARE_MANIFEST]: JSON.stringify({ version: 'v2', chips: MULTI }), ...FILES } })],
      bravo: [older, rel('v2', '2026-10-01T00:00:00Z', { files: { [FIRMWARE_MANIFEST]: manifest(MULTI), 'boot.bin': FILES['boot.bin'] } })],
      charlie: [rel('v2', '2026-10-01T00:00:00Z', { files: { [FIRMWARE_MANIFEST]: '{ "chips": ' } })],
    },
  );
  const { products, skipped, firmwareRejected } = await readRepoProducts(simulatorBackend(sim), { sectionIds });
  assert.deepEqual(skipped, [], 'the products are not skipped');
  assert.deepEqual(products.map((p) => [p.slug, p.firmware]), [['alpha', null], ['bravo', null], ['charlie', null]], 'no fall back to v1');
  const rejected = Object.fromEntries(firmwareRejected.map((r) => [r.repo, r.problems.join('\n')]));
  assert.match(rejected.alpha, /^repository alpha, release "v2" \(zurp-firmware\.json\): field `version`: not allowed/);
  assert.match(rejected.bravo, /repository bravo, release "v2" .*field `chips.esp32s3.parts\[1\].file`: "pt.bin" is not a file attached to this release/);
  assert.match(rejected.charlie, /repository charlie, release "v2" .*not valid JSON/);

  const report = catalogReport({ read: 'test', products: products.map((p) => ({ ...p, repo: 'r' })), skipped, ignoredReleases: [], firmwareRejected });
  assert.ok(report.warnings.some((w) => /^firmware not published — repository alpha, release "v2"/.test(w)), 'a warning (an annotation on GitHub Actions)');
  assert.match(report.markdown, /### Firmware not published \(manifest rejected\)/);
  assert.match(report.lines.find((l) => l.includes('alpha')), /firmware NOT published \(manifest rejected\)/);
});

// 4 -------------------------------------------------------------------------------------------------
/** A fetch answering like api.github.com for one repository, Gizmo, whose release v1 attaches `assets`; `answer(id)` serves an asset. */
function mockGitHub({ assets, answer, calls }) {
  return async (url, init) => {
    calls.push({ url, accept: init?.headers?.Accept, auth: init?.headers?.Authorization });
    const path = new URL(url).pathname;
    if (path === '/orgs/zUrp-Astronomics/repos') return Response.json([{ name: 'Gizmo', html_url: 'https://github.com/zUrp-Astronomics/Gizmo', license: null }]);
    if (path === '/repos/zUrp-Astronomics/Gizmo/releases') return Response.json([rel('v1', '2026-10-01T00:00:00Z', { assets })]);
    const asset = path.match(/^\/repos\/zUrp-Astronomics\/Gizmo\/releases\/assets\/(\d+)$/);
    if (asset) return answer(Number(asset[1]));
    const file = { '/repos/zUrp-Astronomics/Gizmo/contents/9_Assets/zurp.yml': SHEET, '/repos/zUrp-Astronomics/Gizmo/contents/9_Assets/poster.png': PNG }[path];
    return file ? new Response(file) : new Response('{"message":"Not Found"}', { status: 404 });
  };
}

test('4. GitHub: the assets listed by the releases, downloaded through the API (200 with the bytes), with the token; a failed download fails the build', async () => {
  const content = { [FIRMWARE_MANIFEST]: manifest({ esp32c3: MULTI.esp32c3 }), 'merged.bin': FILES['merged.bin'], 'other.zip': 'zip' };
  const assets = Object.entries(content).map(([name, c], i) => ({ id: 100 + i, name, size: Buffer.byteLength(c), browser_download_url: `https://github.com/x/${name}` }));
  const calls = [];
  const answer = (id) => new Response(content[assets.find((a) => a.id === id).name]);
  const read = (a = answer) => readRepoProducts(githubBackend({ token: 'T', fetchImpl: mockGitHub({ assets, answer: a, calls }) }), { sectionIds });
  const { products } = await read();
  assert.equal(products[0].firmware.tag, 'v1');
  assert.deepEqual(products[0].firmware.chips[0].parts.map((p) => [p.file, p.size]), [['merged.bin', 70]]);
  const downloads = calls.filter((c) => c.url.includes('/releases/assets/'));
  assert.deepEqual(downloads.map((c) => c.url.split('/').pop()), ['100', '101'], 'the manifest and the file it names; never other.zip; no request to list the assets');
  for (const d of downloads) {
    assert.ok(d.url.startsWith('https://api.github.com/repos/zUrp-Astronomics/Gizmo/releases/assets/'), 'through the API, never the github.com download URL');
    assert.equal(d.accept, 'application/octet-stream');
    assert.equal(d.auth, 'Bearer T');
  }
  await assert.rejects(read(() => new Response('boom', { status: 502 })), /HTTP 502/, 'a backend error fails the build');
  await assert.rejects(read((id) => new Response(id === 101 ? 'short' : content[FIRMWARE_MANIFEST])), /merged\.bin downloaded as 5 bytes, the release lists 70/);
});

test('4b. GitHub: an asset answered by a 302 to a storage host is followed, and the token never goes to that host', async () => {
  const bytes = { [FIRMWARE_MANIFEST]: manifest({ esp32c3: MULTI.esp32c3 }), 'merged.bin': FILES['merged.bin'] };
  const seen = [];
  const listen = (handler) => new Promise((ok) => { const s = createServer(handler); s.listen(0, '127.0.0.1', () => ok(s)); });
  const storage = await listen((req, res) => {
    seen.push({ host: 'storage', auth: req.headers.authorization ?? null });
    res.end(bytes[decodeURIComponent(req.url.slice(1))]);
  });
  const names = Object.keys(bytes);
  const assets = names.map((name, i) => ({ id: i + 1, name, size: Buffer.byteLength(bytes[name]) }));
  const api = await listen((req, res) => {
    seen.push({ host: 'api', url: req.url, auth: req.headers.authorization ?? null, accept: req.headers.accept });
    const send = (body) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (req.url.startsWith('/orgs/')) return send([{ name: 'Gizmo', html_url: 'https://github.com/zUrp-Astronomics/Gizmo', license: null }]);
    if (req.url.startsWith('/repos/zUrp-Astronomics/Gizmo/releases?')) return send([rel('v1', '2026-10-01T00:00:00Z', { assets })]);
    const asset = req.url.match(/\/releases\/assets\/(\d+)$/);
    if (asset) {
      return res.writeHead(302, { location: `http://127.0.0.1:${storage.address().port}/${encodeURIComponent(names[asset[1] - 1])}` }).end();
    }
    const file = { '/repos/zUrp-Astronomics/Gizmo/contents/9_Assets/zurp.yml': SHEET, '/repos/zUrp-Astronomics/Gizmo/contents/9_Assets/poster.png': PNG }[req.url];
    if (file) return res.end(file);
    res.writeHead(404).end('{"message":"Not Found"}');
  });
  try {
    const backend = githubBackend({ token: 'SECRET', api: `http://127.0.0.1:${api.address().port}` });
    const { products } = await readRepoProducts(backend, { sectionIds });
    assert.deepEqual(products[0].firmware.chips[0].parts.map((p) => [p.file, p.size]), [['merged.bin', 70]]);
    const toStorage = seen.filter((s) => s.host === 'storage');
    assert.equal(toStorage.length, 2, 'both files fetched from the storage host');
    assert.ok(toStorage.every((s) => s.auth === null), 'no Authorization header to the storage host');
    const assetCalls = seen.filter((s) => s.host === 'api' && s.url.includes('/releases/assets/'));
    assert.ok(assetCalls.length === 2 && assetCalls.every((s) => s.auth === 'Bearer SECRET' && s.accept === 'application/octet-stream'));
  } finally {
    api.close();
    storage.close();
  }
});

// 5 -------------------------------------------------------------------------------------------------
test('5. the Launchpad TOML of a chip: TOML 1.0 (the parser of Launchpad), one app naming the product, the tag and the chip, absolute URLs of the parts in order', () => {
  const chip = { chip: 'esp32s3', parts: MULTI.esp32s3.parts.map((p, i) => ({ ...p, size: 1, sha256: `${'abcdef0123456789'}${i}`.padEnd(64, '0') })) };
  const appName = 'Gizmo "v1\\2" (ESP32-S3)';
  const config = parseToml(firmwareToml({ site: `${SITE}/`, slug: 'gizmo', appName, chip }));
  assert.equal(config.esp_toml_version, 1.0);
  assert.deepEqual(config.supported_apps, [appName], 'a quoted key, quotes and backslashes escaped');
  assert.equal(config.multipart, true);
  assert.equal(config.chip, 'esp32s3');
  assert.equal(config[appName].icon, `${SITE}/brand/posters/gizmo.webp`);
  assert.deepEqual(config[appName].image.esp32s3.addresses, ['0x0', '0x8000', '0x10000']);
  assert.deepEqual(config[appName].image.esp32s3.parts, chip.parts.map((p) => `${SITE}/${firmwarePartPath('gizmo', p)}`));
  assert.equal(firmwarePartPath('gizmo', chip.parts[0]), 'gizmo/firmware/abcdef0123456789/boot.bin', 'the path changes with the content');
  assert.equal(firmwareTomlPath('gizmo', 'esp32s3'), 'gizmo/firmware/esp32s3.toml', 'the stable URL of the contract');
  assert.equal(launchpadLink(`${SITE}/gizmo/firmware/esp32s3.toml`),
    'https://espressif.github.io/esp-launchpad/minimal-launchpad/?flashConfigURL=https://zurp-astronomics.github.io/gizmo/firmware/esp32s3.toml');
  assert.deepEqual(['esp32', 'esp32s3', 'esp32c3', 'esp32c61'].map(chipLabel), ['ESP32', 'ESP32-S3', 'ESP32-C3', 'ESP32-C61']);
});

// 6 -------------------------------------------------------------------------------------------------
test('6. the offline build publishes Basilisk’s firmware of v0.1.0 (two chips), not its later release v0.2.0 without a manifest; the bytes are beside the snapshot, never in it', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  cpSync(join(ROOT, 'content'), join(root, 'content'), { recursive: true });
  cpSync(join(ROOT, 'catalog-simulator'), join(root, 'catalog-simulator'), { recursive: true });
  await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  const snapshotFile = join(root, '.zurp-catalog', 'remote.json');
  const { products, firmwareRejected } = await loadBuiltCatalog({ snapshotFile, root });
  const basilisk = products.find((p) => p.slug === 'basilisk');
  assert.equal(basilisk.release.tag, 'v0.2.0');
  assert.equal(basilisk.firmware.tag, 'v0.1.0');
  assert.deepEqual(basilisk.firmware.chips.map((c) => [c.chip, c.parts.length]), [['esp32s3', 3], ['esp32c3', 1]]);
  assert.deepEqual(firmwareRejected, []);
  assert.deepEqual(products.filter((p) => p.firmware).map((p) => p.slug), ['basilisk'], 'the other products publish none');
  const text = readFileSync(snapshotFile, 'utf8');
  assert.ok(!text.includes('firmwareFiles') && !text.includes('NOT a firmware'), 'no bytes in the snapshot');
  for (const part of basilisk.firmware.chips.flatMap((c) => c.parts)) {
    const file = join(root, '.zurp-catalog', 'firmware', part.sha256);
    assert.ok(existsSync(file) && readFileSync(file).length === part.size, `${part.file} written beside the snapshot`);
  }
});
