// SOURCE: zurp-astronomics-site — the site's full catalog: products still in content/products/ + products read from their repositories, in display order
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the local products are the folders of content/products/ (src/data/products.ts is gone), the sections come from content/catalog.yml
// REVISED: 2026-10-06 (ticket #66) — every product carries `license`, the licence GitHub detects in its
//   repository, from the build's snapshot
// REVISED: 2026-10-06 (ticket #72) — full discovery: no published list; the repository of a product of
//   content/products/ (its link and licence) is discovered in the snapshot's repositories; a slug in
//   both places: the repository wins (the catalog report, src/lib/catalog/report.mjs, says so)
//
// THE LICENCE AND THE « SOURCE » LINK (tickets #66, #72). A product of a repository gets them through
// the collection (the loader stores them with the sheet; src/content.config.ts declares them, or zod
// would drop them). A product of content/products/ gets them from its repository, discovered by its
// name in the repositories the loader listed, in the snapshot it wrote (.zurp-catalog/remote.json,
// read once the collection is loaded) — the organisation and no licence when there is none: the same
// list, and so the same link and licence, as the scripts that run after the build
// (scripts/lib/catalog.mjs) — check-dist checks that the page shows the licence.
//
// Every page and endpoint that lists products reads `getCatalog()`: src/pages/index.astro,
// src/pages/[slug]/index.astro, src/pages/brand/posters/[slug].webp.ts,
// src/pages/brand/social/[slug].jpg.ts. The scripts that run after the build assemble the same
// catalog from the same inputs (scripts/lib/catalog.mjs), with the same functions
// (src/lib/catalog/local.mjs, src/lib/catalog/assemble.mjs): one place per product (the repository
// wins), sections in their fixed order, inside a section the latest release first, then by name.
// The catalog report (what was found, skipped, ignored) is written once, at the end of the build
// (astro.config.mjs, src/lib/catalog/report.mjs).
//
// POSTERS OF THE LOCAL PRODUCTS. content/products/<slug>/<poster> is imported like any image of
// src/assets/ (import.meta.glob below, eager: an image import, Astro optimises it, the variants are
// named after the file — <slug>.webp, so _astro/<slug>.<hash>.webp as before). Only the import
// object is passed on; nothing reads a property of it here (src/lib/brand-images.ts says why).
import type { ImageMetadata } from 'astro';
import { join } from 'node:path';
import { getCollection } from 'astro:content';
import { assembleCatalog } from '../lib/catalog/assemble.mjs';
import { LOCAL_PRODUCTS_DIR, readLocalProducts } from '../lib/catalog/local.mjs';
import { SNAPSHOT_FILE, readSnapshot } from '../lib/catalog/loader.mjs';
import { catalogContent } from '../lib/content.mjs';

export type ProductStatus = 'wip' | 'future' | 'released';

/** The licence GitHub detects in a repository (its `license`, src/lib/catalog/source.mjs). */
export interface RepoLicense {
  /** SPDX id (`GPL-3.0`), or `NOASSERTION` for a LICENSE GitHub does not recognise. */
  spdx_id: string | null;
  name: string | null;
}

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  /**
   * The slogan printed on the series 2 poster, transcribed from the artwork (the poster sets it in
   * capitals). Used by the README kit (scripts/readme-kit.mjs) and the GitHub social preview cards.
   */
  slogan: string;
  category: string;
  /** Catalog section on the home page: an `id` of content/catalog.yml. */
  section: string;
  repo: string;
  status: ProductStatus;
  description: string[];
  basedOn?: string;
  /** Series 2 poster (1254×1254 source, worn plate with near-black opaque corners). */
  poster: ImageMetadata;
  /** What the poster shows — its creature and slogan. Used as the image's alt text. */
  posterAlt: string;
  /** Accent, read off the poster's rays. Tints the product page (badge fill nudged to ≥ 4.5:1). */
  accent: string;
  /** Licence of its repository as GitHub detects it; null: no repository, no LICENSE — no stamp. */
  license: RepoLicense | null;
}

export interface Release {
  /** Tag of the latest release, as is: the version shown on the product page. */
  tag: string;
  /** Its `published_at` (ISO 8601): when it appeared on the repository's Releases page. */
  publishedAt: string;
}

export type CatalogProduct = Product & {
  /** Latest GitHub release; null for a product without one (and for every product of content/products/). */
  release: Release | null;
};

// Every image of content/products/, by its path from the project root (the poster a sheet names is
// one of them). Case variants of the extensions read.mjs accepts.
const localPosters = import.meta.glob<ImageMetadata>(
  '/content/products/*/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,avif,AVIF}',
  { eager: true, import: 'default' },
);

let catalog: Promise<CatalogProduct[]> | undefined;

export function getCatalog(): Promise<CatalogProduct[]> {
  catalog ??= (async () => {
    const { sections } = catalogContent();
    const sectionIds = sections.map((s) => s.id);
    // The collection first: loading it is what writes the snapshot (src/lib/catalog/loader.mjs).
    const remote = (await getCollection('repoProducts')).map((entry) => entry.data as CatalogProduct);
    const { repositories } = readSnapshot(join(process.cwd(), SNAPSHOT_FILE));
    const local = (await readLocalProducts({ sectionIds, repositories })).map(({ posterBytes, posterFile, posterPath, ...p }) => {
      const key = `/${LOCAL_PRODUCTS_DIR}/${p.slug}/${posterPath}`;
      const poster = localPosters[key];
      if (!poster) throw new Error(`catalog: ${key.slice(1)} (the poster named by the sheet) was not imported — not an image file?`);
      return { ...p, poster, release: null } as CatalogProduct;
    });
    return assembleCatalog({ local, remote, sections }).products;
  })();
  return catalog;
}
