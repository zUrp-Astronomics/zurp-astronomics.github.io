// SOURCE: zurp-astronomics-site — stable URL /brand/zurp-plate.webp: the zUrp Astronomics enamel plate, README footer size
// AUTHOR: engineer
// DATE: 2026-10-20
// STATUS: active — ticket #115
//
// Published at https://zurp-astronomics.github.io/brand/zurp-plate.webp — 800 px wide WebP (a ~400 px
// display at double density), rendered at build time from src/assets/header/zurp-astronomics-plate.webp,
// the photo the site's header shows (src/components/v2/SiteHeader.astro). Linked by the footer block
// pasted once in each product repository (content/readme-kit/product-footer.md): never move or
// rename it. Convention: src/lib/brand-images.ts.
import type { APIRoute } from 'astro';
import plate from '../../assets/header/zurp-astronomics-plate.webp';
import { BRAND_PLATE_WIDTH, brandWebp } from '../../lib/brand-images';

export const GET: APIRoute = () => brandWebp(plate, BRAND_PLATE_WIDTH, 80);
