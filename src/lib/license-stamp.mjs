// SOURCE: zurp-astronomics-site — the licence stamp of a product page: the licence GitHub detects in the product's repository, or nothing
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — ticket #66
//
// THE RULE (the human's, 2026-10-06): « La licence, c'est le LICENSE à la racine du projet, comme
// absolument tout projet GitHub. » One system: the site shows what GitHub detects in the product's
// repository (`license` of the catalog, src/lib/catalog/read.mjs and local.mjs), and holds no
// licence rule of its own. Nothing to show is never an error:
//   - no licence (no repository, no LICENSE, no repository by the product's name) → no stamp at all:
//     no badge, no sentence, no placeholder text;
//   - a licence GitHub recognises → its SPDX id, as GitHub gives it (`GPL-3.0`); its full name as the
//     stamp's title;
//   - a LICENSE GitHub does not recognise (`spdx_id: "NOASSERTION"`, name « Other », e.g. an OCL
//     file) → a generic stamp, whose label is content/site.yml `product.licenseOther`. No name is
//     invented.
//
// Plain JavaScript, so that the product page (src/pages/[slug]/index.astro) and the post-build guard
// (scripts/check-dist.mjs) compute the same stamp from the same catalog.

/** GitHub's `spdx_id` for a LICENSE file it found but could not identify. */
export const UNRECOGNISED = 'NOASSERTION';

/**
 * The stamp of a licence, or null when there is none to show.
 * @param {{ spdx_id?: string | null, name?: string | null } | null | undefined} license
 * @param {{ licenseOther: string }} texts content/site.yml `product`
 * @returns {{ label: string, title: string | null } | null}
 */
export function licenseStamp(license, texts) {
  if (!license) return null;
  const spdx = typeof license.spdx_id === 'string' ? license.spdx_id.trim() : '';
  if (spdx && spdx !== UNRECOGNISED) {
    const name = typeof license.name === 'string' && license.name.trim() ? license.name.trim() : null;
    return { label: spdx, title: name };
  }
  const other = texts?.licenseOther;
  if (typeof other !== 'string' || !other.trim()) {
    throw new Error('content: content/site.yml: `product.licenseOther` (the stamp of a licence GitHub does not recognise) is missing');
  }
  return { label: other.trim(), title: null };
}
