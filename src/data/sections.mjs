// SOURCE: zurp-astronomics-site — catalog sections of the home page, in display order
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
//
// Plain JavaScript (not TypeScript) so that the catalog reader (src/lib/catalog/), which also runs
// under bare Node in the tests and the scripts, can validate a product sheet's `section` against
// it. src/data/products.ts re-exports it: the site imports it from there as before.
//
// The order of the sections is fixed here, by hand (Mounts, Cameras, Gadgets, Future). The order of
// the products INSIDE a section is not: see src/lib/catalog/assemble.mjs.

export const sections = /** @type {const} */ ([
  { id: 'mounts', title: 'Mounts' },
  { id: 'cameras', title: 'Cameras' },
  { id: 'gadgets', title: 'Gadgets' },
  { id: 'future', title: 'Future' },
]);
