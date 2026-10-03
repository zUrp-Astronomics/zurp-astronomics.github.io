// SOURCE: zurp-astronomics-site — stable URLs /brand/posters/<slug>.webp: each product's series 2 poster, README size
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Published at https://zurp-astronomics.github.io/brand/posters/<slug>.webp — one 600 × 600 px
// WebP per product of src/data/products.ts (<slug> = its `slug`), rendered at build time from the
// product's `poster2`, the same source as the site. A new product gets its URL with no change here.
// Linked by URL from the GitHub READMEs: never move or rename. Convention: src/lib/brand-images.ts.
import type { APIRoute } from 'astro';
import { products, type Product } from '../../../data/products';
import { BRAND_POSTER_WIDTH, brandWebp } from '../../../lib/brand-images';

export function getStaticPaths() {
  return products.map((p) => ({ params: { slug: p.slug }, props: { product: p } }));
}

export const GET: APIRoute<{ product: Product }> = ({ props }) =>
  brandWebp(props.product.poster2, BRAND_POSTER_WIDTH, 78);
