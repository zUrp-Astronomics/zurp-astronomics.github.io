// SOURCE: zurp-astronomics-site — the firmware of a product: the release that provides it, its manifest zurp-firmware.json (validated), the files it names (downloaded)
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #96
//
// WHY (ticket #96). A product README links ESP Launchpad (Espressif's Minimal Launchpad) to flash the
// board in one click. Launchpad downloads from the browser: it needs CORS, which the release
// downloads of github.com do not answer and GitHub Pages does. So the site publishes the firmware of
// each product: a TOML per chip and the binaries it names (src/lib/firmware.mjs: paths, TOML).
//
// THE CONTRACT WITH THE PRODUCTS (sent on 2026-10-12 to the product repositories, Basilisk first —
// FIXED: a product builds its workflow on it; changing the name, the shape, the selection rule or the
// TOML URL breaks a product):
//   - the product attaches its binaries to a release (free names), then `zurp-firmware.json` LAST,
//     then sends the `zurp-catalog` dispatch to the site;
//   - the manifest is { "chips": { "<chip>": { "parts": [ { "offset": "0x…", "file": "<asset>" } ] } } }:
//     only `chips` at its root (`product` and `version` are refused: deduced from the repository and
//     the tag); a chip is an ESP-IDF / esptool target name (^esp32[a-z0-9]*$); each part has exactly
//     `offset` (^0x[0-9a-fA-F]+$) and `file` (no `/`, no `..`, the name of a file attached to the SAME
//     release); the parts of a chip never overlap (offset + size of the file);
//   - the release that provides the firmware is THE LATEST PUBLISHED RELEASE (same ranking as
//     read.mjs's latestRelease: drafts left out, by `published_at`, prereleases included) THAT CARRIES
//     zurp-firmware.json. A later release without a manifest takes nothing away: that is the nominal
//     case, the build of `release: published` runs before the product has attached its files, and the
//     README links must not drop meanwhile;
//   - an invalid manifest, or a file it names that is not attached: the product has NO firmware. No
//     fall back to an older release (it would serve an old version forever without its author
//     seeing it). The product itself is published; the problems are reported (`rejected`, the
//     catalog report), never thrown. A failure of the backend (GitHub answering badly) throws: the
//     build fails, as everywhere.
//
// WHAT IS READ (the human's rule, read.mjs): of everything attached to a release, ONLY the manifest of
// the release selected and the files THAT manifest names. The list of releases the backend already
// returned gives the assets (name, size, id): no other request to find them.

import { createHash } from 'node:crypto';

/** The manifest a product attaches to a release, last. */
export const FIRMWARE_MANIFEST = 'zurp-firmware.json';

const CHIP = /^esp32[a-z0-9]*$/;
const OFFSET = /^0x[0-9a-fA-F]+$/;
const DEDUCED = {
  product: 'the product is the repository',
  version: "the version is the release's tag",
};

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * The release that provides the firmware: the latest published one (drafts and unreadable dates left
 * out, as latestRelease does) whose assets hold zurp-firmware.json; null when none does.
 * @param {any[]} releases as the backend lists them (GitHub's objects, `assets` included)
 * @returns {{ tag: string, publishedAt: string, release: any } | null}
 */
export function firmwareRelease(releases) {
  let best = null;
  for (const r of releases) {
    if (r.draft || !r.published_at) continue;
    const t = Date.parse(r.published_at);
    if (Number.isNaN(t)) continue; // reported by latestRelease (read.mjs)
    if (!(r.assets ?? []).some((a) => a?.name === FIRMWARE_MANIFEST)) continue;
    if (!best || t > best.t) best = { t, tag: String(r.tag_name), publishedAt: new Date(t).toISOString(), release: r };
  }
  return best && { tag: best.tag, publishedAt: best.publishedAt, release: best.release };
}

/**
 * Validates a parsed manifest against the files attached to its release. Returns the list of
 * problems (empty when valid), each naming its field.
 * @param {unknown} manifest
 * @param {Array<{ name: string, size: number }>} assets the files attached to the same release
 */
export function firmwareManifestProblems(manifest, assets) {
  if (!isObject(manifest)) return ['the manifest is not a JSON object'];
  const problems = [];
  for (const key of Object.keys(manifest)) {
    if (DEDUCED[key]) problems.push(`field \`${key}\`: not allowed in the manifest (${DEDUCED[key]})`);
    else if (key !== 'chips') problems.push(`field \`${key}\`: unknown field`);
  }
  if (!('chips' in manifest)) return [...problems, 'field `chips`: missing'];
  const chips = manifest.chips;
  if (!isObject(chips) || Object.keys(chips).length === 0) {
    return [...problems, 'field `chips`: must be a table of at least one chip'];
  }
  const sizes = new Map(assets.map((a) => [a.name, a.size]));
  for (const [chip, value] of Object.entries(chips)) {
    const at = `chips.${chip}`;
    if (!CHIP.test(chip)) {
      problems.push(`field \`${at}\`: ${JSON.stringify(chip)} is not an ESP-IDF / esptool target name (lower case, no dash: esp32, esp32s3, esp32c3…)`);
    }
    if (!isObject(value)) {
      problems.push(`field \`${at}\`: must be an object holding \`parts\``);
      continue;
    }
    for (const key of Object.keys(value)) if (key !== 'parts') problems.push(`field \`${at}.${key}\`: unknown field`);
    const parts = value.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      problems.push(`field \`${at}.parts\`: must be a list of at least one part`);
      continue;
    }
    const placed = [];
    parts.forEach((part, i) => {
      const where = `${at}.parts[${i}]`;
      if (!isObject(part)) {
        problems.push(`field \`${where}\`: must be an object { offset, file }`);
        return;
      }
      for (const key of Object.keys(part)) if (key !== 'offset' && key !== 'file') problems.push(`field \`${where}.${key}\`: unknown field`);
      const own = [];
      if (!('offset' in part)) own.push(`field \`${where}.offset\`: missing`);
      else if (typeof part.offset !== 'string' || !OFFSET.test(part.offset)) {
        own.push(`field \`${where}.offset\`: ${JSON.stringify(part.offset)} is not a hexadecimal text "0x…"`);
      }
      const file = part.file;
      if (!('file' in part)) own.push(`field \`${where}.file\`: missing`);
      else if (typeof file !== 'string' || file.trim() === '') own.push(`field \`${where}.file\`: must be a file name`);
      else if (file.includes('/') || file.includes('..')) own.push(`field \`${where}.file\`: ${JSON.stringify(file)} must be a bare file name (no /, no ..)`);
      else if (!sizes.has(file)) own.push(`field \`${where}.file\`: ${JSON.stringify(file)} is not a file attached to this release`);
      problems.push(...own);
      // The overlap is checked between the parts that are readable.
      if (!own.length) placed.push({ i, offset: part.offset, start: BigInt(part.offset), size: BigInt(sizes.get(file) ?? 0) });
    });
    placed.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.i - b.i));
    // By offset; each part against the one before it that reaches furthest.
    let reach = null;
    for (const next of placed) {
      if (reach && (reach.start + reach.size > next.start || reach.start === next.start)) {
        problems.push(
          `field \`${at}.parts\`: parts[${reach.i}] (${reach.offset}, ${reach.size} bytes) overlaps parts[${next.i}] (${next.offset})`,
        );
      }
      if (!reach || next.start + next.size > reach.start + reach.size) reach = next;
    }
  }
  return problems;
}

