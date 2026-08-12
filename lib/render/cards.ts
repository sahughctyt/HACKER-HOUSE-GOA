/**
 * FORMAT B — Builder ID cards.
 *
 * 1080 × 1350 (4:5) — the tallest crop X shows inline without clipping.
 * Three layouts, all fed from the same field set.
 */
import { C, EVENT, type Fonts } from '../brand';
import { Rng } from '../random';
import { mottoFor, passNumber } from '../titles';
import {
  arcText,
  barcode,
  birdFlock,
  dashedLine,
  drawCover,
  duotone,
  fauxQr,
  fitText,
  flyingBird,
  goanHouse,
  grain,
  halftone,
  mrzLine,
  palmTree,
  perforate,
  postageStamp,
  ribbonBanner,
  roundRect,
  sailboat,
  scallopRing,
  scooter,
  scrim,
  sparkle,
  speechBubble,
  star6,
  surfboard,
  tracked,
  waveLine,
  withAlpha,
  type Ctx,
  type Placement,
} from './primitives';

export const CARD_W = 1080;
export const CARD_H = 1350;

export type CardVariant = 'passport' | 'boarding' | 'poster';

export const CARD_VARIANTS: { id: CardVariant; label: string; blurb: string }[] = [
  { id: 'passport', label: 'THE PASSPORT', blurb: 'Cream · stamped · MRZ' },
  { id: 'boarding', label: 'THE BOARDING PASS', blurb: 'Ticket stub · barcode' },
  { id: 'poster', label: 'THE POSTCARD', blurb: 'Illustrated · beach scrapbook' },
];

export type CardInput = {
  img: CanvasImageSource | null;
  placement: Placement;
  seed: string;
  name: string;
  role: string;
  title: string;
  handle?: string;
};

export function drawCard(ctx: Ctx, variant: CardVariant, f: Fonts, input: CardInput) {
  ctx.save();
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (variant === 'passport') passport(ctx, f, input);
  else if (variant === 'boarding') boarding(ctx, f, input);
  else poster(ctx, f, input);
  ctx.restore();
}

const up = (s: string) => (s || '').toUpperCase();

