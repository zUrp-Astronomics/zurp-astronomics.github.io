// SOURCE: zurp-astronomics-site — stable URL /brand/avatar.png: the complete drawing, 480 × 480 PNG — the GitHub organisation avatar
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// Published at https://zurp-astronomics.github.io/brand/avatar.png, rendered at build time
// (losslessly) from src/assets/brand/avatar.png. The human downloads it and uploads it in the
// organisation's Settings → Profile picture (readme-kit/README.md says so): never move or rename it.
// Conventions: src/lib/site-icons.ts; the other stable /brand/ URLs: src/lib/brand-images.ts.
import type { APIRoute } from 'astro';
import { AVATAR_SIZE, fullIcon, pngResponse } from '../../lib/site-icons';

export const GET: APIRoute = async () => pngResponse(await fullIcon(AVATAR_SIZE));
