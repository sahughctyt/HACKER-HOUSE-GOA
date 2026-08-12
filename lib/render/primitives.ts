/**
 * Reusable canvas drawing helpers shared by every frame + card layout.
 * Everything is written in a normalised design space; callers scale the
 * context once so the same code renders a 320px preview and a 2160px export.
 */
import { Rng } from '../random';

export type Ctx = CanvasRenderingContext2D;

export function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Photo placement inside a rect: cover-fit, honouring the user's pan/zoom. */
export type Placement = {
  /** 0..1 focal point across the source image */
  fx: number;
  fy: number;
  /** 1 = cover-fit exactly, >1 zooms in */
  zoom: number;
};

export const DEFAULT_PLACEMENT: Placement = { fx: 0.5, fy: 0.42, zoom: 1 };

/**
 * Draws `img` covering the rect. Handles any source aspect ratio — portrait,
 * landscape, square — without distortion, and lets the subject sit off-centre.
 */
export function drawCover(
  ctx: Ctx,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Placement = DEFAULT_PLACEMENT
) {
  const iw = imgWidth(img);
  const ih = imgHeight(img);
  if (!iw || !ih) return;

  const scale = Math.max(w / iw, h / ih) * Math.max(0.2, p.zoom);
  const dw = iw * scale;
  const dh = ih * scale;

  // Slack is how far the image can travel before it uncovers the rect.
  const slackX = dw - w;
  const slackY = dh - h;
  const dx = x - clamp(p.fx, 0, 1) * slackX;
  const dy = y - clamp(p.fy, 0, 1) * slackY;

  ctx.drawImage(img, dx, dy, dw, dh);
}

export function imgWidth(img: CanvasImageSource): number {
  const a = img as HTMLImageElement & ImageBitmap & HTMLCanvasElement;
  return a.naturalWidth || a.width || 0;
}

export function imgHeight(img: CanvasImageSource): number {
  const a = img as HTMLImageElement & ImageBitmap & HTMLCanvasElement;
  return a.naturalHeight || a.height || 0;
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Letter-spaced text — canvas letterSpacing is not universally supported. */
export function tracked(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: 'left' | 'center' | 'right' = 'left'
) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'left' ? x : align === 'center' ? x - total / 2 : x - total;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
  return total;
}

/** Fits `text` to `maxWidth` by stepping the font size down. */
export function fitText(
  ctx: Ctx,
  text: string,
  maxWidth: number,
  startSize: number,
  fontFor: (size: number) => string,
  minSize = 10
): number {
  let size = startSize;
  ctx.font = fontFor(size);
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= Math.max(1, size * 0.04);
    ctx.font = fontFor(size);
  }
  return size;
}

