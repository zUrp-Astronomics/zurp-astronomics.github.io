// SOURCE: zurp-astronomics-site — assembles the full catalog: products still in content/products/ + products read from their repositories; one place per product (the repository wins), order inside a section
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the local products are content/products/<slug>/, no longer src/data/products.ts
// REVISED: 2026-10-06 (ticket #72) — full discovery: no list of published products (a product nobody
//   holds is not in the catalog, without an error); a slug in a repository and in content/products/:
//   the repository's sheet wins, the folder is ignored with a warning
//
// Used, with the same inputs, by the site (src/data/catalog.ts) and by the scripts that run after
// the build (scripts/lib/catalog.mjs → check-dist, readme-kit, the catalog report): they all see the
// same catalog.
//
// RULES (the human's, 2026-10-06):
//   - the site publishes what it discovers: no list of products is kept by hand (ticket #72). A
//     product neither in a repository of the organisation nor in content/products/ is not in the
//     catalog, and its URLs are not generated;
//   - a slug both in a repository (a VALID sheet: an invalid one was skipped by the reader, and the
//     folder is then published) and in content/products/<slug>/: the repository's sheet wins, the
//     folder is ignored, with a warning (`overridden`) — move the folder out once its sheet is pushed;
//   - sections keep their fixed order (content/catalog.yml). Inside a section: the products with a
//     release first, the latest release on top (by its `published_at`); then those without a
//     release, by name in alphabetical order. The products of content/products/ have no release.
//     There is no `order` field.
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
 * @param {{ local: P[], remote: P[], sections: readonly { id: string }[] }} input
 * @returns {{ products: P[], overridden: Array<{ slug: string, kept: string, ignored: string, message: string }> }}
 *   products in display order (by section, then by the in-section rule); `overridden`: the folders
 *   of content/products/ ignored because a repository holds the same slug.
 */
export function assembleCatalog({ local, remote, sections }) {
  const problems = [];
  const where = (p, fallback) => p.origin ?? fallback;
  // Two products of one origin with the same slug cannot be read (one folder per slug; a slug is
  // the repository name, and GitHub refuses two names equal but for the case): a program error.
  for (const [list, fallback] of [[local, 'content/products/'], [remote, 'a product repository']]) {
    const seen = new Map();
    for (const p of list) {
      if (seen.has(p.slug)) problems.push(`slug \`${p.slug}\` is read twice: in ${seen.get(p.slug)} and in ${where(p, fallback)}`);
      else seen.set(p.slug, where(p, fallback));
    }
  }
  const remoteBySlug = new Map(remote.map((p) => [p.slug, p]));
  const overridden = [];
  const kept = [];
  for (const p of local) {
    const r = remoteBySlug.get(p.slug);
    if (!r) {
      kept.push(p);
      continue;
    }
    const keptAt = where(r, 'a product repository');
    const ignored = where(p, 'content/products/');
    overridden.push({
      slug: p.slug,
      kept: keptAt,
      ignored,
      message: `slug \`${p.slug}\`: the sheet of ${keptAt} is published, ${ignored} is ignored — remove that folder, the product has moved to its repository`,
    });
  }
  const all = [...kept, ...remote];
  const sectionIds = sections.map((s) => s.id);
  for (const p of all) {
    if (!sectionIds.includes(p.section)) problems.push(`slug \`${p.slug}\` (${where(p, 'the catalog')}): unknown section ${JSON.stringify(p.section)}`);
  }
  if (problems.length) {
    throw new Error(`catalog: ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  const products = sections.flatMap((s) => all.filter((p) => p.section === s.id).sort(compareInSection));
  return { products, overridden };
}
