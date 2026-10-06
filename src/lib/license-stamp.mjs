// SOURCE: zurp-astronomics-site — the two licences of a product, as its repository declares them: identified (software: GitHub's detection of LICENSE; hardware: the first line of LICENSE-HARDWARE), and their stamps on the product page
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — ticket #66, two licences since ticket #75
// REVISED: 2026-10-06 (ticket #75) — two licences, two files: the software one (LICENSE, GitHub's
//   detection, unchanged) and the hardware one (LICENSE-HARDWARE, its first line looked up in
//   content/licences.yml); one stamp each, « Software · … » and « Hardware · … »
//
// THE RULES (the human's, 2026-10-06):
//   - the software licence is `LICENSE` at the root of the product's repository, as GitHub detects it
//     (`license` of the catalog: { spdx_id, name }, src/lib/catalog/source.mjs): its SPDX id
//     (`GPL-3.0`), its full name as the stamp's title; a LICENSE GitHub does not recognise
//     (`spdx_id: "NOASSERTION"`, name « Other ») → the generic label of content/licences.yml
//     (`software.unrecognised`), no name invented;
//   - the hardware licence is `LICENSE-HARDWARE` at the root of the same repository (`hardwareLicense`
//     of the catalog: { title }, its first non-empty line, src/lib/catalog/read.mjs), looked up in the
//     titles of content/licences.yml (`hardware.titles`), case and spaces aside: a known title → its
//     short label, its full name as the title; an unknown one → the generic label
//     (`hardware.unrecognised`), the line as written as the title;
//   - no file → no licence of that kind: nothing shown for it, never an error;
//   - the site neither invents nor corrects a licence: a hardware licence in LICENSE (berserker's
//     CERN-OHL-S-2.0 today) is the SOFTWARE stamp, because that is where the repository declares it.
//     Nothing here sorts licence ids into kinds.
//
// Plain JavaScript, so that the product page (src/pages/[slug]/index.astro), the licence badges
// (src/lib/license-badge.mjs), the post-build guard (scripts/check-dist.mjs) and the tests compute
// the same stamps from the same catalog.

import { fill, licenseTitleKey } from './content.mjs';

/** GitHub's `spdx_id` for a LICENSE file it found but could not identify. */
export const UNRECOGNISED = 'NOASSERTION';

/**
 * The software licence of a product (`license` of the catalog), or null when there is none.
 * @param {{ spdx_id?: string | null, name?: string | null } | null | undefined} license
 * @param {{ software: { unrecognised: string } }} texts content/licences.yml (licenseContent)
 * @returns {{ label: string, title: string | null } | null}
 */
export function softwareLicense(license, texts) {
  if (!license) return null;
  const spdx = typeof license.spdx_id === 'string' ? license.spdx_id.trim() : '';
  if (spdx && spdx !== UNRECOGNISED) {
    const name = typeof license.name === 'string' && license.name.trim() ? license.name.trim() : null;
    return { label: spdx, title: name };
  }
  return { label: texts.software.unrecognised, title: null };
}

/**
 * The hardware licence of a product (`hardwareLicense` of the catalog), or null when there is none.
 * @param {{ title?: string | null } | null | undefined} hardware
 * @param {{ hardware: { unrecognised: string, titles: Array<{ title: string, label: string, name: string }> } }} texts
 * @returns {{ label: string, title: string | null } | null}
 */
export function hardwareLicense(hardware, texts) {
  const title = typeof hardware?.title === 'string' ? hardware.title.trim() : '';
  if (!title) return null;
  const key = licenseTitleKey(title);
  const known = texts.hardware.titles.find((t) => licenseTitleKey(t.title) === key);
  return known ? { label: known.label, title: known.name } : { label: texts.hardware.unrecognised, title };
}

/**
 * The licence of `kind` of a product, or null.
 * @param {{ license?: any, hardwareLicense?: any }} product
 * @param {'software' | 'hardware'} kind
 * @param {any} texts content/licences.yml (licenseContent)
 */
export function productLicense(product, kind, texts) {
  if (kind === 'software') return softwareLicense(product.license, texts);
  if (kind === 'hardware') return hardwareLicense(product.hardwareLicense, texts);
  throw new Error(`licence: unknown kind ${JSON.stringify(kind)}`);
}

/**
 * The stamps of a product page, one per licence the product has: `text` is the stamp as shown
 * (content/licences.yml `<kind>.stamp`, its {{licence}} the short label), `title` its tooltip.
 * @returns {{ software: { label: string, title: string | null, text: string } | null, hardware: { label: string, title: string | null, text: string } | null }}
 */
export function licenseStamps(product, texts) {
  const stamp = (kind) => {
    const l = productLicense(product, kind, texts);
    return l && { ...l, text: fill(texts[kind].stamp, { licence: l.label }).trim() };
  };
  return { software: stamp('software'), hardware: stamp('hardware') };
}
