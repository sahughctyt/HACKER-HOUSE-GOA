/**
 * Renderer for the back face of the Builder ID Card badge.
 * Renders high-res 1080 x 1350 canvas for the 3D card reverse side.
 */
import { C, EVENT } from '../brand';
import { CARD_H, CARD_W } from './cards';
import { barcode, fauxQr, roundRect, tracked } from './primitives';

export function renderCardBack(
  seed: string,
  name?: string,
  role?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const W = CARD_W;
  const H = CARD_H;

  // Background
  ctx.fillStyle = C.greenDeep;
  ctx.fillRect(0, 0, W, H);

  // Outer border & cream body
  const M = 34;
  ctx.fillStyle = C.cream;
  roundRect(ctx, M, M, W - M * 2, H - M * 2, 26);
  ctx.fill();

  // Magnetic stripe across the top back
  ctx.fillStyle = '#1e2022';
  ctx.fillRect(M, M + 80, W - M * 2, 140);

  // Metallic sheen lines inside magnetic stripe
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 4;
  for (let i = M + 95; i < M + 210; i += 20) {
    ctx.beginPath();
    ctx.moveTo(M, i);
    ctx.lineTo(W - M, i);
    ctx.stroke();
  }

  // Security Hologram Foil Block
  const holoW = 160;
  const holoH = 160;
  const holoX = W - M - holoW - 50;
  const holoY = M + 260;

  const holoGrad = ctx.createLinearGradient(holoX, holoY, holoX + holoW, holoY + holoH);
  holoGrad.addColorStop(0, '#ff77e9');
  holoGrad.addColorStop(0.25, '#77efff');
  holoGrad.addColorStop(0.5, '#ffee77');
  holoGrad.addColorStop(0.75, '#77ffaa');
  holoGrad.addColorStop(1, '#ff77e9');

  ctx.fillStyle = holoGrad;
  roundRect(ctx, holoX, holoY, holoW, holoH, 16);
  ctx.fill();

  // Hologram Emblem / Logo Stamp
  ctx.fillStyle = C.greenDeep;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HH', holoX + holoW / 2, holoY + holoH / 2 - 12);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('GOA 2026', holoX + holoW / 2, holoY + holoH / 2 + 24);

  // Security watermark pattern
  ctx.save();
  roundRect(ctx, M, M, W - M * 2, H - M * 2, 26);
  ctx.clip();

  ctx.strokeStyle = 'rgba(11, 104, 57, 0.08)';
  ctx.lineWidth = 2;
  for (let x = -W; x < W * 2; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, M);
    ctx.lineTo(x + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // Content Area
  ctx.fillStyle = C.greenDeep;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Header Title
  ctx.font = '900 48px sans-serif';
  tracked(ctx, 'HACKER HOUSE GOA', M + 60, M + 260, 2);

  ctx.fillStyle = C.pink;
  ctx.font = '700 28px sans-serif';
  tracked(ctx, 'OFFICIAL BUILDER CREDENTIAL', M + 60, M + 320, 3);

  // Tagline
  ctx.fillStyle = C.greenDeep;
  ctx.font = 'bold 36px serif';
  ctx.fillText('“' + EVENT.tagline.toUpperCase() + '”', M + 60, M + 380);

  // Decorative divider
  ctx.strokeStyle = C.greenDeep;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(M + 60, M + 450);
  ctx.lineTo(W - M - 60, M + 450);
  ctx.stroke();

  // Rules / Event Info Box
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = 'rgba(11, 104, 57, 0.85)';
  const lines = [
    '• This pass grants full access to Hacker House Goa 2026.',
    '• Event Dates: ' + EVENT.dates + ' · Goa, India.',
    '• Non-transferable credential issued to registered builder.',
    '• Keep pass visible at all times during hackathon sessions.',
  ];

  let lineY = M + 480;
  for (const l of lines) {
    ctx.fillText(l, M + 60, lineY);
    lineY += 40;
  }

  // QR Code + Barcode
  const qrSize = 180;
  const qrX = M + 60;
  const qrY = H - M - qrSize - 120;
  fauxQr(ctx, qrX, qrY, qrSize, seed, C.greenDeep, C.cream);

  // Barcode next to QR
  const bcX = qrX + qrSize + 40;
  const bcW = W - M - 60 - bcX;
  const bcH = 100;
  barcode(ctx, bcX, qrY + 10, bcW, bcH, seed, C.greenDeep);

  // Serial Number below barcode
  ctx.fillStyle = C.greenDeep;
  ctx.font = 'bold 24px monospace';
  ctx.fillText('ID: HHG2026-' + (seed.toUpperCase().slice(0, 10) || 'BUILDER'), bcX, qrY + bcH + 25);

  // Footer Tagline
  ctx.fillStyle = C.pink;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OCT 28–31 · 2026 · GOA · #FrameInGoa', W / 2, H - M - 60);

  return canvas;
}