/**
 * The firmware of repository `repo`, from the releases the backend listed. Returns:
 *   firmware   null, or { tag, publishedAt, chips: [{ chip, parts: [{ offset, file, size, sha256 }] }] }
 *              (chips and parts in the manifest's order);
 *   rejected   null, or the problems of the manifest of the release selected (each naming the
 *              repository, the release and the field): then `firmware` is null;
 *   files      Map sha256 → bytes of every file the firmware names (never in the snapshot).
 * Downloads the manifest of the release selected and, when it is valid, the files it names — nothing
 * else. A failure of the backend is not caught: it throws.
 * @param {{ downloadAsset(repo: string, release: any, asset: any): Promise<Buffer> }} backend
 * @param {string} repo
 * @param {any[]} releases
 */
export async function readFirmware(backend, repo, releases) {
  const none = { firmware: null, rejected: null, files: new Map() };
  const selected = firmwareRelease(releases);
  if (!selected) return none;
  const { tag, publishedAt, release } = selected;
  const assets = (release.assets ?? []).filter((a) => a && typeof a.name === 'string');
  const where = `repository ${repo}, release ${JSON.stringify(tag)} (${FIRMWARE_MANIFEST})`;
  const reject = (problems) => ({ ...none, rejected: problems.map((p) => `${where}: ${p}`) });

  const raw = await download(backend, repo, release, assets.find((a) => a.name === FIRMWARE_MANIFEST));
  let manifest;
  try {
    manifest = JSON.parse(raw.toString('utf8').replace(/^﻿/, ''));
  } catch (e) {
    return reject([`not valid JSON — ${String(e?.message ?? e).split('\n')[0]}`]);
  }
  const problems = firmwareManifestProblems(manifest, assets);
  if (problems.length) return reject(problems);

  const files = new Map();
  const byName = new Map();
  for (const name of new Set(Object.values(manifest.chips).flatMap((c) => c.parts.map((p) => p.file)))) {
    const bytes = await download(backend, repo, release, assets.find((a) => a.name === name));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    files.set(sha256, bytes);
    byName.set(name, { size: bytes.length, sha256 });
  }
  const chips = Object.entries(manifest.chips).map(([chip, { parts }]) => ({
    chip,
    parts: parts.map(({ offset, file }) => ({ offset, file, ...byName.get(file) })),
  }));
  return { firmware: { tag, publishedAt, chips }, rejected: null, files };
}

/** The bytes of `asset`, checked against the size the release lists: a mismatch is the backend's failure. */
async function download(backend, repo, release, asset) {
  const bytes = await backend.downloadAsset(repo, release, asset);
  if (typeof asset.size === 'number' && bytes.length !== asset.size) {
    throw new Error(
      `catalog: repository ${repo}, release ${JSON.stringify(release.tag_name)}: ${asset.name} downloaded as ${bytes.length} bytes, the release lists ${asset.size}`,
    );
  }
  return bytes;
}
