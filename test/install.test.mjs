// SOURCE: zurp-astronomics-site — the tests of what a product publishes to install (ticket #101): the release selected, the ESP Web Tools manifest's validation, the downloads (GitHub: 200 and 302, the token kept off the storage host), the .hex / .img.xz links, the pinned ESP Web Tools, the report, what the product page and its firmware/ folder show
// AUTHOR: engineer
// DATE: 2026-10-12
// REVISED: 2026-10-12 (ticket #96, review) — test 7: the « Flash » block of a product page and its
//   firmware/ folder, as scripts/check-dist.mjs checks them on every build
// REVISED: 2026-10-12 (ticket #101) — renamed from test/firmware.test.mjs and rewritten: ESP Launchpad
//   and zurp-firmware.json are gone; ESP Web Tools manifest.json, .hex, .img.xz (src/lib/catalog/install.mjs)
// STATUS: active
//
// Run with `npm test` (needs `npm ci`). The contract with the products (src/lib/catalog/install.mjs)
// is external: a product builds its release workflow on it, so every rule of it is tested here. The
// chip families are compared with the ESP Web Tools package installed (its src/const.ts), and the
// canonical manifest of its README (10.4.0) must pass. The GitHub backend is tested without the
// network: a simulated fetch, and for the redirect two local HTTP servers (127.0.0.1, two ports: two
// origins) behind Node's own fetch — the one that follows the 302 and must drop the token.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { githubBackend, simulatorBackend } from '../src/lib/catalog/source.mjs';
import { readRepoProducts } from '../src/lib/catalog/read.mjs';
import {
  ESP_CHIP_FAMILIES,
  ESP_MANIFEST,
  ESP_SERIAL_TYPES,
  ESP_WEB_TOOLS_VERSION,
  espId,
  espManifestProblems,
  isBareFileName,
} from '../src/lib/catalog/install.mjs';
import { readAndSnapshot } from '../src/lib/catalog/loader.mjs';
import { catalogReport } from '../src/lib/catalog/report.mjs';
import { espManifestPath, espManifestUrlPath, espPublishedPaths } from '../src/lib/install.mjs';
import { catalogContent, fill, siteContent } from '../src/lib/content.mjs';
import { loadBuiltCatalog } from '../scripts/lib/catalog.mjs';
import { espDirProblems, installBlockProblems } from '../scripts/lib/check-install.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
const repo = () => ({ '9_Assets/zurp.yml': SHEET, '9_Assets/poster.png': PNG });
const rel = (tag, at, more = {}) => ({ tag_name: tag, published_at: at, draft: false, prerelease: false, ...more });
const build = (chipFamily, path, more = {}) => ({ chipFamily, ...more, parts: [{ path, offset: 0 }] });
const manifest = (builds, more = {}) => JSON.stringify({ name: 'Gizmo', version: '1.2.0', ...more, builds });
const ESP = [build('ESP32-S3', 'gizmo_1.2.0_esp32s3.bin'), build('ESP32-C3', 'gizmo_1.2.0_esp32c3.bin')];
const FILES = { 'gizmo_1.2.0_esp32s3.bin': 'S'.repeat(100), 'gizmo_1.2.0_esp32c3.bin': 'C'.repeat(70) };

/** The manifest of ESP Web Tools 10.4.0's README, verbatim: two ESP32-S3 builds differing by serialType. */
const CANONICAL = {
  name: 'ESPHome',
  version: '2021.10.3',
  home_assistant_domain: 'esphome',
  funding_url: 'https://esphome.io/guides/supporters.html',
  builds: [
    { chipFamily: 'ESP32', parts: [{ path: 'bootloader_dout_40m.bin', offset: 4096 }, { path: 'partitions.bin', offset: 32768 }, { path: 'boot_app0.bin', offset: 57344 }, { path: 'esp32.bin', offset: 65536 }] },
    { chipFamily: 'ESP32-C3', parts: [{ path: 'bootloader_dout_40m.bin', offset: 0 }, { path: 'partitions.bin', offset: 32768 }, { path: 'boot_app0.bin', offset: 57344 }, { path: 'esp32-c3.bin', offset: 65536 }] },
    { chipFamily: 'ESP32-S2', parts: [{ path: 'bootloader_dout_40m.bin', offset: 4096 }, { path: 'partitions.bin', offset: 32768 }, { path: 'boot_app0.bin', offset: 57344 }, { path: 'esp32-s2.bin', offset: 65536 }] },
    { chipFamily: 'ESP32-S3', serialType: 'uart', parts: [{ path: 'bootloader_dout_40m.bin', offset: 4096 }, { path: 'partitions.bin', offset: 32768 }, { path: 'boot_app0.bin', offset: 57344 }, { path: 'esp32-s3.bin', offset: 65536 }] },
    { chipFamily: 'ESP32-S3', serialType: 'cdc', parts: [{ path: 'bootloader_dout_40m.bin', offset: 4096 }, { path: 'partitions.bin', offset: 32768 }, { path: 'boot_app0.bin', offset: 57344 }, { path: 'esp32-s3-cdc.bin', offset: 65536 }] },
    { chipFamily: 'ESP8266', parts: [{ path: 'esp8266.bin', offset: 0 }] },
  ],
};

