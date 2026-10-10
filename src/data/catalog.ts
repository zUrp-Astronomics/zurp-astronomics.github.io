// SOURCE: zurp-astronomics-site — the site's full catalog: the products read from their repositories, in display order
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active
// REVISED: 2026-10-06 (ticket #49) — the sections come from content/catalog.yml
// REVISED: 2026-10-06 (ticket #66) — every product carries `license`, the licence GitHub detects in its
//   repository, from the build's snapshot
// REVISED: 2026-10-06 (ticket #75) — and `hardwareLicense`, the first line of its repository's
//   LICENSE-HARDWARE
// REVISED: 2026-10-10 (ticket #92) — content/products/ is gone: the catalog comes only from the
//   organisation's repositories (the collection `repoProducts`)
//
// THE LICENCE AND THE « SOURCE » LINK (tickets #66, #72). A product gets them through the collection
// (the loader stores them with the sheet; src/content.config.ts declares them, or zod would drop
// them): its repository's URL, and the licences its repository declares.
//
// Every page and endpoint that lists products reads `getCatalog()`: src/pages/index.astro,
// src/pages/[slug]/index.astro, src/pages/brand/posters/[slug].webp.ts,
// src/pages/brand/social/[slug].jpg.ts. The scripts that run after the build assemble the same
// catalog from the same snapshot (scripts/lib/catalog.mjs), with the same function
// (src/lib/catalog/assemble.mjs): sections in their fixed order, inside a section the latest release
// first, then by name. The catalog report (what was found, skipped, ignored) is written once, at the
// end of the build (astro.config.mjs, src/lib/catalog/report.mjs).
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { assembleCatalog } from '../lib/catalog/assemble.mjs';
import { catalogContent } from '../lib/content.mjs';

export type ProductStatus = 'wip' | 'future' | 'released';

/** The software licence: the one GitHub detects in a repository's LICENSE (its `license`, src/lib/catalog/source.mjs). */
export interface RepoLicense {
  /** SPDX id (`GPL-3.0`), or `NOASSERTION` for a LICENSE GitHub does not recognise. */
  spdx_id: string | null;
  name: string | null;
}

/** The hardware licence a repository declares in LICENSE-HARDWARE: its first non-empty line. */
export interface HardwareLicense {
  title: string;
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
  /** Software licence of its repository as GitHub detects it; null: no LICENSE — no stamp. */
  license: RepoLicense | null;
  /**
   * Hardware licence of its repository: the first non-empty line of its LICENSE-HARDWARE (ticket #75,
   * src/lib/catalog/read.mjs); null: no LICENSE-HARDWARE — no stamp, an empty badge.
   */
  hardwareLicense: HardwareLicense | null;
}

export interface Release {
  /** Tag of the latest release, as is: the version shown on the product page. */
  tag: string;
  /** Its `published_at` (ISO 8601): when it appeared on the repository's Releases page. */
  publishedAt: string;
}

export type CatalogProduct = Product & {
  /** Latest GitHub release; null for a product without one. */
  release: Release | null;
};

let catalog: Promise<CatalogProduct[]> | undefined;

export function getCatalog(): Promise<CatalogProduct[]> {
  catalog ??= (async () => {
    const { sections } = catalogContent();
    const products = (await getCollection('repoProducts')).map((entry) => entry.data as CatalogProduct);
    return assembleCatalog({ products, sections });
  })();
  return catalog;
}
