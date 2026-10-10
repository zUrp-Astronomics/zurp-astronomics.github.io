// SOURCE: zurp-astronomics-site — assembles the full catalog: the products read from their repositories, in display order (sections, then the order inside a section)
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #72) — full discovery: no list of published products (a product nobody
//   holds is not in the catalog, without an error)
// REVISED: 2026-10-10 (ticket #92) — the products folder of content/ is gone: the catalog comes
//   only from the organisation's repositories, there is nothing left to merge
//
// Used, with the same inputs, by the site (src/data/catalog.ts) and by the scripts that run after
// the build (scripts/lib/catalog.mjs → check-dist, readme-kit, the catalog report): they all see the
// same catalog.
//
// RULES (the human's, 2026-10-06):
//   - the site publishes what it discovers: no list of products is kept by hand (ticket #72). A
//     product in no repository of the organisation is not in the catalog, and its URLs are not
//     generated;
//   - sections keep their fixed order (content/catalog.yml). Inside a section: the products with a
//     release first, the latest release on top (by its `published_at`); then those without a
//     release, by name in alphabetical order. There is no `order` field.
//
// It never reads anything of a product's `poster` (an image import, see src/lib/brand-images.ts:
// reading a property of it would copy the original file into dist/).

const byName = (a, b) => {
  const c = a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  return c !== 0 ? c : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
};

/** Order inside a section: latest release first, then no release, by name. */
export function compareInSection(a, b) {
  const ta = a.release ? Date.parse(a.release.publishedAt) : null;
  const tb = b.release ? Date.parse(b.release.publishedAt) : null;
  if (ta !== null && tb !== null && ta !== tb) return tb - ta;
  if (ta !== null && tb === null) return -1;
  if (ta === null && tb !== null) return 1;
  return byName(a, b);
}

/**
 * @template {{ slug: string, name: string, section: string, release?: { tag: string, publishedAt: string } | null, origin?: string }} P
 * @param {{ products: P[], sections: readonly { id: string }[] }} input
 * @returns {P[]} the products in display order (by section, then by the in-section rule).
 */
export function assembleCatalog({ products, sections }) {
  const problems = [];
  const where = (p) => p.origin ?? 'a product repository';
  // Two products with the same slug cannot be read (a slug is the repository name, and GitHub
  // refuses two names equal but for the case): a program error.
  const seen = new Map();
  for (const p of products) {
    if (seen.has(p.slug)) problems.push(`slug \`${p.slug}\` is read twice: in ${seen.get(p.slug)} and in ${where(p)}`);
    else seen.set(p.slug, where(p));
  }
  const sectionIds = sections.map((s) => s.id);
  for (const p of products) {
    if (!sectionIds.includes(p.section)) problems.push(`slug \`${p.slug}\` (${where(p)}): unknown section ${JSON.stringify(p.section)}`);
  }
  if (problems.length) {
    throw new Error(`catalog: ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  return sections.flatMap((s) => products.filter((p) => p.section === s.id).sort(compareInSection));
}
