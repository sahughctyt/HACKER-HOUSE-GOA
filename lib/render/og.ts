/**
 * The link-preview banner.
 *
 * X crops `summary_large_image` previews to roughly 1.91:1, which would slice
 * the top and bottom off a 4:5 card or a square PFP. So instead of handing the
 * crawler the raw graphic, we compose it into a 1200×630 branded banner — the
 * whole card stays visible and the preview is unmistakably HH Goa.
 */
import { C, EVENT, readFonts } from '../brand';
import { canvasToBlob } from './index';
import type { Format } from './index';
import { fitText, halftone, roundRect, sparkle, tracked, withAlpha } from './primitives';

export const OG_W = 1200;
export const OG_H = 630;

export type OgInput = {
  graphic: HTMLCanvasElement;
  format: Format;
  name: string;
  title: string;
};

export async function renderOgBanner(input: OgInput): Promise<Blob> {
  const f = readFonts();
  const canvas = document.createElement('canvas');
  canvas.width = OG_W;
  canvas.height = OG_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.imageSmoothingQuality = 'high';

  // Backdrop
  ctx.fillStyle = C.greenDeep;
  ctx.fillRect(0, 0, OG_W, OG_H);
  const glow = ctx.createRadialGradient(OG_W * 0.78, OG_H * 0.2, 40, OG_W * 0.78, OG_H * 0.2, 620);
  glow.addColorStop(0, withAlpha(C.green, 0.85));
  glow.addColorStop(1, withAlpha(C.greenDeep, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, OG_W, OG_H);
  halftone(ctx, 0, 0, OG_W, OG_H, 18, withAlpha(C.yellow, 0.11), 2.4, 'radial');

  // The graphic itself, on the right, tipped slightly like a dropped photo.
  const pad = 40;
  const maxH = OG_H - pad * 2;
  const gAspect = input.graphic.width / input.graphic.height;
  const gH = maxH;
  const gW = gH * gAspect;
  const gx = OG_W - pad - gW;
  const gy = pad;

  ctx.save();
  ctx.translate(gx + gW / 2, gy + gH / 2);
  ctx.rotate(-0.028);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 12;
  ctx.drawImage(input.graphic, -gW / 2, -gH / 2, gW, gH);
  ctx.restore();

  // Left-hand type block
  const x = 56;
  const textW = Math.max(180, gx - x - 34);

  ctx.fillStyle = C.yellow;
  ctx.font = `700 20px ${f.mono}`;
  ctx.textBaseline = 'alphabetic';
  tracked(ctx, '✦ HACKER HOUSE GOA 2026', x, 118, 3.2);

  const headline = (input.name || '').trim().toUpperCase();
  ctx.fillStyle = C.cream;
  if (headline) {
    const size = fitText(ctx, headline, textW, 76, (s) => `700 ${s}px ${f.display}`, 34);
    ctx.fillText(headline, x, 200);
    void size;
  } else {
    ctx.font = `700 68px ${f.display}`;
    ctx.fillText(input.format === 'frame' ? 'FRAMED.' : 'BUILDER ID', x, 200);
  }

  // Title chip
  const chipText = (input.title || 'OFFICIAL BUILDER').toUpperCase();
  ctx.font = `700 20px ${f.mono}`;
  const sp = 3;
  const cw = Math.min(textW, [...chipText].reduce((a, c) => a + ctx.measureText(c).width + sp, 0) + 36);
  ctx.fillStyle = C.pink;
  roundRect(ctx, x, 226, cw, 48, 24);
  ctx.fill();
  ctx.fillStyle = C.cream;
  ctx.textBaseline = 'middle';
  tracked(ctx, chipText, x + 18, 251, sp);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = withAlpha(C.cream, 0.85);
  ctx.font = `500 21px ${f.mono}`;
  tracked(ctx, EVENT.dates, x, 340, 2.6);
  tracked(ctx, EVENT.place, x, 374, 2.6);

  ctx.fillStyle = C.yellow;
  ctx.font = `italic 700 30px ${f.display}`;
  ctx.fillText('Less noise. More building.', x, 440);

  ctx.fillStyle = C.cream;
  ctx.font = `700 22px ${f.mono}`;
  tracked(ctx, EVENT.hashtag, x, 500, 3);
  sparkle(ctx, x + 8, 542, 12, C.pink);

  // Bottom rule
  ctx.fillStyle = C.yellow;
  ctx.fillRect(0, OG_H - 10, OG_W, 10);

  return canvasToBlob(canvas);
}
