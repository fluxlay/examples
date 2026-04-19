import * as THREE from "three";

export const ATLAS_COLS = 3;
export const ATLAS_ROWS = 2;
export const ATLAS_CELL_COUNT = ATLAS_COLS * ATLAS_ROWS;
const CELL = 128;

type Draw = (ctx: CanvasRenderingContext2D, size: number) => void;

function radial(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  stops: [number, string][],
) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [o, c] of stops) grad.addColorStop(o, c);
  ctx.fillStyle = grad;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// 1. Hard pinprick — crisp tiny core, most common
const hardPinprick: Draw = (ctx, s) => {
  const cx = s / 2;
  const cy = s / 2;
  radial(ctx, cx, cy, s * 0.06, [
    [0, "rgba(255,255,255,1)"],
    [0.5, "rgba(255,255,255,0.75)"],
    [1, "rgba(255,255,255,0)"],
  ]);
};

// 2. Crisp small dot — solid core with a smooth but tight falloff
const crispSmall: Draw = (ctx, s) => {
  const cx = s / 2;
  const cy = s / 2;
  radial(ctx, cx, cy, s * 0.16, [
    [0, "rgba(255,255,255,1)"],
    [0.55, "rgba(255,255,255,0.92)"],
    [0.82, "rgba(255,255,255,0.55)"],
    [0.96, "rgba(255,255,255,0.12)"],
    [1, "rgba(255,255,255,0)"],
  ]);
};

// 3. Dim pinprick — a slightly larger, dimmer variant of #1
const dimPinprick: Draw = (ctx, s) => {
  const cx = s / 2;
  const cy = s / 2;
  radial(ctx, cx, cy, s * 0.08, [
    [0, "rgba(255,255,255,0.7)"],
    [0.5, "rgba(255,255,255,0.4)"],
    [1, "rgba(255,255,255,0)"],
  ]);
};

// 4. Tiny cluster — 4–5 tiny dots grouped tightly, gives subtle texture variety
const tinyCluster: Draw = (ctx, s) => {
  const cx = s / 2;
  const cy = s / 2;
  ctx.fillStyle = "white";
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * s * 0.09;
    const dotR = 0.8 + Math.random() * 1.4;
    ctx.globalAlpha = 0.6 + Math.random() * 0.4;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
};

// 5. Crisp disc — medium circle, solid body with anti-aliased edge
const crispDisc: Draw = (ctx, s) => {
  const cx = s / 2;
  const cy = s / 2;
  radial(ctx, cx, cy, s * 0.3, [
    [0, "rgba(255,255,255,0.92)"],
    [0.72, "rgba(255,255,255,0.85)"],
    [0.9, "rgba(255,255,255,0.5)"],
    [0.98, "rgba(255,255,255,0.1)"],
    [1, "rgba(255,255,255,0)"],
  ]);
};

// 6. Organic blob — asymmetric rounded shape (overlapping offset circles)
const organicBlob: Draw = (ctx, s) => {
  const cx = s / 2;
  const cy = s / 2;
  const baseR = s * 0.19;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const off = s * 0.04 + Math.random() * s * 0.04;
    const jx = Math.cos(a) * off;
    const jy = Math.sin(a) * off;
    const r = baseR * (0.8 + Math.random() * 0.4);
    radial(ctx, cx + jx, cy + jy, r, [
      [0, "rgba(255,255,255,0.78)"],
      [0.6, "rgba(255,255,255,0.6)"],
      [0.92, "rgba(255,255,255,0.15)"],
      [1, "rgba(255,255,255,0)"],
    ]);
  }
};

const SPRITES: Draw[] = [
  hardPinprick,
  crispSmall,
  dimPinprick,
  tinyCluster,
  crispDisc,
  organicBlob,
];

let cached: THREE.CanvasTexture | null = null;

export function getSpriteAtlas(): THREE.CanvasTexture {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * CELL;
  canvas.height = ATLAS_ROWS * CELL;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  for (let i = 0; i < SPRITES.length; i++) {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    ctx.save();
    ctx.translate(col * CELL, row * CELL);
    ctx.globalAlpha = 1;
    SPRITES[i](ctx, CELL);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
