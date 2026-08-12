/**
 * FORMAT A — PFP frames.
 *
 * Square output. X crops profile pictures to a circle, so every frame is built
 * as a ring: nothing that matters lives outside the inscribed circle, and the
 * square corners carry bonus branding for when the file is posted as an image.
 */
import { C, EVENT, type Fonts } from '../brand';
import { Rng } from '../random';
import { passNumber } from '../titles';
import {
  arcText,
  barcode,
  birdFlock,
  drawCover,
  duotone,
  flyingBird,
  goanHouse,
  grain,
  halftone,
  palmTree,
  postageStamp,
  sailboat,
  scooter,
  sparkle,
  star6,
  surfboard,
  tracked,
  waveLine,
  withAlpha,
  type Ctx,
  type Placement,
} from './primitives';

export const FRAME_SIZE = 1080;

export type FrameVariant = 'seal' | 'sunset' | 'terminal';

export const FRAME_VARIANTS: { id: FrameVariant; label: string; blurb: string }[] = [
  { id: 'seal', label: 'THE SEAL', blurb: 'Cream ring · official stamp' },
  { id: 'sunset', label: 'THE SUNSET', blurb: 'Duotone · halftone sun' },
  { id: 'terminal', label: 'THE TERMINAL', blurb: 'Pixel ring · pass number' },
];

export type FrameInput = {
  img: CanvasImageSource | null;
  placement: Placement;
  seed: string;
  handle?: string;
};

export function drawFrame(ctx: Ctx, variant: FrameVariant, f: Fonts, input: FrameInput) {
  const S = FRAME_SIZE;
  ctx.save();
  ctx.clearRect(0, 0, S, S);
  if (variant === 'seal') seal(ctx, f, input);
  else if (variant === 'sunset') sunset(ctx, f, input);
  else terminal(ctx, f, input);
  ctx.restore();
}

/** Photo clipped to a circle, with a neutral placeholder when empty. */
function photoCircle(
  ctx: Ctx,
  input: FrameInput,
  cx: number,
  cy: number,
  r: number,
  emptyBg: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (input.img) {
    drawCover(ctx, input.img, cx - r, cy - r, r * 2, r * 2, input.placement);
  } else {
    ctx.fillStyle = emptyBg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* 01 — THE SEAL                                                       */
/* ------------------------------------------------------------------ */
function seal(ctx: Ctx, f: Fonts, input: FrameInput) {
  const S = FRAME_SIZE;
  const cx = S / 2;
  const cy = S / 2;
  const rng = new Rng(`seal:${input.seed}`);

  ctx.fillStyle = C.greenDeep;
  ctx.fillRect(0, 0, S, S);
  halftone(ctx, 0, 0, S, S, 26, withAlpha(C.yellow, 0.14), 3.4, 'radial');

  const rOuter = S * 0.492;
  const rBandIn = S * 0.398;
  const rPhoto = S * 0.386;

  // Cream ring band
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.arc(cx, cy, rBandIn, 0, Math.PI * 2, true);
  ctx.fillStyle = C.cream;
  ctx.fill('evenodd');
  ctx.restore();

  // Hairlines
  ring(ctx, cx, cy, rOuter - 6, C.green, 3);
  ring(ctx, cx, cy, rBandIn + 7, C.pink, 3);
  ring(ctx, cx, cy, rOuter + 8, C.yellow, 4);

  photoCircle(ctx, input, cx, cy, rPhoto, C.greenPanel);
  ring(ctx, cx, cy, rPhoto, C.greenDeep, 8);

  // Ring lockup: event name across the top, dates across the bottom.
  const rText = (rOuter + rBandIn) / 2;
  ctx.fillStyle = C.greenDeep;
  ctx.font = `700 ${S * 0.043}px ${f.mono}`;
  ctx.textBaseline = 'middle';
  const top = `${EVENT.name} GOA ${EVENT.year}`;
  const topSpacing = S * 0.012;
  const topWidth = measureArc(ctx, top, topSpacing);
  arcText(ctx, top, cx, cy, rText, -Math.PI / 2 - topWidth / rText / 2, topSpacing, 1);

  const bottom = `${EVENT.dates}  ·  ${EVENT.place}`;
  ctx.font = `500 ${S * 0.034}px ${f.mono}`;
  const botSpacing = S * 0.01;
  const botWidth = measureArc(ctx, bottom, botSpacing);
  arcText(ctx, bottom, cx, cy, rText + S * 0.004, Math.PI / 2 + botWidth / rText / 2, botSpacing, -1);

  // Sparkle separators at 3 and 9 o'clock
  sparkle(ctx, cx - rText, cy, S * 0.026, C.pink);
  sparkle(ctx, cx + rText, cy, S * 0.026, C.pink);

  // Tick marks around the outer edge
  ctx.save();
  ctx.strokeStyle = withAlpha(C.greenDeep, 0.5);
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const long = i % 10 === 0;
    const r1 = rOuter - (long ? 16 : 9);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * (rOuter - 3), cy + Math.sin(a) * (rOuter - 3));
    ctx.stroke();
  }
  ctx.restore();

  // Corners live outside the circle crop — pure bonus for the posted image.
  cornerMark(
    ctx,
    f,
    S,
    C.yellow,
    rng,
    { trunk: '#6B4226', frond: C.green, coconut: '#3A2412' },
    { color: C.pink, stripe: C.cream },
    { kind: 'house', wall: '#C24A62', roof: C.green, trim: C.yellow, window: '#BFE1E8' }
  );
  grain(ctx, 0, 0, S, S, 0.05);
}

