// SOURCE: zurp-astronomics-site — stable URL /brand/low-tech-diy.webp: the worn "Low-Tech & DIY" panel, README header size
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Published at https://zurp-astronomics.github.io/brand/low-tech-diy.webp — 800 px wide WebP,
// rendered at build time from src/assets/header/low-tech-diy-poster.webp (the site's own source).
// Linked by URL from the GitHub READMEs: never move or rename it. Convention and the matching
// poster URLs (/brand/posters/<slug>.webp): src/lib/brand-images.ts.
import type { APIRoute } from 'astro';
import lowTechPoster from '../../assets/header/low-tech-diy-poster.webp';
import { BRAND_PANEL_WIDTH, brandWebp } from '../../lib/brand-images';

export const GET: APIRoute = () => brandWebp(lowTechPoster, BRAND_PANEL_WIDTH, 76);
