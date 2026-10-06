// SOURCE: zurp-astronomics-site — the slugs of every product the site has published: a product on this list may never vanish from the catalog in silence
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
//
// WHY. A product's stable URLs (/<slug>/, /brand/posters/<slug>.webp, /brand/social/<slug>.jpg)
// are linked from READMEs on GitHub. Since the catalog is read from the organisation's repositories
// (src/lib/catalog/), a sheet removed, a repository renamed, or a sheet not pushed yet would make a
// product disappear from the next deployment, and those links would break. Nothing else remembers
// what was published, so this list does: the build FAILS when one of these slugs is missing from
// the catalog (src/lib/catalog/assemble.mjs), and GitHub Pages keeps serving the previous
// deployment.
//
// REMOVING a product is a deliberate act, done here: delete its slug from this list in the same
// change.
//
// ADDING. A product that appears in the catalog without being on this list is built and published
// normally, with a warning (the build log, scripts/check-dist.mjs): add its slug here, so that its
// disappearance is guarded too. The build cannot add it itself — no workflow commits in this
// repository.

export const publishedSlugs = [
  'kaiju',
  'berserker',
  'unicorn',
  'kraken',
  'maelstrom',
  'cyclops',
  'wraith',
  'basilisk',
];
