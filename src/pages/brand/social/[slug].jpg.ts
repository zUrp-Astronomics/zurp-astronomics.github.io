// SOURCE: zurp-astronomics-site — stable URLs /brand/social/<slug>.jpg: each product repository's GitHub social preview card
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Published at https://zurp-astronomics.github.io/brand/social/<slug>.jpg — one 1280 × 640 px JPEG
// per product of the catalog (src/data/catalog.ts; <slug> = its `slug`), composed at build time from the
// product's `poster`, `name` and `slogan`, signed with the site's name (content/site.yml;
// composition: src/lib/social-card.ts). A new product gets its card
// with no change here. Uploaded by hand in each repository's Settings → Social preview (see
// readme-kit/README.md): never move or rename. Convention: src/lib/brand-images.ts.
import type { APIRoute } from 'astro';
import { getCatalog, type CatalogProduct } from '../../../data/catalog';
import { socialCard } from '../../../lib/social-card';
import { siteContent } from '../../../lib/content.mjs';

export async function getStaticPaths() {
  return (await getCatalog()).map((p) => ({ params: { slug: p.slug }, props: { product: p } }));
}

export const GET: APIRoute<{ product: CatalogProduct }> = ({ props }) =>
  socialCard(props.product.poster, props.product.name, props.product.slogan, siteContent().name);
