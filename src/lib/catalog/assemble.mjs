// SOURCE: zurp-astronomics-site — assembles the full catalog: products still in content/products/ + products read from their repositories; one place per product, published products guarded, order inside a section
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the local products are content/products/<slug>/, no longer src/data/products.ts
//
// Used, with the same inputs, by the site (src/data/catalog.ts) and by the scripts that run after
// the build (scripts/lib/catalog.mjs → check-dist, readme-kit): they all see the same catalog.
//
// RULES (the human's, 2026-10-06):
//   - a product lives in ONE place, its repository's sheet or its folder content/products/<slug>/: a
//     slug found in both (or twice) fails the build;
//   - a published product never disappears in silence: a slug of src/data/published-slugs.mjs
//     missing from the catalog fails the build;
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
 * @param {{ local: P[], remote: P[], published: readonly string[], sections: readonly { id: string }[] }} input
 * @returns {{ products: P[], unguarded: string[] }} products in display order (by section, then
 *   by the in-section rule); `unguarded`: slugs in the catalog but not in the published list.
 */
export function assembleCatalog({ local, remote, published, sections }) {
  const problems = [];
  const all = [
    ...local.map((p) => ({ p, origin: p.origin ?? 'content/products/' })),
    ...remote.map((p) => ({ p, origin: p.origin ?? 'a product repository' })),
  ];
  const seen = new Map();
  for (const { p, origin } of all) {
    if (seen.has(p.slug)) {
      problems.push(
        `slug \`${p.slug}\` is defined twice: in ${seen.get(p.slug)} and in ${origin} — a product lives in one place (move its folder out of content/products/ once its sheet is in its repository)`,
      );
    } else seen.set(p.slug, origin);
  }
  const sectionIds = sections.map((s) => s.id);
  for (const { p, origin } of all) {
    if (!sectionIds.includes(p.section)) problems.push(`slug \`${p.slug}\` (${origin}): unknown section ${JSON.stringify(p.section)}`);
  }
  const missing = published.filter((s) => !seen.has(s));
  if (missing.length) {
    problems.push(
      `published product(s) missing from the catalog: ${missing.join(', ')}. Their /brand/… URLs are linked from READMEs: ` +
        'restore the sheet (9_Assets/zurp.yml) or the repository name, or remove the product deliberately from src/data/published-slugs.mjs',
    );
  }
  if (problems.length) {
    throw new Error(`catalog: ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  const products = sections.flatMap((s) =>
    all
      .map(({ p }) => p)
      .filter((p) => p.section === s.id)
      .sort(compareInSection),
  );
  const unguarded = products.map((p) => p.slug).filter((s) => !published.includes(s));
  return { products, unguarded };
}

/** The warning printed when a product is published without being on the guarded list. */
export function unguardedWarning(unguarded) {
  return unguarded.length
    ? `catalog: product(s) not in src/data/published-slugs.mjs: ${unguarded.join(', ')} — published, but their disappearance would go unnoticed; add them to the list.`
    : null;
}
