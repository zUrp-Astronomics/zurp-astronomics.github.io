// SOURCE: zurp-astronomics-site — stable URLs /brand/status/<slug>.json: each product's status, as a shields.io endpoint JSON (the status badge of its README header)
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — ticket #53
//
// Published at https://zurp-astronomics.github.io/brand/status/<slug>.json — one per product of the
// catalog (src/data/catalog.ts), rewritten at each build: the status label of content/catalog.yml,
// plus the tag of the latest release when there is one. Rendered by shields.io in the README header
// pasted once in each product repository (content/readme-kit/product-header.md): a README links it
// forever, never move or rename. Content and URL: src/lib/status-badge.mjs.
import type { APIRoute } from 'astro';
import { getCatalog, type CatalogProduct } from '../../../data/catalog';
import { catalogContent } from '../../../lib/content.mjs';
import { statusBadgeJson } from '../../../lib/status-badge.mjs';

export async function getStaticPaths() {
  return (await getCatalog()).map((p) => ({ params: { slug: p.slug }, props: { product: p } }));
}

export const GET: APIRoute<{ product: CatalogProduct }> = ({ props }) =>
  new Response(statusBadgeJson(props.product, catalogContent()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
