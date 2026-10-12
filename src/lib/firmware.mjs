// SOURCE: zurp-astronomics-site — the published firmware of a product: its paths in dist/, the ESP Launchpad TOML of each chip, the Launchpad link, the chip's readable name
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #96
//
// What the site publishes of the firmware read by src/lib/catalog/firmware.mjs. Plain JavaScript, so
// that the pages (src/pages/[slug]/…), the post-build guard (scripts/check-dist.mjs), the README kit
// (scripts/readme-kit.mjs) and the tests share it.
//
// PATHS IN dist/ (the contract sent to the products, 2026-10-12):
//   <slug>/firmware/<chip>.toml              THE STABLE URL, the only one the contract gives the
//                                            products: their READMEs link it forever (through the
//                                            Launchpad link) — never move or rename it;
//   <slug>/firmware/<sha256:16>/<file>       each binary, under the first 16 hex digits of the SHA-256
//                                            of its bytes: its path changes as soon as its content
//                                            does. WHY: Pages caches 10 minutes. At a fixed path a
//                                            browser could pair a new TOML with a bootloader still in
//                                            its cache and flash a mix; at a versioned path the worst
//                                            case is a clean 404 for 10 minutes at most.
// The slug is [a-z0-9_-] (read.mjs) and the chip ^esp32[a-z0-9]*$: the TOML URL needs no encoding.
// The file name is GitHub's asset name, percent-encoded in the URLs.
//
// THE TOML (Espressif's Minimal Launchpad, checked in espressif/esp-launchpad on 2026-10-12:
// config/minimal_launchpad_config.toml and src/lib/tomlConfig.ts, getMinimalFlashParts): TOML 1.0,
// at its root `esp_toml_version = 1.0`, `supported_apps` (one app: Launchpad uses the first),
// `multipart = true`, `chip`; the app's table holds `icon` (the product's poster) and
// `image.<chip>.parts` (ABSOLUTE URLs: Launchpad fetches them from espressif.github.io) and
// `image.<chip>.addresses` (the offsets, as texts: Launchpad reads them with parseInt), same length,
// same order. ONE TOML describes ONE chip. Launchpad does not refuse a board of another chip (it
// warns, then flashes, after erasing the whole flash): every link names its chip.

/** Espressif's Minimal Launchpad: `?flashConfigURL=<the absolute URL of the TOML>`. */
export const LAUNCHPAD_URL = 'https://espressif.github.io/esp-launchpad/minimal-launchpad/';

/** Published path of the TOML of `chip`, relative to the site root (the stable URL). */
export const firmwareTomlPath = (slug, chip) => `${slug}/firmware/${chip}.toml`;

/** Published path of a binary (a part of the firmware), relative to the site root. */
export const firmwarePartPath = (slug, part) => `${slug}/firmware/${part.sha256.slice(0, 16)}/${part.file}`;

/** The same path as a URL path (the file name percent-encoded). */
const partUrlPath = (slug, part) => `${slug}/firmware/${part.sha256.slice(0, 16)}/${encodeURIComponent(part.file)}`;

/**
 * The Launchpad link that flashes the TOML at `tomlUrl`. Not encoded: Launchpad takes the value as is
 * when the query has several parameters, decoded when it has one — the same for a URL without `%`,
 * `&` or `+`, which a TOML URL of this site never holds (see the paths above).
 */
export const launchpadLink = (tomlUrl) => `${LAUNCHPAD_URL}?flashConfigURL=${tomlUrl}`;

/** The readable name of a chip, as Espressif writes it: esp32 → ESP32, esp32s3 → ESP32-S3, esp32c61 → ESP32-C61. */
export function chipLabel(chip) {
  const rest = chip.replace(/^esp32/i, '');
  return rest ? `ESP32-${rest.toUpperCase()}` : 'ESP32';
}

/** A TOML basic string: `"`, `\` and the control characters escaped (TOML 1.0; also a JSON string). */
export function tomlString(s) {
  return `"${String(s).replace(/["\\\u0000-\u001f\u007f]/g, (c) => (c === '"' ? '\\"' : c === '\\' ? '\\\\' : `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`))}"`;
}

/**
 * The Launchpad TOML of one chip of a product's firmware.
 * @param {{ site: string, slug: string, appName: string, chip: { chip: string, parts: Array<{ offset: string, file: string, sha256: string }> } }} input
 *   `site` the site's absolute URL (`site` of astro.config.mjs); `appName` what Launchpad shows (the
 *   product, the tag and the chip: content/site.yml, `product.flash.appName`)
 */
export function firmwareToml({ site, slug, appName, chip }) {
  const base = String(site).replace(/\/+$/, '');
  const list = (items) => `[${items.map(tomlString).join(', ')}]`;
  const key = chip.chip;
  return [
    'esp_toml_version = 1.0',
    `supported_apps = [${tomlString(appName)}]`,
    'multipart = true',
    `chip = ${tomlString(key)}`,
    '',
    `[${tomlString(appName)}]`,
    `icon = ${tomlString(`${base}/brand/posters/${slug}.webp`)}`,
    `image.${key}.parts = ${list(chip.parts.map((p) => `${base}/${partUrlPath(slug, p)}`))}`,
    `image.${key}.addresses = ${list(chip.parts.map((p) => p.offset))}`,
    '',
  ].join('\n');
}