/* ------------------------------------------------------------------ */
/* 01 — THE PASSPORT                                                   */
/* ------------------------------------------------------------------ */
function passport(ctx: Ctx, f: Fonts, input: CardInput) {
  const W = CARD_W;
  const H = CARD_H;
  const rng = new Rng(`pp:${input.seed}`);
  const pass = passNumber(input.seed);

  ctx.fillStyle = C.greenDeep;
  ctx.fillRect(0, 0, W, H);

  const M = 34;
  ctx.fillStyle = C.cream;
  roundRect(ctx, M, M, W - M * 2, H - M * 2, 26);
  ctx.fill();

  // Guilloché-ish security wash
  ctx.save();
  roundRect(ctx, M, M, W - M * 2, H - M * 2, 26);
  ctx.clip();
  ctx.strokeStyle = withAlpha(C.green, 0.09);
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.52, 120 + i * 28, 320 + i * 16, (i * Math.PI) / 26, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Header band
  const bandH = 168;
  ctx.fillStyle = C.green;
  roundRect(ctx, M, M, W - M * 2, bandH, 26);
  ctx.fill();
  ctx.fillRect(M, M + bandH - 40, W - M * 2, 40);

  ctx.fillStyle = C.cream;
  ctx.font = `700 54px ${f.display}`;
  ctx.fillText('Hacker House', M + 44, M + 84);
  ctx.fillStyle = C.yellow;
  ctx.font = `400 46px ${f.hindi}`;
  ctx.textAlign = 'right';
  ctx.fillText(EVENT.hindi, W - M - 44, M + 84);
  ctx.textAlign = 'left';

  ctx.fillStyle = withAlpha(C.cream, 0.82);
  ctx.font = `500 22px ${f.mono}`;
  tracked(ctx, 'REPUBLIC OF BUILDERS · OFFICIAL PASS', M + 44, M + 128, 3.4);

  // Photo panel
  const px = M + 44;
  const py = M + bandH + 46;
  const pw = 408;
  const ph = 560;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 12);
  ctx.clip();
  if (input.img) {
    drawCover(ctx, input.img, px, py, pw, ph, input.placement);
    // Light hand — a passport photo should still look like a photo.
    duotone(ctx, px, py, pw, ph, '#12301E', '#FFF6DC', 0.42);
  } else {
    ctx.fillStyle = C.creamDim;
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
  ctx.strokeStyle = C.greenDeep;
  ctx.lineWidth = 5;
  roundRect(ctx, px, py, pw, ph, 12);
  ctx.stroke();

  // Field column
  const fx = px + pw + 46;
  const fw = W - M - 44 - fx;
  let fy = py + 26;

  const field = (label: string, value: string, big = false) => {
    ctx.fillStyle = withAlpha(C.green, 0.75);
    ctx.font = `600 19px ${f.mono}`;
    tracked(ctx, label, fx, fy, 3);
    fy += big ? 14 : 12;
    ctx.fillStyle = C.ink;
    const size = fitText(
      ctx,
      up(value),
      fw,
      big ? 54 : 34,
      (s) => `${big ? 700 : 500} ${s}px ${big ? f.display : f.mono}`,
      big ? 26 : 18
    );
    ctx.fillText(up(value), fx, fy + size);
    fy += size + (big ? 34 : 28);
  };

  field('NAME', input.name || 'YOUR NAME', true);
  field('BUILDER CLASS', input.title);
  field('STACK', input.role || 'BUILDER');
  field('PASS NO.', pass);
  field('VALID', EVENT.dates);

  // Stamp, rotated over the photo corner
  ctx.save();
  ctx.translate(px + pw * 0.97, py + ph * 0.88);
  ctx.rotate(rng.range(-0.34, -0.16));
  ctx.globalAlpha = 0.92;
  const sr = 116;
  ctx.strokeStyle = C.pink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, sr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, sr - 14, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = C.pink;
  ctx.textAlign = 'center';
  ctx.font = `700 26px ${f.mono}`;
  tracked(ctx, 'ADMITTED', 0, -8, 2.5, 'center');
  ctx.font = `500 20px ${f.mono}`;
  tracked(ctx, 'GOA · 2026', 0, 26, 2.5, 'center');
  sparkle(ctx, 0, -52, 13, C.pink);
  ctx.textAlign = 'left';
  ctx.restore();

  // Tagline rule
  const ty = py + ph + 70;
  dashedLine(ctx, M + 44, ty, W - M - 44, ty, withAlpha(C.green, 0.5), 3, [10, 9]);
  ctx.fillStyle = C.green;
  ctx.font = `italic 700 42px ${f.display}`;
  ctx.fillText('Less noise. More building.', M + 44, ty + 62);
  ctx.fillStyle = withAlpha(C.green, 0.7);
  ctx.font = `500 20px ${f.mono}`;
  ctx.textAlign = 'right';
  tracked(ctx, up(mottoFor(input.seed)), W - M - 44, ty + 62, 2.6, 'right');
  ctx.textAlign = 'left';

  // Signature strip — the detail that sells it as a real document.
  const sy = ty + 132;
  ctx.fillStyle = withAlpha(C.green, 0.75);
  ctx.font = `600 19px ${f.mono}`;
  tracked(ctx, 'SIGNATURE OF BEARER', M + 44, sy, 3);
  ctx.fillStyle = C.ink;
  const sigSize = fitText(
    ctx,
    input.name || 'Builder',
    380,
    46,
    (s) => `italic 600 ${s}px ${f.display}`,
    22
  );
  ctx.fillText(input.name || 'Builder', M + 52, sy + 52);
  void sigSize;
  dashedLine(ctx, M + 44, sy + 66, M + 44 + 420, sy + 66, withAlpha(C.green, 0.55), 2.5, [6, 7]);

  // Issuing authority, right-aligned against the signature
  ctx.textAlign = 'right';
  ctx.fillStyle = withAlpha(C.green, 0.75);
  ctx.font = `600 19px ${f.mono}`;
  tracked(ctx, 'ISSUED BY', W - M - 44, sy, 3, 'right');
  ctx.fillStyle = C.green;
  ctx.font = `700 26px ${f.mono}`;
  tracked(ctx, 'HACKER HOUSE GOA', W - M - 44, sy + 46, 2, 'right');
  ctx.textAlign = 'left';
  sparkle(ctx, W - M - 60, sy + 74, 12, C.pink);

  // Machine-readable zone
  const mz = H - M - 176;
  ctx.fillStyle = withAlpha(C.green, 0.1);
  ctx.fillRect(M, mz, W - M * 2, 132);
  ctx.fillStyle = C.ink;
  ctx.font = `500 30px ${f.mono}`;
  const nm = mrzLine((input.name || 'BUILDER').replace(/\s+/g, '<'), 22);
  const l1 = `P<IND${nm}`;
  const l2 = `${pass.replace(/-/g, '')}<IND2026<<${mrzLine(up(input.title).replace(/\s+/g, '<'), 14)}`;
  tracked(ctx, l1.slice(0, 30), M + 30, mz + 54, 3.6);
  tracked(ctx, l2.slice(0, 30), M + 30, mz + 104, 3.6);

  ctx.fillStyle = C.green;
  ctx.font = `600 20px ${f.mono}`;
  tracked(ctx, `${EVENT.place}  ·  ${EVENT.hashtag.toUpperCase()}`, M + 30, H - M - 20, 3);

  grain(ctx, 0, 0, W, H, 0.05);
}