/**
 * A temporary simulator: repos { name: files }, releases { name: [{ ...release, files: { name: content } }] }
 * — the files of a release written where the simulator lists them (releases/<name>/<tag>/).
 */
function makeSim(repos, releases = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'zurp-install-'));
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
test('1. the install is the latest published release carrying an installable file (manifest.json, .hex, .img.xz); a later release without one takes nothing away; only the manifest and the files it names are downloaded', async () => {
  const sim = makeSim(
    { alpha: repo(), bravo: repo(), charlie: repo(), delta: repo() },
    {
      alpha: [
        rel('v1', '2026-09-01T00:00:00Z', { files: { [ESP_MANIFEST]: manifest([build('ESP32', 'old.bin')]), 'old.bin': 'old' } }),
        rel('v2-rc1', '2026-09-15T00:00:00Z', {
          prerelease: true,
          files: { [ESP_MANIFEST]: manifest(ESP), ...FILES, 'gizmo_1.2.0_stm32f411.hex': 'H'.repeat(9), 'gizmo_1.2.0_rpi4.img.xz': 'I'.repeat(7), 'notes.txt': 'not named', 'unused.bin': 'not named' },
        }),
        // Published after, its files still being attached: nothing installable yet — the install stays v2-rc1's.
        rel('v3', '2026-10-01T00:00:00Z', { files: { 'gizmo_1.3.0_esp32s3.bin': 'new', 'notes.txt': 'x' } }),
        rel('v4', null, { draft: true, files: { [ESP_MANIFEST]: manifest(ESP), ...FILES } }),
      ],
      // A newer release with only a .hex is the install: the older ESP is not mixed in.
      bravo: [
        rel('v1', '2026-09-01T00:00:00Z', { files: { [ESP_MANIFEST]: manifest(ESP), ...FILES } }),
        rel('v2', '2026-10-01T00:00:00Z', { files: { 'gizmo_2.0.0_stm32f411.hex': 'hex' } }),
      ],
      // Nothing installable anywhere (an upstream firmware: nothing to publish).
      charlie: [rel('v1', '2026-09-01T00:00:00Z', { files: { 'gizmo_1.0.0_esp32.bin': 'b', 'firmware.HEX': 'not lower case', 'image.img': 'not xz' } })],
    },
  );
  const { backend, downloads } = spied(sim);
  const { products, installRejected } = await readRepoProducts(backend, { sectionIds });
  const by = Object.fromEntries(products.map((p) => [p.slug, p]));

  assert.equal(by.alpha.release.tag, 'v3', 'the version shown is still the latest release');
  assert.equal(by.alpha.install.tag, 'v2-rc1', 'the latest release carrying an installable file, a prerelease counts');
  const esp = by.alpha.install.esp;
  assert.deepEqual([esp.name, esp.version], ['Gizmo', '1.2.0']);
  assert.deepEqual(esp.builds, [{ chipFamily: 'ESP32-S3', serialType: null }, { chipFamily: 'ESP32-C3', serialType: null }]);
  assert.deepEqual(esp.files.map((f) => [f.name, f.size]), [['gizmo_1.2.0_esp32s3.bin', 100], ['gizmo_1.2.0_esp32c3.bin', 70]]);
  assert.equal(esp.manifest.name, ESP_MANIFEST);
  assert.match(esp.id, /^[0-9a-f]{16}$/);
  assert.deepEqual(by.alpha.install.downloads, [
    { kind: 'img', name: 'gizmo_1.2.0_rpi4.img.xz', size: 7, url: 'https://github.com/zUrp-Astronomics/alpha/releases/download/v2-rc1/gizmo_1.2.0_rpi4.img.xz' },
    { kind: 'hex', name: 'gizmo_1.2.0_stm32f411.hex', size: 9, url: 'https://github.com/zUrp-Astronomics/alpha/releases/download/v2-rc1/gizmo_1.2.0_stm32f411.hex' },
  ], 'linked at their browser_download_url, by name');

  assert.equal(by.bravo.install.tag, 'v2');
  assert.equal(by.bravo.install.esp, null, 'no fall back to the ESP of an older release');
  assert.deepEqual(by.bravo.install.downloads.map((d) => d.name), ['gizmo_2.0.0_stm32f411.hex']);
  assert.equal(by.charlie.install, null, 'no installable file: nothing to install, and no error');
  assert.equal(by.delta.install, null, 'no release: nothing to install');
  assert.deepEqual(installRejected, []);
  assert.deepEqual(downloads.sort(), ['v2-rc1/gizmo_1.2.0_esp32c3.bin', 'v2-rc1/gizmo_1.2.0_esp32s3.bin', `v2-rc1/${ESP_MANIFEST}`].sort(),
    'only the manifest of ONE release and the files it names: never a .hex, an .img.xz or another file');
});

