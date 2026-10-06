// SOURCE: zurp-astronomics-site — stable URLs /brand/posters/<slug>.webp: each product's series 2 poster, README size
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Published at https://zurp-astronomics.github.io/brand/posters/<slug>.webp — one 600 × 600 px
// WebP per product of the catalog (src/data/catalog.ts; <slug> = its `slug`), rendered at build time from the
// product's `poster`, the same source as the site. A new product gets its URL with no change here.
// Linked by URL from the GitHub READMEs: never move or rename. Convention: src/lib/brand-images.ts.
import type { APIRoute } from 'astro';
import { getCatalog, type CatalogProduct } from '../../../data/catalog';
import { BRAND_POSTER_WIDTH, brandWebp } from '../../../lib/brand-images';

export async function getStaticPaths() {
  return (await getCatalog()).map((p) => ({ params: { slug: p.slug }, props: { product: p } }));
}

export const GET: APIRoute<{ product: CatalogProduct }> = ({ props }) =>
  brandWebp(props.product.poster, BRAND_POSTER_WIDTH, 78);
