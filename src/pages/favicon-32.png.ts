// SOURCE: zurp-astronomics-site — /favicon-32.png: the tab icon, telescope crop, 32 × 32 px
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Rendered at build time from src/assets/brand/avatar.png. Conventions and the crop: src/lib/site-icons.ts.
import type { APIRoute } from 'astro';
import { pngResponse, telescopeIcon } from '../lib/site-icons';

export const GET: APIRoute = async () => pngResponse(await telescopeIcon(32));
