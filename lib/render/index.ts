/**
 * One entry point the UI talks to: describe the graphic, get pixels back.
 */
import { ensureFontsReady, readFonts } from '../brand';
import { CARD_H, CARD_W, drawCard, type CardInput, type CardVariant } from './cards';
import { FRAME_SIZE, drawFrame, type FrameInput, type FrameVariant } from './frames';
import type { Ctx, Placement } from './primitives';
import { applyFilterToCanvas, type PhotoFilter } from './filters';

export type Format = 'frame' | 'card';

export type Design = {
  format: Format;
  frameVariant: FrameVariant;
  cardVariant: CardVariant;
  seed: string;
  name: string;
  role: string;
  title: string;
  placement: Placement;
  filter?: PhotoFilter;
};

export function designSize(format: Format) {
  return format === 'frame'
    ? { w: FRAME_SIZE, h: FRAME_SIZE }
    : { w: CARD_W, h: CARD_H };
}

/** Draws into an already-sized canvas context, scaling the design space to fit. */
export function paint(
  ctx: Ctx,
  design: Design,
  img: CanvasImageSource | null,
  targetW: number
) {
  const { w } = designSize(design.format);
  const scale = targetW / w;
  const fonts = readFonts();

  ctx.save();
  ctx.scale(scale, scale);
  if (design.format === 'frame') {
    const input: FrameInput = {
      img,
      placement: design.placement,
      seed: design.seed,
      filter: design.filter,
    };
    drawFrame(ctx, design.frameVariant, fonts, input);
  } else {
    const input: CardInput = {
      img,
      placement: design.placement,
      seed: design.seed,
      name: design.name,
      role: design.role,
      title: design.title,
      filter: design.filter,
    };
    drawCard(ctx, design.cardVariant, fonts, input);
  }
  ctx.restore();
}


/** Full-resolution export. `scale` of 2 gives a 2160px-wide file. */
export async function renderToCanvas(
  design: Design,
  img: CanvasImageSource | null,
  scale = 2
): Promise<HTMLCanvasElement> {
  await ensureFontsReady();
  const { w, h } = designSize(design.format);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.imageSmoothingQuality = 'high';
  paint(ctx, design, img, canvas.width);
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg' = 'image/png',
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Export failed.'))),
      type,
      quality
    );
  });
}

/**
 * X rejects images over 5 MB in the composer, and a 2160×2700 PNG of a real
 * photograph lands around 5 MB. So: PNG while it stays comfortably small
 * (crisper type and flat colour), JPEG once the photo makes it heavy.
 *
 * Every layout paints an opaque background, so dropping the alpha channel
 * costs nothing.
 */
const PNG_BUDGET = 3.5 * 1024 * 1024;

export async function exportBlob(
  canvas: HTMLCanvasElement
): Promise<{ blob: Blob; ext: 'png' | 'jpg' }> {
  const png = await canvasToBlob(canvas, 'image/png');
  if (png.size <= PNG_BUDGET) return { blob: png, ext: 'png' };
  // High quality — these layouts are type-heavy and JPEG rings around edges.
  const jpg = await canvasToBlob(canvas, 'image/jpeg', 0.94);
  return jpg.size < png.size ? { blob: jpg, ext: 'jpg' } : { blob: png, ext: 'png' };
}