// 2 -------------------------------------------------------------------------------------------------
test('2. the manifest is validated: the canonical manifests pass (serialType pairs included), every rule refuses, each problem naming its field', () => {
  const names = [...new Set([...Object.keys(FILES), ...CANONICAL.builds.flatMap((b) => b.parts.map((p) => p.path))])];
  const assets = names.map((name) => ({ name }));
  const problems = (m) => espManifestProblems(m, assets).join('\n');
  const with1 = (b, more = {}) => ({ name: 'Gizmo', version: '1.2.0', ...more, builds: [b] });
  const part = (p) => with1({ chipFamily: 'ESP32', parts: [p] });

  assert.equal(problems(CANONICAL), '', 'the README example of ESP Web Tools 10.4.0 — two ESP32-S3 builds by serialType, shared files');
  assert.equal(problems(JSON.parse(manifest(ESP))), '', 'the contract: one merged image per chip at offset 0');
  assert.equal(problems({ ...JSON.parse(manifest(ESP)), new_install_prompt_erase: true, improv: false, funding_url: 'x', anything: 1 }), '', 'other fields pass as they are');
  assert.equal(problems(with1({ chipFamily: 'ESP32', parts: [{ path: 'esp32.bin', offset: 0, extra: 'kept' }], extra: 1 })), '', 'other fields of a build or a part too');

  assert.match(problems([]), /the manifest is not a JSON object/);
  assert.match(problems({ version: '1', builds: ESP }), /field `name`: missing/);
  assert.match(problems({ name: ' ', version: '1', builds: ESP }), /field `name`: must be a non-empty text/);
  assert.match(problems({ name: 'G', version: 1, builds: ESP }), /field `version`: must be a non-empty text/);
  assert.match(problems({ name: 'G', version: '1' }), /field `builds`: missing/);
  assert.match(problems({ name: 'G', version: '1', builds: [] }), /field `builds`: must be a list of at least one build/);
  assert.match(problems(with1('ESP32')), /field `builds\[0\]`: must be an object/);
  assert.match(problems(with1({ parts: [{ path: 'esp32.bin', offset: 0 }] })), /field `builds\[0\]\.chipFamily`: missing/);
  assert.match(problems(with1(build('esp32s3', 'esp32.bin'))), /field `builds\[0\]\.chipFamily`: "esp32s3" is not a chip family of ESP Web Tools 10\.4\.0 \(ESP32, .*ESP8266\)/);
  assert.match(problems(with1(build('ESP32-S3', 'esp32.bin', { serialType: 'usb' }))), /field `builds\[0\]\.serialType`: "usb" is not one of: cdc, uart/);
  assert.match(problems(with1(build('ESP32-S3', 'esp32.bin', { serialType: null }))), /field `builds\[0\]\.serialType`: null is not one of/);
  assert.match(problems({ name: 'G', version: '1', builds: [ESP[0], ESP[1], ESP[0]] }),
    /field `builds\[2\]`: a second build for ESP32-S3 without serialType \(the first is builds\[0\]\)/);
  assert.match(problems({ name: 'G', version: '1', builds: [CANONICAL.builds[3], CANONICAL.builds[4], CANONICAL.builds[3]] }),
    /field `builds\[2\]`: a second build for ESP32-S3 with serialType uart \(the first is builds\[0\]\)/);
  assert.equal(problems({ name: 'G', version: '1', builds: [ESP[0], { ...ESP[0], serialType: 'cdc' }] }), '', 'a fallback build and a cdc build of one chip: two pairs');
  assert.match(problems(with1({ chipFamily: 'ESP32' })), /field `builds\[0\]\.parts`: must be a list of at least one part/);
  assert.match(problems(with1({ chipFamily: 'ESP32', parts: [] })), /field `builds\[0\]\.parts`: must be a list of at least one part/);
  assert.match(problems(part('esp32.bin')), /field `builds\[0\]\.parts\[0\]`: must be an object \{ path, offset \}/);
  assert.match(problems(part({ offset: 0 })), /parts\[0\]\.path`: missing/);
  assert.match(problems(part({ path: 'esp32.bin' })), /parts\[0\]\.offset`: missing/);
  for (const offset of ['0x0', -1, 1.5, '0', null]) assert.match(problems(part({ path: 'esp32.bin', offset })), /parts\[0\]\.offset`: .* is not an integer ≥ 0/, JSON.stringify(offset));
  for (const path of ['dir/esp32.bin', '../esp32.bin', 'https://example.com/esp32.bin', 'esp32.bin?x', 'esp32.bin#x', 'a\\b.bin', '..', '']) {
    assert.match(problems(part({ path, offset: 0 })), /parts\[0\]\.path`: .* must be the bare name of a file attached to this release/, JSON.stringify(path));
  }
  assert.match(problems(part({ path: 'gone.bin', offset: 0 })), /parts\[0\]\.path`: "gone\.bin" is not a file attached to this release/);
  assert.match(problems(part({ path: ESP_MANIFEST, offset: 0 })), /parts\[0\]\.path`: "manifest\.json" is not a file attached to this release/, 'the manifest is not an image');

  assert.deepEqual(['esp32.bin', 'gizmo_1.2.0_esp32s3.bin', 'a b.bin', 'é.bin', 'x%20y.bin'].map(isBareFileName), [true, true, true, true, false],
    'a bare name is found under that very name relative to the manifest\'s URL (a % would be decoded)');
});