/* ------------------------------------------------------------------ */
/* 02 — THE BOARDING PASS                                              */
/* ------------------------------------------------------------------ */
function boarding(ctx: Ctx, f: Fonts, input: CardInput) {
  const W = CARD_W;
  const H = CARD_H;
  const pass = passNumber(input.seed);
  const rng = new Rng(`bp:${input.seed}`);

  ctx.fillStyle = C.greenNight;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, 0, 0, W, H, 30, withAlpha(C.yellow, 0.1), 3.2, 'down');

  const M = 40;
  const cardX = M;
  const cardY = M;
  const cardW = W - M * 2;
  const cardH = H - M * 2;

  ctx.fillStyle = C.greenPanel;
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fill();
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = 5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.stroke();

  // Header strip
  ctx.fillStyle = C.yellow;
  roundRect(ctx, cardX, cardY, cardW, 92, 30);
  ctx.fill();
  ctx.fillRect(cardX, cardY + 60, cardW, 32);
  ctx.fillStyle = C.greenDeep;
  ctx.font = `700 27px ${f.pixel}`;
  tracked(ctx, `${EVENT.nameShort} ${EVENT.year}`, cardX + 34, cardY + 60, 2);
  ctx.textAlign = 'right';
  ctx.font = `700 27px ${f.mono}`;
  tracked(ctx, 'BOARDING PASS', cardX + cardW - 34, cardY + 60, 3, 'right');
  ctx.textAlign = 'left';

  // Photo window
  const px = cardX + 34;
  const py = cardY + 126;
  const pw = cardW - 68;
  const ph = 620;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 18);
  ctx.clip();
  if (input.img) {
    drawCover(ctx, input.img, px, py, pw, ph, input.placement);
  } else {
    ctx.fillStyle = C.greenDark;
    ctx.fillRect(px, py, pw, ph);
  }
  scrim(ctx, px, py + ph * 0.45, pw, ph * 0.55, C.greenNight, 0, 0.9);
  // Corner ticks inside the window
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = 5;
  const tl = 34;
  [
    [px + 18, py + 18, 1, 1],
    [px + pw - 18, py + 18, -1, 1],
    [px + 18, py + ph - 18, 1, -1],
    [px + pw - 18, py + ph - 18, -1, -1],
  ].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x + tl * sx, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + tl * sy);
    ctx.stroke();
  });
  ctx.restore();

  // Name + class sit over the bottom of the photo window
  ctx.fillStyle = C.cream;
  const nameSize = fitText(ctx, up(input.name || 'YOUR NAME'), pw - 60, 78, (s) => `700 ${s}px ${f.display}`, 34);
  ctx.fillText(up(input.name || 'YOUR NAME'), px + 30, py + ph - 74);
  ctx.fillStyle = C.yellow;
  ctx.font = `600 26px ${f.mono}`;
  tracked(ctx, up(input.title), px + 30, py + ph - 32, 3.2);
  void nameSize;

  // Perforation
  const perfY = py + ph + 52;
  perforate(ctx, cardX, perfY, cardX + cardW, perfY, 9, 26, C.greenNight);
  dashedLine(ctx, cardX + 26, perfY, cardX + cardW - 26, perfY, withAlpha(C.cream, 0.35), 3, [8, 10]);

  // Detail grid
  const gy = perfY + 62;
  const colW = (cardW - 68) / 3;
  const cell = (i: number, label: string, value: string) => {
    const x = cardX + 34 + colW * i;
    ctx.fillStyle = withAlpha(C.cream, 0.55);
    ctx.font = `600 19px ${f.mono}`;
    tracked(ctx, label, x, gy, 2.6);
    ctx.fillStyle = C.cream;
    const s = fitText(ctx, up(value), colW - 22, 34, (n) => `600 ${n}px ${f.mono}`, 17);
    ctx.fillText(up(value), x, gy + 40);
    void s;
  };
  cell(0, 'STACK', input.role || 'BUILDER');
  cell(1, 'GATE', 'GOA · 26');
  cell(2, 'PASS NO.', pass);

  const gy2 = gy + 96;
  ctx.fillStyle = withAlpha(C.cream, 0.55);
  ctx.font = `600 19px ${f.mono}`;
  tracked(ctx, 'DATES', cardX + 34, gy2, 2.6);
  ctx.fillStyle = C.cream;
  ctx.font = `600 34px ${f.mono}`;
  ctx.fillText(EVENT.dates, cardX + 34, gy2 + 40);

  ctx.textAlign = 'right';
  ctx.fillStyle = C.pink;
  ctx.font = `italic 700 34px ${f.display}`;
  ctx.fillText('Less noise. More building.', cardX + cardW - 34, gy2 + 40);
  ctx.textAlign = 'left';

  const gy3 = gy2 + 92;
  ctx.fillStyle = withAlpha(C.cream, 0.55);
  ctx.font = `600 19px ${f.mono}`;
  tracked(ctx, 'BOARDING NOTE', cardX + 34, gy3, 2.6);
  ctx.fillStyle = C.yellow;
  const noteSize = fitText(
    ctx,
    up(mottoFor(input.seed)),
    cardW - 68,
    32,
    (s) => `600 ${s}px ${f.mono}`,
    18
  );
  tracked(ctx, up(mottoFor(input.seed)), cardX + 34, gy3 + 40, 2.4);
  void noteSize;

  // Barcode footer
  const by = cardY + cardH - 128;
  barcode(ctx, cardX + 34, by, cardW - 68, 62, input.seed, C.cream);
  ctx.fillStyle = withAlpha(C.cream, 0.6);
  ctx.font = `500 19px ${f.mono}`;
  tracked(ctx, `${pass}  ·  ${EVENT.place}  ·  ${EVENT.hashtag.toUpperCase()}`, cardX + 34, by + 92, 2.4);

  sparkle(ctx, cardX + cardW - 60, gy - 6, 14, C.yellow);
  star6(ctx, cardX + cardW - 74, gy3 + 22, 18, withAlpha(C.pink, rng.range(0.7, 1)));
  grain(ctx, 0, 0, W, H, 0.05);
}