/* ------------------------------------------------------------------ */
/* 02 — THE SUNSET                                                     */
/* ------------------------------------------------------------------ */
function sunset(ctx: Ctx, f: Fonts, input: FrameInput) {
  const S = FRAME_SIZE;
  const cx = S / 2;
  const cy = S / 2;
  const rng = new Rng(`sunset:${input.seed}`);

  ctx.fillStyle = C.pinkDeep;
  ctx.fillRect(0, 0, S, S);

  const rOuter = S * 0.492;
  const rBandIn = S * 0.405;
  const rPhoto = S * 0.398;

  // Sun: banded gradient behind everything, visible in the square corners.
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, C.pink);
  g.addColorStop(0.55, '#FF5A2E');
  g.addColorStop(1, C.yellow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  halftone(ctx, 0, 0, S, S, 22, withAlpha(C.greenDeep, 0.18), 3, 'up');

  // Photo, pushed to a warm print duotone so any exposure sits on-brand.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rPhoto, 0, Math.PI * 2);
  ctx.clip();
  if (input.img) {
    drawCover(ctx, input.img, cx - rPhoto, cy - rPhoto, rPhoto * 2, rPhoto * 2, input.placement);
    // Plum shadows into golden highlights — a Goa sunset print.
    duotone(ctx, cx - rPhoto, cy - rPhoto, rPhoto * 2, rPhoto * 2, '#4A0F2E', '#FFD84D', 0.82);
  } else {
    ctx.fillStyle = C.greenPanel;
    ctx.fillRect(cx - rPhoto, cy - rPhoto, rPhoto * 2, rPhoto * 2);
  }
  ctx.restore();

  // Yellow band with repeating pixel ticker
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.arc(cx, cy, rBandIn, 0, Math.PI * 2, true);
  ctx.fillStyle = C.yellow;
  ctx.fill('evenodd');
  ctx.restore();
  ring(ctx, cx, cy, rBandIn + 5, C.greenDeep, 6);
  ring(ctx, cx, cy, rOuter - 4, C.greenDeep, 6);

  const rText = (rOuter + rBandIn) / 2;
  ctx.fillStyle = C.greenDeep;
  ctx.font = `400 ${S * 0.04}px ${f.pixel}`;
  ctx.textBaseline = 'middle';

  // Repeat the lockup all the way around the ring.
  const unit = `HH GOA ${EVENT.year} ✦ ${EVENT.datesShort} ✦ `;
  const spacing = S * 0.006;
  const unitArc = measureArc(ctx, unit, spacing) / rText;
  const reps = Math.max(1, Math.round((Math.PI * 2) / unitArc));
  ctx.save();
  ctx.font = `400 ${S * 0.04 * ((Math.PI * 2) / (unitArc * reps))}px ${f.pixel}`;
  let a = -Math.PI / 2;
  for (let i = 0; i < reps; i++) {
    a += arcText(ctx, unit, cx, cy, rText, a, spacing, 1);
  }
  ctx.restore();

  // गोवा badge tucked at the bottom of the photo circle
  const badgeY = cy + rPhoto * 0.62;
  ctx.font = `400 ${S * 0.085}px ${f.hindi}`;
  const hw = ctx.measureText(EVENT.hindi).width;
  const padX = S * 0.038;
  ctx.fillStyle = C.greenDeep;
  const bw = hw + padX * 2;
  const bh = S * 0.115;
  ctx.beginPath();
  ctx.roundRect?.(cx - bw / 2, badgeY - bh / 2, bw, bh, bh / 2);
  if (!ctx.roundRect) ctx.rect(cx - bw / 2, badgeY - bh / 2, bw, bh);
  ctx.fill();
  ctx.fillStyle = C.yellow;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(EVENT.hindi, cx, badgeY + S * 0.006);
  ctx.textAlign = 'left';

  // Sun rays radiating behind the badge area
  ctx.save();
  ctx.globalAlpha = 0.5;
  star6(ctx, cx - rPhoto * 0.66, cy - rPhoto * 0.66, S * 0.03, C.yellow);
  star6(ctx, cx + rPhoto * 0.68, cy - rPhoto * 0.5, S * 0.022, C.cream);
  ctx.restore();

  // Sea horizon under the badge — a wave line and two gulls out over the water.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rPhoto, 0, Math.PI * 2);
  ctx.clip();
  waveLine(ctx, cx - rPhoto, badgeY + bh * 0.62, rPhoto * 2, S * 0.01, withAlpha(C.greenDeep, 0.4), S * 0.006, 10);
  flyingBird(ctx, cx - rPhoto * 0.5, cy - rPhoto * 0.55, S * 0.028, withAlpha(C.greenDeep, 0.55));
  flyingBird(ctx, cx - rPhoto * 0.36, cy - rPhoto * 0.68, S * 0.02, withAlpha(C.greenDeep, 0.45));
  ctx.restore();

  cornerMark(
    ctx,
    f,
    S,
    C.greenDeep,
    rng,
    { trunk: C.greenDeep, frond: '#0B4A28', coconut: C.greenDeep },
    { color: C.cream, stripe: C.greenDeep },
    { kind: 'boat', sail: C.cream, hull: C.greenDeep }
  );
  grain(ctx, 0, 0, S, S, 0.07);
}