// 3 -------------------------------------------------------------------------------------------------
test('3. an invalid manifest, or a file it names that is not attached: the ESP is NOT published, never an older one; the release\'s .hex stays; the report says why', async () => {
  const older = rel('v1', '2026-09-01T00:00:00Z', { files: { [ESP_MANIFEST]: manifest(ESP), ...FILES } });
  const sim = makeSim(
    { alpha: repo(), bravo: repo(), charlie: repo(), delta: repo() },
    {
      alpha: [older, rel('v2', '2026-10-01T00:00:00Z', { files: { [ESP_MANIFEST]: manifest([build('ESP32-S9', 'gizmo_1.2.0_esp32s3.bin')]), ...FILES } })],
      bravo: [older, rel('v2', '2026-10-01T00:00:00Z', { files: { [ESP_MANIFEST]: manifest(ESP), 'gizmo_1.2.0_esp32s3.bin': FILES['gizmo_1.2.0_esp32s3.bin'] } })],
      charlie: [rel('v2', '2026-10-01T00:00:00Z', { files: { [ESP_MANIFEST]: '{ "builds": ' } })],
      delta: [rel('v2', '2026-10-01T00:00:00Z', { files: { [ESP_MANIFEST]: manifest([]), 'gizmo_2.0.0_stm32f411.hex': 'hex' } })],
    },
  );
  const { products, skipped, installRejected } = await readRepoProducts(simulatorBackend(sim), { sectionIds });
  assert.deepEqual(skipped, [], 'the products are not skipped');
  const by = Object.fromEntries(products.map((p) => [p.slug, p]));
  assert.deepEqual([by.alpha.install, by.bravo.install, by.charlie.install], [null, null, null], 'no fall back to v1, nothing else installable');
  assert.equal(by.delta.install.tag, 'v2');
  assert.equal(by.delta.install.esp, null, 'the manifest is rejected…');
  assert.deepEqual(by.delta.install.downloads.map((d) => d.name), ['gizmo_2.0.0_stm32f411.hex'], '…the .hex of the same release is still linked');
  const rejected = Object.fromEntries(installRejected.map((r) => [r.repo, r.problems.join('\n')]));
  assert.match(rejected.alpha, /^repository alpha, release "v2" \(manifest\.json\): field `builds\[0\]\.chipFamily`: "ESP32-S9" is not a chip family/);
  assert.match(rejected.bravo, /repository bravo, release "v2" .*field `builds\[1\]\.parts\[0\]\.path`: "gizmo_1\.2\.0_esp32c3\.bin" is not a file attached to this release/);
  assert.match(rejected.charlie, /repository charlie, release "v2" .*not valid JSON/);
  assert.match(rejected.delta, /repository delta, release "v2" .*field `builds`: must be a list of at least one build/);

  const report = catalogReport({ read: 'test', products: products.map((p) => ({ ...p, repo: 'r' })), skipped, ignoredReleases: [], installRejected });
  assert.ok(report.warnings.some((w) => /^ESP manifest rejected — repository alpha, release "v2"/.test(w)), 'a warning (an annotation on GitHub Actions)');
  assert.match(report.markdown, /### ESP manifests rejected \(ESP install not published\)/);
  assert.match(report.lines.find((l) => l.includes('repository alpha')), /ESP manifest REJECTED, not published$/);
  assert.match(report.lines.find((l) => l.includes('repository delta')), /install v2: download gizmo_2\.0\.0_stm32f411\.hex; ESP manifest REJECTED, not published$/);
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

test('4. GitHub: the manifest and its files downloaded through the API (200 with the bytes), with the token; the .hex linked at its browser_download_url, never downloaded; a failed download fails the build', async () => {
  const content = {
    [ESP_MANIFEST]: manifest([ESP[1]]),
    'gizmo_1.2.0_esp32c3.bin': FILES['gizmo_1.2.0_esp32c3.bin'],
    'gizmo_1.2.0_stm32f411.hex': 'hex',
    'other.zip': 'zip',
  };
  const assets = Object.entries(content).map(([name, c], i) => ({
    id: 100 + i,
    name,
    size: Buffer.byteLength(c),
    browser_download_url: `https://github.com/zUrp-Astronomics/Gizmo/releases/download/v1/${name}`,
  }));
  const calls = [];
  const answer = (id) => new Response(content[assets.find((a) => a.id === id).name]);
  const read = (a = answer, list = assets) => readRepoProducts(githubBackend({ token: 'T', fetchImpl: mockGitHub({ assets: list, answer: a, calls }) }), { sectionIds });
  const { products } = await read();
  assert.equal(products[0].install.tag, 'v1');
  assert.deepEqual(products[0].install.esp.files.map((f) => [f.name, f.size]), [['gizmo_1.2.0_esp32c3.bin', 70]]);
  assert.deepEqual(products[0].install.downloads, [
    { kind: 'hex', name: 'gizmo_1.2.0_stm32f411.hex', size: 3, url: 'https://github.com/zUrp-Astronomics/Gizmo/releases/download/v1/gizmo_1.2.0_stm32f411.hex' },
  ]);
  const downloads = calls.filter((c) => c.url.includes('/releases/assets/'));
  assert.deepEqual(downloads.map((c) => c.url.split('/').pop()), ['100', '101'], 'the manifest and the file it names; never the .hex nor other.zip; no request to list the assets');
  for (const d of downloads) {
    assert.ok(d.url.startsWith('https://api.github.com/repos/zUrp-Astronomics/Gizmo/releases/assets/'), 'through the API, never the github.com download URL');
    assert.equal(d.accept, 'application/octet-stream');
    assert.equal(d.auth, 'Bearer T');
  }
  await assert.rejects(read(() => new Response('boom', { status: 502 })), /HTTP 502/, 'a backend error fails the build');
  await assert.rejects(read((id) => new Response(id === 101 ? 'short' : content[ESP_MANIFEST])), /gizmo_1\.2\.0_esp32c3\.bin downloaded as 5 bytes, the release lists 70/);
  await assert.rejects(read(answer, assets.map(({ browser_download_url, ...a }) => a)), /lists gizmo_1\.2\.0_stm32f411\.hex without a browser_download_url/);
});

test('4b. GitHub: an asset answered by a 302 to a storage host is followed, and the token never goes to that host', async () => {
  const bytes = { [ESP_MANIFEST]: manifest([ESP[1]]), 'gizmo_1.2.0_esp32c3.bin': FILES['gizmo_1.2.0_esp32c3.bin'] };
  const seen = [];
  const listen = (handler) => new Promise((ok) => { const s = createServer(handler); s.listen(0, '127.0.0.1', () => ok(s)); });
  const storage = await listen((req, res) => {
    seen.push({ host: 'storage', auth: req.headers.authorization ?? null });
    res.end(bytes[decodeURIComponent(req.url.slice(1))]);
  });
  const names = Object.keys(bytes);
  const assets = names.map((name, i) => ({ id: i + 1, name, size: Buffer.byteLength(bytes[name]), browser_download_url: `https://github.com/x/${name}` }));
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
    assert.deepEqual(products[0].install.esp.files.map((f) => [f.name, f.size]), [['gizmo_1.2.0_esp32c3.bin', 70]]);
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
test('5. ESP Web Tools is pinned exactly at 10.4.0, and the chip families and serial types the site accepts are those of its src/const.ts', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['esp-web-tools'], ESP_WEB_TOOLS_VERSION, 'an exact version, no range');
  const installed = join(ROOT, 'node_modules', 'esp-web-tools');
  assert.equal(JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8')).version, ESP_WEB_TOOLS_VERSION, 'the version installed by npm ci');
  const source = readFileSync(join(installed, 'src', 'const.ts'), 'utf8');
  const union = (field) => [...(source.match(new RegExp(`${field}\\??:\\s*((?:\\|?\\s*"[^"]+"\\s*)+);`))?.[1] ?? '').matchAll(/"([^"]+)"/g)].map(([, v]) => v);
  assert.deepEqual([...ESP_CHIP_FAMILIES].sort(), union('chipFamily').sort(), 'Build["chipFamily"] of src/const.ts');
  assert.deepEqual([...ESP_SERIAL_TYPES].sort(), union('serialType').sort(), 'Build["serialType"] of src/const.ts');
  // The page leaves the browser message to ESP Web Tools (the human's rule): its default is there, and
  // the site's own texts of the block say nothing on browsers.
  assert.match(readFileSync(join(installed, 'src', 'install-button.ts'), 'utf8'), /<slot name='unsupported'>[^<]+<\/slot>/);
  assert.doesNotMatch(JSON.stringify(siteContent(ROOT).product.install), /chrome|edge|firefox|browser/i);
});

// 6 -------------------------------------------------------------------------------------------------
test('6. the offline build: Basilisk installs the ESP of v0.1.0 (two chip families), not its later v0.2.0; Maelstrom a .hex, Cyclops an .img.xz, linked on GitHub; the bytes are beside the snapshot, never in it', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zurp-root-'));
  cpSync(join(ROOT, 'content'), join(root, 'content'), { recursive: true });
  cpSync(join(ROOT, 'catalog-simulator'), join(root, 'catalog-simulator'), { recursive: true });
  await readAndSnapshot({ root, env: { ZURP_CATALOG: 'simulator' }, sectionIds });
  const snapshotFile = join(root, '.zurp-catalog', 'remote.json');
  const { products, installRejected } = await loadBuiltCatalog({ snapshotFile, root });
  const by = Object.fromEntries(products.map((p) => [p.slug, p]));
  assert.deepEqual(installRejected, []);
  assert.deepEqual(products.filter((p) => p.install).map((p) => p.slug).sort(), ['basilisk', 'cyclops', 'maelstrom'], 'the others install nothing (Unicorn runs TeenAstro)');

  assert.equal(by.basilisk.release.tag, 'v0.2.0');
  assert.equal(by.basilisk.install.tag, 'v0.1.0');
  assert.deepEqual(by.basilisk.install.esp.builds.map((b) => b.chipFamily), ['ESP32-S3', 'ESP32-C3']);
  assert.deepEqual(by.basilisk.install.downloads, []);
  assert.deepEqual(by.maelstrom.install.downloads.map((d) => [d.kind, d.url]), [['hex', 'https://github.com/zUrp-Astronomics/maelstrom/releases/download/v0.1.0/maelstrom_0.1.0_stm32f411.hex']]);
  assert.deepEqual(by.cyclops.install.downloads.map((d) => [d.kind, d.url]), [['img', 'https://github.com/zUrp-Astronomics/cyclops/releases/download/v0.1.0/cyclops_0.1.0_rpi4.img.xz']]);
  assert.equal(by.maelstrom.install.esp, null);

  const text = readFileSync(snapshotFile, 'utf8');
  assert.ok(!text.includes('installFiles') && !text.includes('NOT a firmware'), 'no bytes in the snapshot');
  const esp = by.basilisk.install.esp;
  for (const f of [esp.manifest, ...esp.files]) {
    const file = join(root, '.zurp-catalog', 'firmware', f.sha256);
    assert.ok(existsSync(file) && readFileSync(file).length === f.size, `${f.name} written beside the snapshot`);
  }
  assert.deepEqual(readFileSync(join(root, '.zurp-catalog', 'firmware', esp.manifest.sha256)),
    readFileSync(join(ROOT, 'catalog-simulator', 'releases', 'basilisk', 'v0.1.0', ESP_MANIFEST)), 'the manifest as is, byte for byte');
});

// 7 -------------------------------------------------------------------------------------------------
test('7. the published paths: one folder per ESP publication, whose id changes as soon as the manifest or a file it names does', () => {
  const files = [{ name: 'a.bin', sha256: '1'.repeat(64) }, { name: 'b.bin', sha256: '2'.repeat(64) }];
  const id = espId('0'.repeat(64), files);
  assert.match(id, /^[0-9a-f]{16}$/);
  assert.equal(espId('0'.repeat(64), [...files].reverse()), id, 'the order of the files does not matter');
  assert.notEqual(espId('9'.repeat(64), files), id, 'the manifest changes');
  assert.notEqual(espId('0'.repeat(64), [files[0], { ...files[1], sha256: '3'.repeat(64) }]), id, 'a file changes');
  assert.notEqual(espId('0'.repeat(64), [files[0], { ...files[1], name: 'c.bin' }]), id, 'a file is renamed');
  const esp = { id: 'abcdef0123456789', manifest: { name: ESP_MANIFEST }, files: [{ name: 'gizmo_1.2.0_esp32s3.bin' }] };
  assert.equal(espManifestPath('gizmo', esp), 'gizmo/firmware/abcdef0123456789/manifest.json');
  assert.equal(espManifestUrlPath('gizmo', esp), '/gizmo/firmware/abcdef0123456789/manifest.json');
  assert.deepEqual(espPublishedPaths('gizmo', esp), ['gizmo/firmware/abcdef0123456789/manifest.json', 'gizmo/firmware/abcdef0123456789/gizmo_1.2.0_esp32s3.bin'],
    'the files beside the manifest: ESP Web Tools resolves `path` relative to its URL');
});

// 8 -------------------------------------------------------------------------------------------------
// The page is the one src/pages/[slug]/index.astro renders, as Astro writes it (compressed, scoped
// `data-astro-cid-*` attributes, text escaped): what the check reads on dist/<slug>/index.html.
const TEXTS = siteContent(ROOT).product.install;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const CID = 'data-astro-cid-7a3f2k1q';
const SCRIPT = '/_astro/EspInstallButton.astro_astro_type_script_index_0_lang.Ab12Cd34.js';
const espPart = (manifestUrl) =>
  `<div class="install-esp" ${CID}><p ${CID}>${esc(TEXTS.esp.intro)}</p><esp-web-install-button manifest="${esc(manifestUrl)}" data-astro-cid-jj5qd7wt="true"><button slot="activate" class="esp-install" data-astro-cid-jj5qd7wt>${esc(TEXTS.esp.button)}</button></esp-web-install-button><script type="module" src="${SCRIPT}"></script></div>`;
const downloadPart = (kind, links) =>
  `<div class="install-download" ${CID}><ul class="install-links" ${CID}>${links
    .map((l) => `<li ${CID}><a class="repo-link" href="${esc(l.href)}" data-download="${kind}" ${CID}><span class="repo-icon" aria-hidden="true" ${CID}>⟶</span><span class="repo-url" ${CID}>${esc(l.text)}</span></a></li>`)
    .join('')}</ul><p ${CID}>${esc(TEXTS[kind])}</p></div>`;
const installBlock = ({ tag, inner, id = 'install', version = fill(TEXTS.version, { tag }) }) =>
  `<section class="install" id="${id}" data-install ${CID}><h2 class="z2-band" ${CID}>${esc(TEXTS.title)}</h2><p class="install-version" ${CID}>${esc(version)}</p>${inner}</section>`;
const productPage = (block = '') =>
  `<!DOCTYPE html><html lang="en"><head><script type="module">/* site */</script></head><body><main class="z2-container" ${CID}><div class="sheet z2-plate" ${CID}><section class="lead" ${CID}><p class="pitch" ${CID}>A gizmo.</p></section><section class="description" ${CID}><h2 class="z2-band" ${CID}>About</h2><p ${CID}>First paragraph.</p></section>${block}<section class="repo" ${CID}><h2 class="z2-band" ${CID}>Source</h2><a class="repo-link" href="https://github.com/zUrp-Astronomics/Gizmo" ${CID}><span class="repo-icon" aria-hidden="true" ${CID}>⟶</span><span class="repo-url" ${CID}>github.com/zUrp-Astronomics/Gizmo</span></a></section></div></main></body></html>`;

test('8. the product page shows an #install block — the version, the ESP Web Tools button on the copied manifest with its script, the download links — only when the catalog holds an install; the firmware/ folder holds exactly the manifest and its files', () => {
  const dist = mkdtempSync(join(tmpdir(), 'zurp-dist-'));
  const put = (rel, content = 'x') => { mkdirSync(dirname(join(dist, rel)), { recursive: true }); writeFileSync(join(dist, rel), content); };
  put(SCRIPT.slice(1), 'const m=["_astro/install-dialog-x.js"];customElements.define(`esp-web-install-button`,o)');
  put('_astro/install-dialog-x.js');
  const opts = { texts: TEXTS, distDir: dist };

  const esp = {
    id: 'abcdef0123456789',
    builds: [{ chipFamily: 'ESP32-S3', serialType: null }],
    manifest: { name: ESP_MANIFEST, size: 0, sha256: '0'.repeat(64) },
    files: [{ name: 'gizmo_1.2.0_esp32s3.bin', size: 5, sha256: '1'.repeat(64) }],
  };
  const hex = { kind: 'hex', name: 'gizmo_1.2.0_stm32f411.hex', size: 3, url: 'https://github.com/zUrp-Astronomics/Gizmo/releases/download/v1.2.0/gizmo_1.2.0_stm32f411.hex' };
  const img = { kind: 'img', name: 'gizmo_1.2.0_rpi4.img.xz', size: 3, url: 'https://github.com/zUrp-Astronomics/Gizmo/releases/download/v1.2.0/gizmo_1.2.0_rpi4.img.xz' };
  const withEsp = { slug: 'gizmo', install: { tag: 'v1.2.0', esp, downloads: [] } };
  const withFiles = { slug: 'gizmo', install: { tag: 'v1.2.0', esp: null, downloads: [img, hex] } };
  const bare = { slug: 'gizmo', install: null };
  const manifestUrl = '/gizmo/firmware/abcdef0123456789/manifest.json';
  const link = (d) => ({ href: d.url, text: fill(TEXTS.download, { file: d.name }) });
  const filesInner = downloadPart('hex', [link(hex)]) + downloadPart('img', [link(img)]);
  const check = (product, block) => installBlockProblems(productPage(block), product, opts).join('\n');

  // The pages as the site writes them.
  assert.equal(check(withEsp, installBlock({ tag: 'v1.2.0', inner: espPart(manifestUrl) })), '', 'an ESP publication');
  assert.equal(check(withFiles, installBlock({ tag: 'v1.2.0', inner: filesInner })), '', 'downloads, hex first then img');
  assert.equal(check(bare), '', 'nothing to install: no block');

  // A product WITH an install.
  assert.match(check(withEsp), /dist\/gizmo\/index\.html: 0 #install block\(s\), the catalog holds an install \(v1\.2\.0\): expected 1/);
  assert.match(check(withEsp, installBlock({ tag: 'v1.2.0', inner: espPart(manifestUrl) }).replace(' data-install', '')), /0 #install block\(s\)/, 'found by data-install, a styled section is not one');
  assert.match(check(withEsp, installBlock({ tag: 'v1.2.0', id: 'flash', inner: espPart(manifestUrl) })), /the install block's id is "flash", expected "install" \(the stable anchor\)/);
  assert.match(check(withEsp, installBlock({ tag: 'v1.2.0', version: 'Version v1.1.0', inner: espPart(manifestUrl) })), /does not say "Version v1\.2\.0" \(the version installed\)/);
  assert.match(check(withEsp, installBlock({ tag: 'v1.2.0', inner: '' })), /0 ESP Web Tools button\(s\), 0 in the #install block — expected exactly 1, in it/);
  assert.match(check(withEsp, installBlock({ tag: 'v1.2.0', inner: espPart('/gizmo/firmware/0000000000000000/manifest.json') })),
    /the ESP Web Tools button's manifest is "\/gizmo\/firmware\/0000000000000000\/manifest\.json", expected "\/gizmo\/firmware\/abcdef0123456789\/manifest\.json"/);
  assert.match(check(withEsp, installBlock({ tag: 'v1.2.0', inner: espPart(manifestUrl).replace(/<script[^>]*><\/script>/, '') })),
    /no module script of the page defines <esp-web-install-button> — the install button is a dead tag/);
  assert.match(check(withFiles, installBlock({ tag: 'v1.2.0', inner: downloadPart('hex', [link(hex)]) })), /1 download link\(s\) in the #install block, the catalog has 2/);
  assert.match(check(withFiles, installBlock({ tag: 'v1.2.0', inner: downloadPart('hex', [{ ...link(hex), href: 'https://zurp-astronomics.github.io/gizmo/x.hex' }]) + downloadPart('img', [link(img)]) })),
    /download link 1: href is "https:\/\/zurp-astronomics\.github\.io\/gizmo\/x\.hex", expected "https:\/\/github\.com\/.*\.hex"/, 'linked where GitHub serves it');
  assert.match(check(withFiles, installBlock({ tag: 'v1.2.0', inner: filesInner + espPart(manifestUrl) })), /an ESP Web Tools button, the catalog holds no ESP publication for gizmo/);

  // A product WITHOUT an install.
  assert.match(check(bare, installBlock({ tag: 'v1.2.0', inner: filesInner })), /an #install block, the catalog holds nothing to install for gizmo/);
  assert.match(check(bare, `<p>${espPart(manifestUrl)}</p>`), /an ESP Web Tools button, the catalog holds nothing to install for gizmo/);

  // The firmware/ folder.
  assert.equal(espDirProblems(dist, bare).join('\n'), '', 'no ESP, no folder');
  assert.equal(espDirProblems(dist, withFiles).join('\n'), '', 'downloads only: no folder either');
  assert.match(espDirProblems(dist, withEsp).join('\n'), /^dist\/gizmo\/firmware\/ is missing, the catalog holds an ESP publication \(v1\.2\.0\)$/);
  const json = manifest([build('ESP32-S3', 'gizmo_1.2.0_esp32s3.bin')]);
  const sized = { ...withEsp, install: { ...withEsp.install, esp: { ...esp, manifest: { ...esp.manifest, size: Buffer.byteLength(json) } } } };
  put('gizmo/firmware/abcdef0123456789/manifest.json', json);
  put('gizmo/firmware/abcdef0123456789/gizmo_1.2.0_esp32s3.bin', 'SSSSS');
  assert.equal(espDirProblems(dist, sized).join('\n'), '', 'exactly the manifest and its files, at their sizes');
  assert.match(espDirProblems(dist, withEsp).join('\n'), /manifest\.json is \d+ bytes, the catalog gives 0/);
  assert.match(espDirProblems(dist, bare).join('\n'), /^dist\/gizmo\/firmware\/ exists, the catalog holds no ESP publication for gizmo$/);
  put('gizmo/firmware/abcdef0123456789/gizmo_1.2.0_esp32s3.bin', 'SSS');
  assert.match(espDirProblems(dist, sized).join('\n'), /^dist\/gizmo\/firmware\/abcdef0123456789\/gizmo_1\.2\.0_esp32s3\.bin is 3 bytes, the catalog gives 5$/);
  put('gizmo/firmware/abcdef0123456789/gizmo_1.2.0_esp32s3.bin', 'SSSSS');
  put('gizmo/firmware/9999999999999999/manifest.json');
  assert.match(espDirProblems(dist, sized).join('\n'), /^dist\/gizmo\/firmware\/9999999999999999\/manifest\.json: not a file of the ESP publication v1\.2\.0 of the catalog$/);
});
