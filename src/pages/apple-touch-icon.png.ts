// SOURCE: zurp-astronomics-site — /apple-touch-icon.png: the complete drawing (frame included), 180 × 180 px — iOS home screen
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Rendered at build time from src/assets/brand/avatar.png. iOS also requests this exact path on its
// own, so it stays at the root. Conventions: src/lib/site-icons.ts.
import type { APIRoute } from 'astro';
import { fullIcon, pngResponse } from '../lib/site-icons';

export const GET: APIRoute = async () => pngResponse(await fullIcon(180));
