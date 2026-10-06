// SOURCE: zurp-astronomics-site — the site's full catalog: products still in products.ts + products read from their repositories, in display order
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
//
// Every page and endpoint that lists products reads `getCatalog()`, never products.ts alone:
// src/pages/index.astro, src/pages/[slug]/index.astro, src/pages/brand/posters/[slug].webp.ts,
// src/pages/brand/social/[slug].jpg.ts. The scripts that run after the build assemble the same
// catalog from the same inputs (scripts/lib/catalog.mjs), with the same function
// (src/lib/catalog/assemble.mjs): one place per product, published products guarded, sections in
// their fixed order, inside a section the latest release first, then by name.
import { getCollection } from 'astro:content';
import { products as localProducts, sections, type Product } from './products';
import { publishedSlugs } from './published-slugs.mjs';
import { assembleCatalog, unguardedWarning } from '../lib/catalog/assemble.mjs';

export interface Release {
  /** Tag of the latest release, as is: the version shown on the product page. */
  tag: string;
  /** Its `published_at` (ISO 8601): when it appeared on the repository's Releases page. */
  publishedAt: string;
}

export type CatalogProduct = Product & {
  /** Latest GitHub release; null for a product without one (and for every product of products.ts). */
  release: Release | null;
};

let catalog: Promise<CatalogProduct[]> | undefined;

export function getCatalog(): Promise<CatalogProduct[]> {
  catalog ??= (async () => {
    const remote = (await getCollection('repoProducts')).map((entry) => entry.data as CatalogProduct);
    const { products, unguarded } = assembleCatalog({
      local: localProducts.map((p) => ({ ...p, release: null })),
      remote,
      published: publishedSlugs,
      sections,
    });
    const warning = unguardedWarning(unguarded);
    if (warning) console.warn(warning);
    return products;
  })();
  return catalog;
}