/** Text bent around a circle. Used for the PFP ring lockups. */
export function arcText(
  ctx: Ctx,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  spacing = 0,
  direction: 1 | -1 = 1
) {
  const chars = [...text];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let angle = startAngle;
  for (const ch of chars) {
    const w = ctx.measureText(ch).width + spacing;
    const step = w / radius;
    angle += (step / 2) * direction;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + (direction === 1 ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += (step / 2) * direction;
  }
  ctx.restore();
  return angle - startAngle;
}

/**
 * Coconut palm silhouette — the single most Goa-coded shape there is.
 * Drawn trunk-up from (x, baseY), `h` tall. Leans slightly for life.
 */
export type PalmColors = {
  trunk: string;
  frond: string;
  /** Optional third tone for a coconut cluster; falls back to `trunk`. */
  coconut?: string;
};

/**
 * A proper illustrated coconut palm — two-tone trunk and fronds, each frond
 * a real tapered leaf blade (not a stroked line), because at small sizes a
 * single-colour stroke silhouette reads as a dandelion, not a tree.
 */
export function palmTree(
  ctx: Ctx,
  x: number,
  baseY: number,
  h: number,
  colors: PalmColors,
  lean = 0.16,
  fronds = 7
) {
  const topX = x + h * lean;
  const topY = baseY - h * 0.94;
  const trunkW = Math.max(2.5, h * 0.075);

  ctx.save();

  // Trunk: two joined curves offset by width, so it reads as a solid taper
  // even at a few dozen pixels tall, with faint knuckle bands for texture.
  const midX = x + h * lean * 0.42;
  const midY = baseY - h * 0.5;
  ctx.fillStyle = colors.trunk;
  ctx.beginPath();
  ctx.moveTo(x - trunkW * 0.6, baseY);
  ctx.quadraticCurveTo(midX - trunkW * 0.3, midY, topX - trunkW * 0.22, topY);
  ctx.lineTo(topX + trunkW * 0.22, topY);
  ctx.quadraticCurveTo(midX + trunkW * 0.3, midY, x + trunkW * 0.6, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha('#000000', 0.12);
  ctx.lineWidth = Math.max(1, trunkW * 0.16);
  for (let b = 1; b <= 3; b++) {
    const t = b / 4;
    const bx = x + (topX - x) * t;
    const by = baseY + (topY - baseY) * t;
    const bw = trunkW * (0.6 - t * 0.25);
    ctx.beginPath();
    ctx.moveTo(bx - bw, by + bw * 0.5);
    ctx.lineTo(bx + bw, by - bw * 0.5);
    ctx.stroke();
  }

  // Fronds: real leaf blades — sampled along a drooping curve, offset by a
  // width that tapers to a point, so each one fills as a proper leaf shape.
  const frondLen = h * 0.5;
  ctx.fillStyle = colors.frond;
  for (let i = 0; i < fronds; i++) {
    const t = i / (fronds - 1);
    const angle = -Math.PI * 0.94 + t * Math.PI * 0.88;
    const droopAmt = frondLen * (0.32 + 0.3 * Math.abs(t - 0.5) * 2);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    // Perpendicular for the blade's width.
    const px = -dy;
    const py = dx;
    const maxW = frondLen * 0.1;

    const N = 10;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let s = 0; s <= N; s++) {
      const u = s / N;
      // Central curve: straight along (dx,dy) then drooping under gravity.
      const cx0 = topX + dx * frondLen * u;
      const cy0 = topY + dy * frondLen * u + droopAmt * u * u;
      const w = maxW * Math.sin(Math.PI * u) * (1 - u * 0.15);
      left.push([cx0 + px * w, cy0 + py * w]);
      right.push([cx0 - px * w, cy0 - py * w]);
    }
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (const [lx, ly] of left) ctx.lineTo(lx, ly);
    for (let s = right.length - 1; s >= 0; s--) ctx.lineTo(right[s][0], right[s][1]);
    ctx.closePath();
    ctx.fill();
    // A thin midrib so the blade doesn't read as a flat blob.
    ctx.strokeStyle = withAlpha('#000000', 0.1);
    ctx.lineWidth = Math.max(1, maxW * 0.12);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + dx * frondLen * 0.5,
      topY + dy * frondLen * 0.5 + droopAmt * 0.25,
      topX + dx * frondLen + px * 0,
      topY + dy * frondLen + droopAmt
    );
    ctx.stroke();
  }

  // A cluster of coconuts tucked under the crown.
  ctx.fillStyle = colors.coconut ?? colors.trunk;
  const cAngle = -Math.PI / 2 + lean * 0.6;
  for (const [dx, dy, r] of [
    [-0.024, 0.03, 0.03],
    [0.026, 0.036, 0.028],
    [0.002, 0.052, 0.026],
  ] as const) {
    ctx.beginPath();
    ctx.arc(
      topX + Math.cos(cAngle) * h * dx * 4,
      topY + Math.sin(cAngle) * h * dx * 4 + h * dy,
      h * r,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
}

/** A beach surfboard, planted upright — the other unmistakable Goa prop. */
export function surfboard(
  ctx: Ctx,
  x: number,
  y: number,
  h: number,
  color: string,
  stripe: string,
  tilt = -0.08
) {
  const w = h * 0.26;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.quadraticCurveTo(w / 2, -h * 0.32, w / 2, 0);
  ctx.quadraticCurveTo(w / 2, h * 0.4, 0, h / 2);
  ctx.quadraticCurveTo(-w / 2, h * 0.4, -w / 2, 0);
  ctx.quadraticCurveTo(-w / 2, -h * 0.32, 0, -h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = stripe;
  ctx.fillRect(-w * 0.14, -h * 0.42, w * 0.28, h * 0.84);
  ctx.restore();
}

/** A single flying bird — the shorthand double-arc gulls use over every beach. */
export function flyingBird(ctx: Ctx, cx: number, cy: number, w: number, color: string, lineWidth?: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth ?? w * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.quadraticCurveTo(cx - w / 4, cy - w * 0.42, cx, cy);
  ctx.quadraticCurveTo(cx + w / 4, cy - w * 0.42, cx + w / 2, cy);
  ctx.stroke();
  ctx.restore();
}

/** A small V-formation of flying birds, the way they read from a distance. */
export function birdFlock(
  ctx: Ctx,
  cx: number,
  cy: number,
  spread: number,
  size: number,
  color: string
) {
  flyingBird(ctx, cx, cy, size, color);
  flyingBird(ctx, cx - spread, cy + spread * 0.32, size * 0.8, color);
  flyingBird(ctx, cx + spread * 1.1, cy + spread * 0.5, size * 0.65, color);
}

/**
 * A hanging ribbon banner — rectangle with a V-notch cut into the bottom
 * edge, the way a pennant tag reads. `text` is centred inside if given.
 */
export function ribbonBanner(
  ctx: Ctx,
  cx: number,
  y: number,
  w: number,
  h: number,
  color: string,
  opts?: { text?: string; fg?: string; font?: string; fontSize?: number; spacing?: number; notch?: number }
) {
  const notch = opts?.notch ?? h * 0.4;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, y);
  ctx.lineTo(cx + w / 2, y);
  ctx.lineTo(cx + w / 2, y + h);
  ctx.lineTo(cx, y + h - notch);
  ctx.lineTo(cx - w / 2, y + h);
  ctx.closePath();
  ctx.fill();
  if (opts?.text) {
    ctx.fillStyle = opts.fg ?? '#fff';
    const spacing = opts.spacing ?? 1.5;
    const maxSize = opts.fontSize ?? h * 0.32;
    const font = opts.font ?? 'sans-serif';
    // Text has to actually fit the ribbon, not just look proportional to it.
    const size = fitText(
      ctx,
      opts.text,
      w * 0.84,
      maxSize,
      (s) => `700 ${s}px ${font}`,
      10
    );
    ctx.font = `700 ${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    tracked(ctx, opts.text, cx, y + h * 0.42, spacing * (size / maxSize), 'center');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

/**
 * A postage stamp: a perforated square (scalloped edge, dashed inner rule)
 * holding a tiny palm + sun postcard scene.
 */
export function postageStamp(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  colors: { paper: string; ink: string; sky: string; sea: string; sun: string; palm: string },
  font: string,
  angle = -0.07
) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(angle);
  const s = size;
  const hw = s / 2;

  // Perforated edge: paper square with scalloped bites taken out of each side.
  ctx.fillStyle = colors.paper;
  ctx.beginPath();
  ctx.rect(-hw, -hw, s, s);
  ctx.fill();
  const bite = s * 0.052;
  ctx.globalCompositeOperation = 'destination-out';
  const perSide = 7;
  for (let i = 0; i <= perSide; i++) {
    const t = -hw + (s * i) / perSide;
    ctx.beginPath();
    ctx.arc(t, -hw, bite, 0, Math.PI * 2);
    ctx.arc(t, hw, bite, 0, Math.PI * 2);
    ctx.arc(-hw, t, bite, 0, Math.PI * 2);
    ctx.arc(hw, t, bite, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // Inner scene, inset from the perforation.
  const inset = s * 0.1;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = Math.max(1.5, s * 0.014);
  ctx.strokeRect(-hw + inset, -hw + inset, s - inset * 2, s - inset * 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(-hw + inset, -hw + inset, s - inset * 2, s - inset * 2);
  ctx.clip();
  ctx.fillStyle = colors.sky;
  ctx.fillRect(-hw, -hw, s, s * 0.62);
  ctx.fillStyle = colors.sea;
  ctx.fillRect(-hw, -hw + s * 0.62, s, s * 0.5);
  ctx.fillStyle = colors.sun;
  ctx.beginPath();
  ctx.arc(hw * 0.28, -hw + s * 0.34, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
  palmTree(
    ctx,
    -hw * 0.32,
    -hw + s * 0.66,
    s * 0.44,
    { trunk: colors.ink, frond: colors.palm, coconut: colors.ink },
    0.14,
    6
  );
  ctx.restore();

  ctx.fillStyle = colors.ink;
  ctx.font = `700 ${s * 0.11}px ${font}`;
  ctx.textAlign = 'center';
  tracked(ctx, 'GOA', 0, hw - inset * 1.15, s * 0.01, 'center');
  ctx.font = `500 ${s * 0.075}px ${font}`;
  tracked(ctx, 'INDIA', 0, hw - inset * 0.35, s * 0.008, 'center');
  ctx.textAlign = 'left';
  ctx.restore();
}

/**
 * A rounded-rect "photo window" with a scalloped rick-rack ring around it —
 * the zigzag border a lot of Indian postcard frames use.
 */
export function scallopRing(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  teeth: number,
  toothDepth: number,
  colorA: string,
  colorB: string
) {
  ctx.save();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + 1) / teeth) * Math.PI * 2;
    const aMid = (a0 + a1) / 2;
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    ctx.lineTo(cx + Math.cos(aMid) * (r + toothDepth), cy + Math.sin(aMid) * (r + toothDepth));
    ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A rounded speech bubble with a small triangular tail. */
export function speechBubble(
  ctx: Ctx,
  cx: number,
  cy: number,
  w: number,
  h: number,
  text: string,
  bg: string,
  fg: string,
  font: string,
  tailAngle: number,
  maxFontSize = h * 0.34
) {
  ctx.save();
  ctx.fillStyle = bg;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h * 0.42);
  ctx.fill();
  const tx = cx + Math.cos(tailAngle) * (w * 0.32);
  const ty = cy + Math.sin(tailAngle) * (h * 0.32);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + Math.cos(tailAngle) * h * 0.4, ty + Math.sin(tailAngle) * h * 0.4);
  ctx.lineTo(tx + Math.cos(tailAngle + 0.9) * h * 0.22, ty + Math.sin(tailAngle + 0.9) * h * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fg;
  // Text has to fit the pill, not just look proportional to it.
  const size = fitText(ctx, text, w * 0.84, maxFontSize, (s) => `700 ${s}px ${font}`, 12);
  ctx.font = `700 ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  tracked(ctx, text, cx, cy + h * 0.02, size * 0.06, 'center');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/**
 * A small two-storey Goan bungalow — laterite walls, a sloped roof, one
 * window with shutters and a balcony rail. Deliberately toylike.
 */
export function goanHouse(
  ctx: Ctx,
  x: number,
  baseY: number,
  w: number,
  h: number,
  colors: { wall: string; roof: string; trim: string; window: string }
) {
  ctx.save();
  const wallH = h * 0.66;
  const wallY = baseY - wallH;

  // Wall
  ctx.fillStyle = colors.wall;
  ctx.fillRect(x, wallY, w, wallH);

  // Roof
  ctx.fillStyle = colors.roof;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.12, wallY);
  ctx.lineTo(x + w / 2, wallY - h * 0.3);
  ctx.lineTo(x + w * 1.12, wallY);
  ctx.closePath();
  ctx.fill();

  // Balcony band
  ctx.fillStyle = colors.trim;
  ctx.fillRect(x, wallY + wallH * 0.52, w, wallH * 0.1);
  ctx.lineWidth = Math.max(1, w * 0.018);
  ctx.strokeStyle = colors.trim;
  for (let i = 1; i < 6; i++) {
    const rx = x + (w * i) / 6;
    ctx.beginPath();
    ctx.moveTo(rx, wallY + wallH * 0.62);
    ctx.lineTo(rx, wallY + wallH * 0.84);
    ctx.stroke();
  }

  // Window + shutters
  ctx.fillStyle = colors.window;
  ctx.fillRect(x + w * 0.32, wallY + wallH * 0.12, w * 0.36, wallH * 0.32);
  ctx.fillStyle = colors.trim;
  ctx.fillRect(x + w * 0.28, wallY + wallH * 0.12, w * 0.06, wallH * 0.32);
  ctx.fillRect(x + w * 0.66, wallY + wallH * 0.12, w * 0.06, wallH * 0.32);

  // Door
  ctx.fillStyle = colors.trim;
  ctx.fillRect(x + w * 0.4, wallY + wallH * 0.86, w * 0.2, wallH * 0.24);
  ctx.restore();
}

/** A side-view scooter, parked — the errand-running Goa cliché. */
export function scooter(
  ctx: Ctx,
  x: number,
  baseY: number,
  w: number,
  colors: { body: string; trim: string; wheel: string }
) {
  const h = w * 0.62;
  ctx.save();
  ctx.fillStyle = colors.wheel;
  ctx.beginPath();
  ctx.arc(x + w * 0.22, baseY, h * 0.22, 0, Math.PI * 2);
  ctx.arc(x + w * 0.82, baseY, h * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.14, baseY - h * 0.1);
  ctx.quadraticCurveTo(x + w * 0.1, baseY - h * 0.55, x + w * 0.3, baseY - h * 0.55);
  ctx.lineTo(x + w * 0.5, baseY - h * 0.55);
  ctx.quadraticCurveTo(x + w * 0.62, baseY - h * 0.55, x + w * 0.66, baseY - h * 0.32);
  ctx.quadraticCurveTo(x + w * 0.78, baseY - h * 0.3, x + w * 0.9, baseY - h * 0.1);
  ctx.quadraticCurveTo(x + w * 0.95, baseY - h * 0.02, x + w * 0.82, baseY - h * 0.02);
  ctx.lineTo(x + w * 0.22, baseY - h * 0.02);
  ctx.quadraticCurveTo(x + w * 0.1, baseY - h * 0.02, x + w * 0.14, baseY - h * 0.1);
  ctx.closePath();
  ctx.fill();

  // Handlebar + seat trim
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = Math.max(1.5, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.66, baseY - h * 0.32);
  ctx.lineTo(x + w * 0.7, baseY - h * 0.72);
  ctx.moveTo(x + w * 0.6, baseY - h * 0.72);
  ctx.lineTo(x + w * 0.82, baseY - h * 0.72);
  ctx.stroke();
  ctx.restore();
}

/**
 * A deterministic, QR-looking module grid with finder squares in three
 * corners. It doesn't decode — it reads as a scan target at a glance, which
 * is what a printed card actually needs.
 */
export function fauxQr(ctx: Ctx, x: number, y: number, size: number, fg: string, bg: string, seed: string) {
  const grid = 15;
  const cell = size / grid;
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = fg;

  const finder = (fx: number, fy: number) => {
    ctx.fillRect(fx, fy, cell * 7, cell * 7);
    ctx.fillStyle = bg;
    ctx.fillRect(fx + cell, fy + cell, cell * 5, cell * 5);
    ctx.fillStyle = fg;
    ctx.fillRect(fx + cell * 2, fy + cell * 2, cell * 3, cell * 3);
  };
  finder(x, y);
  finder(x + size - cell * 7, y);
  finder(x, y + size - cell * 7);

  const rng = new Rng(`qr:${seed}`);
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c > grid - 9) || (r > grid - 9 && c < 8);
      if (inFinder) continue;
      if (rng.bool(0.44)) ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
    }
  }
  ctx.restore();
}