/** Fixed points for the photo circle, shared with photoRect.ts for panning. */
export const POSTCARD_PHOTO = { cx: 540, cy: 560, r: 190 };

const BEACH_BAG_ITEMS = [
  'COCONUT WATER',
  'VS CODE',
  'LO-FI BEATS',
  'SUNSCREEN SPF 50',
  'OLD MONK',
  'SPARE CHARGER',
  'FLIP-FLOPS',
  'INSTANT NOODLES',
  'PORTABLE MOUSE',
  'SUNGLASSES',
] as const;

function lightningBolt(ctx: Ctx, cx: number, cy: number, h: number, color: string) {
  const w = h * 0.56;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, -h / 2);
  ctx.lineTo(-w * 0.32, h * 0.06);
  ctx.lineTo(-w * 0.02, h * 0.06);
  ctx.lineTo(-w * 0.18, h / 2);
  ctx.lineTo(w * 0.32, -h * 0.06);
  ctx.lineTo(w * 0.02, -h * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* 03 — THE POSTCARD                                                   */
/* An illustrated beach scrapbook: stamp, ribbon, road sign, house,     */
/* speech bubble, scalloped photo ring, faux QR — the "unmistakably    */
/* this event" version of the Builder ID.                              */
/* ------------------------------------------------------------------ */
function poster(ctx: Ctx, f: Fonts, input: CardInput) {
  const W = CARD_W;
  const H = CARD_H;
  const rng = new Rng(`pc:${input.seed}`);
  const pass = passNumber(input.seed);
  const { cx: PCX, cy: PCY, r: PR } = POSTCARD_PHOTO;

  // Paper base + thick brand border.
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);
  const M = 26;
  ctx.save();
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = 16;
  roundRect(ctx, M, M, W - M * 2, H - M * 2, 20);
  ctx.stroke();
  ctx.strokeStyle = C.pink;
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 8]);
  roundRect(ctx, M + 16, M + 16, W - (M + 16) * 2, H - (M + 16) * 2, 12);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ---- top row: stamp · ribbon · badge ------------------------------
  postageStamp(
    ctx,
    62,
    58,
    158,
    { paper: C.cream, ink: C.greenDeep, sky: '#BFE1E8', sea: C.green, sun: C.yellow, palm: C.greenDeep },
    f.mono,
    -0.06
  );

  palmTree(ctx, 522, 78, 44, { trunk: '#6B4226', frond: C.green, coconut: '#3A2412' }, 0.1, 6);
  ribbonBanner(ctx, 528, 46, 280, 96, C.pink, {
    text: `${EVENT.nameShort} ${EVENT.year}`,
    fg: C.cream,
    font: f.pixel,
    fontSize: 20,
    spacing: 0.6,
  });

  const badgeCx = 908;
  const badgeCy = 178;
  const badgeR = 92;
  ctx.save();
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.greenDeep;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = C.greenDeep;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  palmTree(ctx, badgeCx - 12, badgeCy + 30, 46, { trunk: '#6B4226', frond: C.green, coconut: '#3A2412' }, 0.08, 6);
  ctx.save();
  ctx.fillStyle = C.greenDeep;
  ctx.font = `700 ${18}px ${f.mono}`;
  ctx.textBaseline = 'middle';
  const topArc = 'BUILD IN GOA';
  const topSp = 2.4;
  const topW = [...topArc].reduce((a, c) => a + ctx.measureText(c).width + topSp, 0);
  arcText(ctx, topArc, badgeCx, badgeCy, badgeR - 26, -Math.PI / 2 - topW / (badgeR - 26) / 2, topSp, 1);
  const botArc = 'SHIP FROM PARADISE';
  ctx.font = `700 15px ${f.mono}`;
  const botSp = 2;
  const botW = [...botArc].reduce((a, c) => a + ctx.measureText(c).width + botSp, 0);
  arcText(ctx, botArc, badgeCx, badgeCy, badgeR - 22, Math.PI / 2 + botW / (badgeR - 22) / 2, botSp, -1);
  ctx.restore();

  birdFlock(ctx, 250, 118, 26, 30, C.greenDeep);
  flyingBird(ctx, 380, 150, 22, C.greenDeep);
  sparkle(ctx, 460, 210, 14, C.pink);
  sparkle(ctx, 780, 90, 12, C.yellow);
  sparkle(ctx, 812, 260, 16, C.pink);

  // ---- title ----------------------------------------------------------
  const titleY = 330;
  ctx.textBaseline = 'alphabetic';
  const parts: [string, string, string][] = [
    ['HACKER ', C.greenDeep, f.display],
    [EVENT.hindi, C.pink, f.hindi],
    [' HOUSE', C.greenDeep, f.display],
  ];
  const titleSize = 68;
  ctx.font = `700 ${titleSize}px ${f.display}`;
  const widths = parts.map(([t, , font]) => {
    ctx.font = `700 ${titleSize}px ${font}`;
    return ctx.measureText(t).width;
  });
  let tx = W / 2 - widths.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < parts.length; i++) {
    const [t, color, font] = parts[i];
    ctx.fillStyle = color;
    ctx.font = `700 ${titleSize}px ${font}`;
    ctx.fillText(t, tx, titleY);
    tx += widths[i];
  }

  // ---- scenery flanking the photo --------------------------------------
  // Road sign: BUILD / SHIP / REPEAT, planted left of the photo.
  const signX = 150;
  const signBase = PCY + PR * 0.75;
  ctx.save();
  ctx.strokeStyle = '#8B5A2B';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(signX, signBase);
  ctx.lineTo(signX, signBase - 330);
  ctx.stroke();
  ctx.restore();
  // All three plaques hang off the same side of the post, arrow tips
  // pointing right, varying only in width and colour.
  const signPlaque = (y: number, text: string, color: string, w: number) => {
    const h = 54;
    const notch = 16;
    const left = signX - 8;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(left, y - h / 2);
    ctx.lineTo(left + w - notch, y - h / 2);
    ctx.lineTo(left + w, y);
    ctx.lineTo(left + w - notch, y + h / 2);
    ctx.lineTo(left, y + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.cream;
    const size = fitText(ctx, text, w - notch - 24, 24, (s) => `700 ${s}px ${f.pixel}`, 14);
    ctx.font = `700 ${size}px ${f.pixel}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    tracked(ctx, text, left + (w - notch) / 2, y + 2, 1.2, 'center');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  };
  signPlaque(signBase - 300, 'BUILD', C.pink, 160);
  signPlaque(signBase - 232, 'SHIP', C.yellow, 130);
  signPlaque(signBase - 164, 'REPEAT', C.green, 186);
  sparkle(ctx, signX - 34, signBase - 340, 12, C.pink);

  // Surfboards leaning at the foot of the sign.
  surfboard(ctx, signX - 46, signBase - 66, 150, C.pink, C.cream, -0.16);
  surfboard(ctx, signX - 6, signBase - 60, 128, C.yellow, C.greenDeep, -0.3);

  // Speech bubble off the top-right of the photo.
  speechBubble(
    ctx,
    908,
    PCY - PR * 0.68,
    206,
    92,
    "LET'S BUILD!",
    C.yellow,
    C.greenDeep,
    f.pixel,
    2.35,
    24
  );
  star6(ctx, 994, PCY - PR * 0.98, 15, C.pink);

  // Goan bungalow, scooter parked in front, tall palm anchoring the corner —
  // kept inboard of the border so nothing clips.
  goanHouse(ctx, 880, PCY + PR * 0.9, 148, 186, {
    wall: '#C24A62',
    roof: C.green,
    trim: C.yellow,
    window: '#BFE1E8',
  });
  scooter(ctx, 742, PCY + PR * 1.1, 128, { body: C.pink, trim: C.greenDeep, wheel: C.greenDeep });
  palmTree(ctx, 998, PCY + PR * 1.06, 210, { trunk: '#6B4226', frond: C.green, coconut: '#3A2412' }, 0.06, 7);

  // ---- photo -----------------------------------------------------------
  scallopRing(ctx, PCX, PCY, PR + 14, 44, 15, C.pink, C.cream);
  ctx.save();
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.arc(PCX, PCY, PR + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(PCX, PCY, PR, 0, Math.PI * 2);
  ctx.clip();
  if (input.img) {
    drawCover(ctx, input.img, PCX - PR, PCY - PR, PR * 2, PR * 2, input.placement);
  } else {
    ctx.fillStyle = C.creamDim;
    ctx.fillRect(PCX - PR, PCY - PR, PR * 2, PR * 2);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = C.greenDeep;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(PCX, PCY, PR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ---- nameplate + role --------------------------------------------------
  const plateY = PCY + PR + 76;
  ctx.fillStyle = C.green;
  roundRect(ctx, W / 2 - 320, plateY - 40, 640, 80, 40);
  ctx.fill();
  ctx.fillStyle = C.cream;
  const nameSize = fitText(
    ctx,
    up(input.name || 'YOUR NAME'),
    560,
    46,
    (s) => `700 ${s}px ${f.display}`,
    24
  );
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(up(input.name || 'YOUR NAME'), W / 2, plateY + nameSize * 0.06);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const roleY = plateY + 96;
  ctx.font = `700 26px ${f.mono}`;
  const roleText = up(input.title);
  const roleSp = 2.4;
  const roleW = [...roleText].reduce((a, c) => a + ctx.measureText(c).width + roleSp, 0);
  const pillW = Math.min(560, roleW + 110);
  ctx.fillStyle = C.yellow;
  roundRect(ctx, W / 2 - pillW / 2, roleY - 32, pillW, 64, 32);
  ctx.fill();
  lightningBolt(ctx, W / 2 - pillW / 2 + 30, roleY, 34, C.pink);
  lightningBolt(ctx, W / 2 + pillW / 2 - 30, roleY, 34, C.pink);
  ctx.fillStyle = C.pink;
  ctx.textBaseline = 'middle';
  tracked(ctx, roleText, W / 2, roleY + 2, roleSp, 'center');
  ctx.textBaseline = 'alphabetic';

  // ---- three-column detail block -----------------------------------------
  const dY0 = roleY + 70;
  const dY1 = dY0 + 172;
  const colX = [70, W / 2, W - 70];
  dashedLine(ctx, colX[0] + 260, dY0, colX[0] + 260, dY1, withAlpha(C.greenDeep, 0.35), 2.5, [7, 7]);
  dashedLine(ctx, colX[2] - 260, dY0, colX[2] - 260, dY1, withAlpha(C.greenDeep, 0.35), 2.5, [7, 7]);

  const colLabel = (x: number, align: 'left' | 'center' | 'right', text: string) => {
    ctx.fillStyle = C.pink;
    ctx.font = `700 18px ${f.mono}`;
    ctx.textAlign = align;
    sparkle(ctx, align === 'left' ? x - 14 : align === 'right' ? x + 14 : x - 100, dY0 + 2, 7, C.pink);
    tracked(ctx, text, x, dY0 + 4, 2.4, align);
    ctx.textAlign = 'left';
  };

  // Col 1 — builder class + a scannable-looking QR.
  colLabel(colX[0], 'left', 'BUILDER CLASS');
  ctx.fillStyle = C.pink;
  const classSize = fitText(ctx, up(input.title), 230, 28, (s) => `700 ${s}px ${f.mono}`, 14);
  ctx.font = `700 ${classSize}px ${f.mono}`;
  ctx.fillText(up(input.title), colX[0], dY0 + 38);
  fauxQr(ctx, colX[0], dY0 + 54, 108, C.greenDeep, C.cream, input.seed);

  // Col 2 — beach bag: three deterministic essentials.
  colLabel(W / 2 - 140, 'left', 'BEACH BAG');
  const bag: string[] = [];
  const pool = [...BEACH_BAG_ITEMS];
  for (let i = 0; i < 3; i++) {
    const idx = rng.int(0, pool.length - 1);
    bag.push(pool.splice(idx, 1)[0]);
  }
  bag.forEach((item, i) => {
    const iy = dY0 + 38 + i * 36;
    ctx.fillStyle = [C.pink, C.yellow, C.green][i % 3];
    ctx.beginPath();
    ctx.arc(W / 2 - 128, iy - 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.greenDeep;
    const itemSize = fitText(ctx, item, 200, 19, (s) => `600 ${s}px ${f.mono}`, 13);
    ctx.font = `600 ${itemSize}px ${f.mono}`;
    ctx.fillText(item, W / 2 - 106, iy);
  });

  // Col 3 — currently shipping + builder ID + barcode.
  colLabel(W - 70, 'right', 'CURRENTLY SHIPPING');
  ctx.fillStyle = C.pink;
  const motto = up(mottoFor(input.seed));
  ctx.textAlign = 'right';
  const mottoSize = fitText(ctx, motto, 250, 22, (s) => `700 ${s}px ${f.mono}`, 13);
  ctx.font = `700 ${mottoSize}px ${f.mono}`;
  tracked(ctx, motto, W - 70, dY0 + 38, 1.4, 'right');
  ctx.textAlign = 'left';
  waveLine(ctx, colX[2] - 236, dY0 + 58, 236, 5, withAlpha(C.greenDeep, 0.4), 3, 6);
  ctx.fillStyle = withAlpha(C.greenDeep, 0.7);
  ctx.font = `600 15px ${f.mono}`;
  ctx.textAlign = 'right';
  tracked(ctx, 'BUILDER ID', W - 70, dY0 + 86, 2, 'right');
  ctx.fillStyle = C.greenDeep;
  ctx.font = `700 22px ${f.mono}`;
  tracked(ctx, `#${pass}`, W - 70, dY0 + 114, 1.4, 'right');
  ctx.textAlign = 'left';
  barcode(ctx, colX[2] - 236, dY0 + 134, 236, 32, input.seed, C.greenDeep);

  // ---- bottom hill band -----------------------------------------------
  // Anchored to where the detail block actually ends, so the hill can never
  // ride up over the QR code or barcode regardless of how that block reflows.
  const hillY = Math.max(H - M - 16 - 118, dY1 + 74);
  ctx.save();
  roundRect(ctx, M, M, W - M * 2, H - M * 2, 20);
  ctx.clip();
  ctx.fillStyle = C.green;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, hillY + 60);
  ctx.quadraticCurveTo(W * 0.22, hillY - 30, W * 0.5, hillY + 10);
  ctx.quadraticCurveTo(W * 0.78, hillY + 46, W, hillY - 10);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = withAlpha(C.yellow, 0.85);
  ctx.beginPath();
  ctx.arc(160, hillY + 10, 30, 0, Math.PI * 2);
  ctx.fill();
  palmTree(ctx, 250, hillY + 62, 90, { trunk: C.greenDeep, frond: '#0B4A28', coconut: C.greenDeep }, -0.14, 6);
  sailboat(ctx, 96, hillY + 108, 68, { sail: C.cream, hull: C.greenDeep });
  waveLine(ctx, 40, hillY + 128, 200, 5, withAlpha(C.cream, 0.6), 3, 5);
  ctx.restore();

  ribbonBanner(ctx, W / 2, hillY - 30, 300, 78, C.pink, {
    text: EVENT.hashtag.toUpperCase(),
    fg: C.cream,
    font: f.pixel,
    fontSize: 24,
    spacing: 1,
  });

  grain(ctx, 0, 0, W, H, 0.035);
}
