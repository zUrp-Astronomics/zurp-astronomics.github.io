// SOURCE: zurp-astronomics-site — /icon-192.png: the complete drawing (frame included), 192 × 192 px — Android and other large-icon contexts
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Rendered at build time from src/assets/brand/avatar.png. Conventions: src/lib/site-icons.ts.
import type { APIRoute } from 'astro';
import { fullIcon, pngResponse } from '../lib/site-icons';

export const GET: APIRoute = async () => pngResponse(await fullIcon(192));
