// SOURCE: zurp-astronomics-site — stable URLs /brand/badges/<slug>/software.svg and hardware.svg: the licence badges of each product's README header
// AUTHOR: engineer
// DATE: 2026-10-06
// STATUS: active — ticket #75
//
// Published at https://zurp-astronomics.github.io/brand/badges/<slug>/<kind>.svg — two per product of
// the catalog (src/data/catalog.ts), `software` and `hardware`, rewritten at each build: the badge of
// the licence the product's repository declares (LICENSE, LICENSE-HARDWARE), or an empty SVG when it
// declares none. Linked by the README header pasted once in each product repository
// (content/readme-kit/product-header.md): a README links them forever, never move or rename. Drawing
// and URL: src/lib/license-badge.mjs.
import type { APIRoute } from 'astro';
import { getCatalog, type CatalogProduct } from '../../../../data/catalog';
import { LICENSE_KINDS, licenseContent } from '../../../../lib/content.mjs';
import { licenseBadgeSvg } from '../../../../lib/license-badge.mjs';

type Kind = (typeof LICENSE_KINDS)[number];

export async function getStaticPaths() {
  return (await getCatalog()).flatMap((p) =>
    LICENSE_KINDS.map((kind) => ({ params: { slug: p.slug, kind }, props: { product: p, kind } })),
  );
}

export const GET: APIRoute<{ product: CatalogProduct; kind: Kind }> = ({ props }) =>
  new Response(licenseBadgeSvg(props.product, props.kind, licenseContent()), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