/* ------------------------------------------------------------------ */
/* 03 — THE TERMINAL                                                   */
/* ------------------------------------------------------------------ */
function terminal(ctx: Ctx, f: Fonts, input: FrameInput) {
  const S = FRAME_SIZE;
  const cx = S / 2;
  const cy = S / 2;
  const rng = new Rng(`term:${input.seed}`);

  ctx.fillStyle = C.greenNight;
  ctx.fillRect(0, 0, S, S);

  // Faint grid — the "studio" console look.
  ctx.save();
  ctx.strokeStyle = withAlpha(C.cream, 0.07);
  ctx.lineWidth = 2;
  for (let i = 0; i <= S; i += S / 18) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, S);
    ctx.moveTo(0, i);
    ctx.lineTo(S, i);
    ctx.stroke();
  }
  ctx.restore();

  const rPhoto = S * 0.372;
  photoCircle(ctx, input, cx, cy, rPhoto, C.greenPanel);

  // Scanline pass over the photo
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rPhoto, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = withAlpha(C.greenDeep, 0.28);
  for (let y = cy - rPhoto; y < cy + rPhoto; y += 6) ctx.fillRect(cx - rPhoto, y, rPhoto * 2, 2);
  ctx.restore();

  ring(ctx, cx, cy, rPhoto + S * 0.012, C.yellow, 7);

  // Dashed outer ring
  ctx.save();
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = S * 0.018;
  ctx.setLineDash([S * 0.028, S * 0.022]);
  ctx.beginPath();
  ctx.arc(cx, cy, S * 0.462, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ring(ctx, cx, cy, S * 0.492, withAlpha(C.pink, 0.9), 4);

  // Both chips live *inside* the photo circle so they survive X's circular
  // crop — and their solid fills keep them readable over any photo.
  chip(
    ctx,
    f,
    cx,
    cy - rPhoto * 0.78,
    `${EVENT.nameShort} ${EVENT.year}`,
    C.pink,
    C.cream,
    S,
    f.pixel,
    0.03
  );
  chip(
    ctx,
    f,
    cx,
    cy + rPhoto * 0.76,
    `${passNumber(input.seed)} · BUILDER`,
    C.cream,
    C.greenDeep,
    S,
    f.mono,
    0.028
  );

  // Corner brackets
  const m = S * 0.045;
  const len = S * 0.075;
  ctx.save();
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = S * 0.011;
  const corners: [number, number, number, number][] = [
    [m, m, 1, 1],
    [S - m, m, -1, 1],
    [m, S - m, 1, -1],
    [S - m, S - m, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + len * sx, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + len * sy);
    ctx.stroke();
  }
  ctx.restore();

  // Barcode strip in the lower square margin
  // Below the dashed ring's lowest point, and narrow enough to sit between
  // the two bottom corner brackets.
  barcode(ctx, cx - S * 0.14, S * 0.952, S * 0.28, S * 0.024, input.seed, withAlpha(C.cream, 0.8));

  // A console-monochrome palm, bottom-right — even the terminal frame
  // still plants a flag in Goa — with gulls answering top-left, and a
  // sailboat / scooter filling the other two corners so the density
  // matches the other two frames.
  palmTree(
    ctx,
    S * 0.935,
    S * 0.995,
    S * 0.1,
    { trunk: withAlpha(C.cream, 0.85), frond: C.yellow, coconut: withAlpha(C.cream, 0.85) },
    -0.2,
    6
  );
  birdFlock(ctx, S * 0.09, S * 0.07, S * 0.03, S * 0.045, C.cream);
  // Clear of both the L-bracket and the ring: the bracket hugs the very tip
  // of the corner while the ring's outer edge sits at 0.492S, so these sit
  // in the open sliver between the two.
  sailboat(ctx, S * 0.895, S * 0.235, S * 0.08, { sail: C.cream, hull: C.yellow });
  scooter(ctx, S * 0.05, S * 0.83, S * 0.115, {
    body: withAlpha(C.cream, 0.9),
    trim: C.yellow,
    wheel: withAlpha(C.cream, 0.65),
  });

  // Sparkles ride the gap between the solid and dashed rings.
  sparkle(ctx, cx - S * 0.42, cy, S * 0.019, C.yellow);
  sparkle(ctx, cx + S * 0.42, cy, S * 0.019, C.yellow);
  grain(ctx, 0, 0, S, S, 0.05);
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function ring(ctx: Ctx, cx: number, cy: number, r: number, color: string, w: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function measureArc(ctx: Ctx, text: string, spacing: number) {
  return [...text].reduce((sum, c) => sum + ctx.measureText(c).width + spacing, 0);
}

function chip(
  ctx: Ctx,
  _f: Fonts,
  cx: number,
  cy: number,
  text: string,
  bg: string,
  fg: string,
  S: number,
  font: string,
  sizeRatio: number
) {
  const size = S * sizeRatio;
  ctx.save();
  ctx.font = `700 ${size}px ${font}`;
  const spacing = size * 0.12;
  const w = measureArc(ctx, text, spacing) + size * 1.4;
  const h = size * 2;
  ctx.fillStyle = bg;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  else ctx.rect(cx - w / 2, cy - h / 2, w, h);
  ctx.fill();
  // Outline keeps the pill defined when it lands on a light photo.
  ctx.strokeStyle = C.greenDeep;
  ctx.lineWidth = S * 0.004;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  tracked(ctx, text, cx, cy + size * 0.04, spacing, 'center');
  ctx.restore();
}

/**
 * The four square corners that live outside X's circular crop — pure bonus
 * for whenever the file gets posted as a flat image instead of a PFP. The
 * ring itself already carries the event wordmark, so all four corners go to
 * a Goa postcard scene: a postage stamp, gulls, a palm with a surfboard
 * propped against it, and a fourth prop (a bungalow or a sailboat) — the
 * same density as the Builder ID postcard, scaled down to fit a sliver.
 */
function cornerMark(
  ctx: Ctx,
  f: Fonts,
  S: number,
  accentColor: string,
  rng: Rng,
  palm: { trunk: string; frond: string; coconut?: string } = {
    trunk: '#5C3A21',
    frond: '#1E5B3A',
    coconut: '#3A2412',
  },
  board?: { color: string; stripe: string },
  bottomRight?:
    | { kind: 'house'; wall: string; roof: string; trim: string; window: string }
    | { kind: 'boat'; sail: string; hull: string }
) {
  ctx.save();

  // Top-left: a postage stamp, canted like it was licked and stuck on.
  postageStamp(
    ctx,
    S * 0.02,
    S * 0.02,
    S * 0.128,
    { paper: '#FBF6E8', ink: '#243B2C', sky: '#BFE1E8', sea: '#1E5B3A', sun: '#FEE101', palm: '#0B4A28' },
    f.mono,
    rng.range(-0.12, -0.02)
  );

  // Bottom-left: a coconut palm rooted at the very corner, leaning in
  // toward the ring — with a surfboard propped against the trunk, the way
  // every Goan beach shack has one leaning by the door.
  const palmH = S * (0.128 + rng.range(-0.008, 0.014));
  const lean = rng.range(0.16, 0.26);
  if (board) {
    surfboard(ctx, S * 0.05, S * 0.965, S * 0.09, board.color, board.stripe, -0.24);
  }
  palmTree(ctx, S * 0.086, S * 0.997, palmH, palm, lean, 7);

  // Top-right: gulls banking away from the ring.
  birdFlock(ctx, S * 0.9, S * 0.078, S * 0.032, S * 0.05, accentColor);

  // Bottom-right: a fourth prop, tucked tight to the corner.
  if (bottomRight?.kind === 'house') {
    goanHouse(ctx, S * 0.868, S * 0.99, S * 0.1, S * 0.118, bottomRight);
  } else if (bottomRight?.kind === 'boat') {
    sailboat(ctx, S * 0.9, S * 0.985, S * 0.075, bottomRight);
    waveLine(ctx, S * 0.855, S * 0.99, S * 0.13, S * 0.006, withAlpha(accentColor, 0.5), S * 0.005, 4);
  }

  ctx.restore();
}
