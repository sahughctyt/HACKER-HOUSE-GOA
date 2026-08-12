/**
 * Where the photo actually sits in each layout, in design-space units.
 * The UI needs this to translate a finger drag into an accurate pan.
 */
import { CARD_W, POSTCARD_PHOTO, type CardVariant } from './cards';
import { FRAME_SIZE, type FrameVariant } from './frames';
import type { Format } from './index';

export type Rect = { x: number; y: number; w: number; h: number };

export function photoRect(
  format: Format,
  frameVariant: FrameVariant,
  cardVariant: CardVariant
): Rect {
  if (format === 'frame') {
    const r =
      FRAME_SIZE *
      (frameVariant === 'seal' ? 0.386 : frameVariant === 'sunset' ? 0.398 : 0.372);
    const c = FRAME_SIZE / 2;
    return { x: c - r, y: c - r, w: r * 2, h: r * 2 };
  }
  if (cardVariant === 'passport') {
    return { x: 34 + 44, y: 34 + 168 + 46, w: 408, h: 560 };
  }
  if (cardVariant === 'boarding') {
    return { x: 40 + 34, y: 40 + 126, w: CARD_W - 80 - 68, h: 620 };
  }
  const { cx, cy, r } = POSTCARD_PHOTO;
  return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
}
