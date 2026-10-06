// SOURCE: zurp-astronomics-site — the site's full catalog: products still in content/products/ + products read from their repositories, in display order
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the local products are the folders of content/products/ (src/data/products.ts is gone), the sections come from content/catalog.yml
//
// Every page and endpoint that lists products reads `getCatalog()`: src/pages/index.astro,
// src/pages/[slug]/index.astro, src/pages/brand/posters/[slug].webp.ts,
// src/pages/brand/social/[slug].jpg.ts. The scripts that run after the build assemble the same
// catalog from the same inputs (scripts/lib/catalog.mjs), with the same functions
// (src/lib/catalog/local.mjs, src/lib/catalog/assemble.mjs): one place per product, published
// products guarded, sections in their fixed order, inside a section the latest release first, then
// by name.
//
// POSTERS OF THE LOCAL PRODUCTS. content/products/<slug>/<poster> is imported like any image of
// src/assets/ (import.meta.glob below, eager: an image import, Astro optimises it, the variants are
// named after the file — <slug>.webp, so _astro/<slug>.<hash>.webp as before). Only the import
// object is passed on; nothing reads a property of it here (src/lib/brand-images.ts says why).
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { publishedSlugs } from './published-slugs.mjs';
import { assembleCatalog, unguardedWarning } from '../lib/catalog/assemble.mjs';
import { LOCAL_PRODUCTS_DIR, readLocalProducts } from '../lib/catalog/local.mjs';
import { catalogContent } from '../lib/content.mjs';

export type ProductStatus = 'wip' | 'future' | 'released';

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
    const local = (await readLocalProducts({ sectionIds })).map(({ posterBytes, posterFile, posterPath, ...p }) => {
      const key = `/${LOCAL_PRODUCTS_DIR}/${p.slug}/${posterPath}`;
      const poster = localPosters[key];
      if (!poster) throw new Error(`catalog: ${key.slice(1)} (the poster named by the sheet) was not imported — not an image file?`);
      return { ...p, poster, release: null } as CatalogProduct;
    });
    const remote = (await getCollection('repoProducts')).map((entry) => entry.data as CatalogProduct);
    const { products, unguarded } = assembleCatalog({
      local,
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
