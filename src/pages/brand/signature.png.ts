// SOURCE: zurp-astronomics-site — stable URL /brand/signature.png: the signature of the product READMEs' footer, drawn from content/site.yml
// AUTHOR: engineer
// DATE: 2026-10-20
// STATUS: active — ticket #115
//
// Published at https://zurp-astronomics.github.io/brand/signature.png — an opaque 800 px wide PNG,
// rewritten at each build from content/site.yml (`signature`, `header.subtitle`): edit a text there,
// rebuild, and every README footer shows the new signature. Linked by the footer block pasted once
// in each product repository (content/readme-kit/product-footer.md): never move or rename it.
// Drawing: src/lib/signature-image.mjs; the other stable /brand/ URLs: src/lib/brand-images.ts.
import type { APIRoute } from 'astro';
import { siteContent } from '../../lib/content.mjs';
import { signaturePng, signatureTexts } from '../../lib/signature-image.mjs';

export const GET: APIRoute = async () =>
  new Response(await signaturePng(signatureTexts(siteContent())), { headers: { 'Content-Type': 'image/png' } });
