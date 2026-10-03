// SOURCE: zurp-astronomics-site — /favicon.ico: the tab icon (telescope crop) at 16 and 32 px, at the root where browsers and tools request it on their own
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Rendered at build time from src/assets/brand/avatar.png. Conventions and the crop: src/lib/site-icons.ts.
import type { APIRoute } from 'astro';
import { icoFromPngs, telescopeIcon } from '../lib/site-icons';

export const GET: APIRoute = async () => {
  const images = await Promise.all([16, 32].map(async (size) => ({ size, png: await telescopeIcon(size) })));
  return new Response(icoFromPngs(images), { headers: { 'Content-Type': 'image/x-icon' } });
};
