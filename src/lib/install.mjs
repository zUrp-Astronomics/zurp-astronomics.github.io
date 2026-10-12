// SOURCE: zurp-astronomics-site — what the site publishes of a product's installable release: the paths of its ESP Web Tools folder in dist/, the chip families of its manifest
// AUTHOR: engineer
// DATE: 2026-10-12
// STATUS: active — ticket #101 (replaces src/lib/firmware.mjs, the ESP Launchpad TOML of ticket #96)
//
// What the site publishes of the install read by src/lib/catalog/install.mjs. Plain JavaScript, so
// that the page (src/pages/[slug]/…), the post-build guard (scripts/check-dist.mjs) and the tests
// share it.
//
// PATHS IN dist/:
//   <slug>/firmware/<id>/manifest.json   the manifest, copied AS IS (the bytes of the release);
//   <slug>/firmware/<id>/<file>          each file it names, beside it.
// ESP Web Tools resolves each part's `path` relative to the manifest's URL (its docs: « Part paths
// are resolved relative to the path of the manifest »; src/flash.ts: `new URL(part.path,
// manifestURL)`), so nothing is rewritten. <id> changes as soon as the manifest or one of its files
// does (src/lib/catalog/install.mjs, espId). WHY: Pages caches 10 minutes. At a fixed path a browser
// could pair a new manifest with an image still in its cache and flash a mix; at a versioned path the
// worst case is a stale but coherent pair, or a clean 404, for 10 minutes at most. No stable URL is
// promised to the products: their README links the product page (the contract's sentence, § 6 of
// content/readme-kit/guide.md), which the site rewrites at each build.
// The slug is [a-z0-9_-] (read.mjs), the id hexadecimal: only the file name needs encoding in a URL.

/** The folder of a product's ESP publication, relative to the site root. */
export const espDirPath = (slug, esp) => `${slug}/firmware/${esp.id}`;

/** The manifest's published path, relative to the site root. */
export const espManifestPath = (slug, esp) => `${espDirPath(slug, esp)}/${esp.manifest.name}`;

/** The manifest's URL path on the site (what the button's `manifest` attribute holds). */
export const espManifestUrlPath = (slug, esp) => `/${espDirPath(slug, esp)}/${encodeURIComponent(esp.manifest.name)}`;

/** Every published path of a product's ESP folder: the manifest first, then the files it names. */
export const espPublishedPaths = (slug, esp) => [esp.manifest, ...esp.files].map((f) => `${espDirPath(slug, esp)}/${f.name}`);

/** The chip families of a manifest's builds, each once, in the manifest's order. */
export const espChipFamilies = (esp) => [...new Set(esp.builds.map((b) => b.chipFamily))];
