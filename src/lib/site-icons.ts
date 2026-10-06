// SOURCE: zurp-astronomics-site — site icons (favicon, apple-touch-icon, 192 px icon) and the GitHub organisation avatar, rendered at build time from one drawing
// AUTHOR: engineer
// DATE: 2026-10-03
// STATUS: active
//
// SOURCE DRAWING. src/assets/brand/avatar.png — the steampunk brass refractor on a starry blueprint,
// in a worn cream frame with a red rule: 480 × 480 PNG, RGB, copied as is from the workshop
// (ready-room/avatar_favicon.png, ticket #37). Every file below is derived from it at build time:
// nothing is cropped or resized by hand, so a new drawing is one file to replace.
//
// TWO TREATMENTS OF THE SAME DRAWING (architect's decision, approved by the human):
//   - small sizes (16 and 32 px, the browser tab): a TIGHT SQUARE CROP on the telescope, without the
//     cream and red frame — at 16 px the frame would eat a third of the icon and the silhouette
//     would be lost. TELESCOPE_CROP below keeps the whole tube, the eyepiece, the lens rim and its
//     glint, and most of the mount; only the bottom of the base is cut. Measured on the 480 px
//     source: the blueprint field runs from x ≈ 26 to 454 and y ≈ 28 to 449, the red rule sits at
//     x 12–19 / 460–467 and y 16–22 / 454–461. The crop (x 54–449, y 30–425) stays inside the field.
//     If the source drawing changes, re-measure: these numbers belong to THIS drawing;
//   - large sizes (≥ 48 px: apple-touch-icon 180 px, icon 192 px, the avatar itself): the COMPLETE
//     drawing, frame included.
//
// PUBLISHED FILES (static endpoints, src/pages/…; scripts/check-dist.mjs mirrors this list — change
// both together, or never):
//   /favicon.ico            16 + 32 px, crop     the file browsers and tools request on their own
//   /favicon-16.png         16 × 16, crop        <link rel="icon" sizes="16x16">
//   /favicon-32.png         32 × 32, crop        <link rel="icon" sizes="32x32">
//   /icon-192.png           192 × 192, complete  <link rel="icon" sizes="192x192"> (Android, pinned tabs)
//   /apple-touch-icon.png   180 × 180, complete  <link rel="apple-touch-icon"> (iOS home screen; iOS
//                                                also requests this path on its own)
//   /brand/avatar.png       480 × 480, complete  STABLE URL, the GitHub organisation avatar (uploaded
//                                                by hand: readme-kit/README.md says where). Never
//                                                move or rename it.
// Declared in the <head> of every page by src/layouts/V2Layout.astro.
//
// HOW. sharp (the image library Astro uses, declared in package.json; see src/lib/social-card.ts),
// reading the source through the import's `fsPath` only — reading any other property of an image
// import would make Astro copy the original into dist/_astro (src/lib/brand-images.ts explains why).
// No web app manifest: nothing on this site is installable, the 192 px icon is declared directly.

import sharp from 'sharp';
import type { ImageMetadata } from 'astro';
import avatar from '../assets/brand/avatar.png';

/** Size of the source drawing, checked at build time (the crop below is measured on it). */
export const AVATAR_SIZE = 480;

/** Tight square crop on the telescope, in source pixels (see the header). */
export const TELESCOPE_CROP = { left: 54, top: 30, width: 396, height: 396 } as const;

function avatarPath(): string {
  const fsPath = (avatar as ImageMetadata & { fsPath?: string }).fsPath;
  if (!fsPath) {
    throw new Error('site icons: no fsPath on the imported avatar — Astro internals changed?');
  }
  return fsPath;
}

/** The source as a sharp pipeline, after checking it is still the 480 × 480 drawing. */
async function source(): Promise<sharp.Sharp> {
  const path = avatarPath();
  const { width, height } = await sharp(path).metadata();
  if (width !== AVATAR_SIZE || height !== AVATAR_SIZE) {
    throw new Error(
      `site icons: src/assets/brand/avatar.png is ${width} × ${height}, expected ${AVATAR_SIZE} × ${AVATAR_SIZE} — re-measure TELESCOPE_CROP`,
    );
  }
  return sharp(path);
}

const PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: true } as const;

/** Small icon: the telescope crop at `size` px, as PNG bytes (RGBA, as ICO containers expect). */
export async function telescopeIcon(size: number): Promise<Buffer> {
  return (await source())
    .extract(TELESCOPE_CROP)
    .resize(size, size, { kernel: 'lanczos3' })
    .ensureAlpha()
    .png(PNG_OPTIONS)
    .toBuffer();
}

/** Large icon: the complete drawing (frame included) at `size` px, as PNG bytes. */
export async function fullIcon(size: number): Promise<Buffer> {
  const pipeline = await source();
  return (size === AVATAR_SIZE ? pipeline : pipeline.resize(size, size, { kernel: 'lanczos3' }))
    .png(PNG_OPTIONS)
    .toBuffer();
}

/**
 * A Windows ICO holding one PNG image per entry (PNG-in-ICO, read by every current browser and by
 * Windows since Vista). The container is 6 + 16 × n header bytes followed by the PNGs as they are.
 */
export function icoFromPngs(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e); // width (0 = 256)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1); // height
    header.writeUInt8(0, e + 2); // palette colours: none
    header.writeUInt8(0, e + 3); // reserved
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.png)]);
}

export const pngResponse = (data: Buffer) => new Response(data, { headers: { 'Content-Type': 'image/png' } });