/** A little sailboat — hull, mast and one triangular sail, sitting on baseY. */
export function sailboat(
  ctx: Ctx,
  x: number,
  baseY: number,
  w: number,
  colors: { sail: string; hull: string }
) {
  const h = w * 0.9;
  ctx.save();
  ctx.fillStyle = colors.sail;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, baseY - h);
  ctx.lineTo(x + w * 0.42, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.hull;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.24, baseY);
  ctx.lineTo(x + w * 0.6, baseY);
  ctx.lineTo(x + w * 0.46, baseY + w * 0.16);
  ctx.lineTo(x - w * 0.1, baseY + w * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A single scalloped wave line — the beach-postcard horizon motif. */
export function waveLine(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  amp: number,
  color: string,
  lineWidth: number,
  bumps = 6
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const step = w / bumps;
  ctx.moveTo(x, y);
  for (let i = 0; i < bumps; i++) {
    const cx1 = x + step * (i + 0.5);
    const cy1 = y + (i % 2 === 0 ? -amp : amp);
    const ex = x + step * (i + 1);
    ctx.quadraticCurveTo(cx1, cy1, ex, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Four-point sparkle — the ✦ that runs through the whole identity. */
export function sparkle(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  const w = r * 0.26;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + w, cy - w, cx + r, cy);
  ctx.quadraticCurveTo(cx + w, cy + w, cx, cy + r);
  ctx.quadraticCurveTo(cx - w, cy + w, cx - r, cy);
  ctx.quadraticCurveTo(cx - w, cy - w, cx, cy - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function star6(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}

/** Halftone dot field — the print-y texture from the poster layouts. */
export function halftone(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
  color: string,
  maxR = step * 0.34,
  fade: 'none' | 'down' | 'up' | 'radial' = 'none'
) {
  ctx.save();
  ctx.fillStyle = color;
  for (let py = y; py < y + h; py += step) {
    for (let px = x; px < x + w; px += step) {
      let t = 1;
      if (fade === 'down') t = 1 - (py - y) / h;
      else if (fade === 'up') t = (py - y) / h;
      else if (fade === 'radial') {
        const dx = (px - (x + w / 2)) / (w / 2);
        const dy = (py - (y + h / 2)) / (h / 2);
        t = 1 - Math.min(1, Math.hypot(dx, dy));
      }
      const r = maxR * t;
      if (r <= 0.15) continue;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Fake-but-plausible barcode. */
export function barcode(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: string,
  color: string
) {
  const rng = new Rng(`bar:${seed}`);
  ctx.save();
  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const bw = rng.range(w * 0.004, w * 0.014);
    if (cx + bw > x + w) break;
    if (rng.bool(0.62)) ctx.fillRect(cx, y, bw, h);
    cx += bw + rng.range(w * 0.003, w * 0.011);
  }
  ctx.restore();
}

/** Passport machine-readable-zone line. */
export function mrzLine(text: string, len: number): string {
  const clean = text
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, '<')
    .slice(0, len);
  return clean.padEnd(len, '<');
}

export function dashedLine(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  dash: number[]
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Ticket-stub perforation holes punched out of the card edge. */
export function perforate(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  gap: number,
  bg: string
) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.floor(len / gap);
  ctx.save();
  ctx.fillStyle = bg;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ctx.beginPath();
    ctx.arc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Film-grain / risograph noise, kept cheap by tiling one small tile. */
let grainTile: HTMLCanvasElement | null = null;
export function grain(ctx: Ctx, x: number, y: number, w: number, h: number, alpha = 0.06) {
  if (typeof document === 'undefined') return;
  if (!grainTile) {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    if (!g) return;
    const id = g.createImageData(size, size);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    grainTile = c;
  }
  const pattern = ctx.createPattern(grainTile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Duotone: remaps the photo's luminance onto two brand colours so wildly
 * different phone photos all land on-brand.
 *
 * Desaturate → multiply the highlight in (whites take the highlight colour)
 * → screen the shadow in (blacks lift to the shadow colour). Blending at
 * `strength` below 1 leaves some of the original photo showing through.
 */
export function duotone(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  shadow: string,
  highlight: string,
  strength = 1
) {
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#808080';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = highlight;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = shadow;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Keeps light photos readable under cream text. */
export function scrim(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  from = 0,
  to = 0.85,
  dir: 'down' | 'up' = 'down'
) {
  const g = ctx.createLinearGradient(x, dir === 'down' ? y : y + h, x, dir === 'down' ? y + h : y);
  g.addColorStop(0, withAlpha(color, from));
  g.addColorStop(1, withAlpha(color, to));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16
  );
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** A repeating marquee of text along a horizontal strip. */
export function ticker(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  w: number,
  spacing: number,
  offset = 0
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - 40, w, 80);
  ctx.clip();
  const unit = ctx.measureText(text).width + spacing * [...text].length;
  let cx = x - (offset % unit);
  while (cx < x + w) {
    tracked(ctx, text, cx, y, spacing, 'left');
    cx += unit + spacing * 4;
  }
  ctx.restore();
}
