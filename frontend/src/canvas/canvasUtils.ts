/**
 * Shared canvas drawing utilities and color helpers.
 * Ported from enterprise-brain/src/canvas/utils.js + theme/tokens.js
 */

// --- Color tokens ---

export const CC = {
  bg:       '#0C0E12',
  bgL:      '#0C1420',
  sf:       '#13161B',
  bd:       '#22262F',
  blue:     '#4C93D9',
  cyan:     '#36BFFA',
  orange:   '#EC772A',
  red:      '#EC772A',
  green:    '#5DA537',
  purple:   '#818FF8',
  amber:    '#EEBF3B',
  teal:     '#69DFE9',
  tealDark: '#00818F',
  barBg:    '#7DB9DF',
  t1:       '#F7F9FA',
  t2:       '#B3B5B6',
  t3:       '#94979C',
  t4:       '#334155',
} as const;

/** Gradient color pairs — [from, to] — from the design-system palette */
export const GRAD = {
  teal:    ['#00818F', '#69DFE9'],
  violet:  ['#5B3CB1', '#C8B6F3'],
  mint:    ['#27837A', '#81E8CE'],
  magenta: ['#8732A7', '#E7A1F0'],
  sky:     ['#0068BE', '#8EC2F6'],
  blue:    ['#084CF0', '#8BA9FF'],
  purple:  ['#5C42B8', '#9DA5FD'],
  royal:   ['#2556C8', '#A9B1F8'],
  success: ['#58B21C', '#97F558'],
  warning: ['#FFD974', '#E4AA0D'],
  error:   ['#EC8C42', '#E46A0D'],
} as const;

/** Solid endpoint colors — from the design-system palette */
export const SOLID = {
  teal:    '#69DFE9',
  violet:  '#C8B6F3',
  mint:    '#81E8CE',
  magenta: '#E7A1F0',
  sky:     '#0068BE',
  blue:    '#084CF0',
  purple:  '#5C42B8',
  royal:   '#2556C8',
  success: '#58B21C',
  warning: '#E4AA0D',
  error:   '#E46A0D',
} as const;

export const PALETTE = [CC.blue, CC.amber, CC.purple, CC.green, CC.red];

/** Gradient pairs for per-item bar gradients — [dark start, bright end] */
export const GRAD_PALETTE = [
  GRAD.teal,    // #00818F → #69DFE9
  GRAD.violet,  // #5B3CB1 → #C8B6F3
  GRAD.mint,    // #27837A → #81E8CE
  GRAD.magenta, // #8732A7 → #E7A1F0
  GRAD.sky,     // #0068BE → #8EC2F6
  GRAD.blue,    // #084CF0 → #8BA9FF
  GRAD.royal,   // #2556C8 → #A9B1F8
  GRAD.purple,  // #5C42B8 → #9DA5FD
] as const;

/** Per-chart offset palette — 8-step sequence cycling through the design-system palette */
export const CHART_PALETTE = [
  SOLID.teal,    // #69DFE9
  SOLID.violet,  // #C8B6F3
  SOLID.mint,    // #81E8CE
  SOLID.magenta, // #E7A1F0
  SOLID.sky,     // #0068BE
  SOLID.blue,    // #084CF0
  SOLID.royal,   // #2556C8
  SOLID.purple,  // #5C42B8
] as const;


// --- Typography tokens ---

/**
 * Axis label style — applied to all x-axis and y-axis tick labels, titles, and legends.
 * Change once here to update every chart.
 *   font-family:     Satoshi Variable, DM Sans (sans-serif fallback)
 *   font-weight:     400 (Regular)
 *   font-size:       14px
 *   line-height:     100%  (informational — not applicable in canvas ctx.font)
 *   letter-spacing:  0%    (set ctx.letterSpacing = AXIS_LABEL.letterSpacing at the draw site)
 *   text-align:      Right for y-axis ticks; Center for x-axis ticks (set at each draw site)
 */
export const AXIS_LABEL = {
  font:          "400 16px 'Satoshi Variable', 'DM Sans', sans-serif",
  color:         '#F7F7F7',
  letterSpacing: '0px',
} as const;


export const CHART_VALUE = {
  font:          "500 16px 'Satoshi Variable', 'DM Sans', sans-serif",
  color:         '#F7F7F7',
} as const;

/**
 * Legend label style — applied to all chart legend items (swatches, keys, footers).
 * Change once here to update every chart legend.
 *   font-family:     Satoshi Variable, DM Sans (sans-serif fallback)
 *   font-weight:     400 (Regular)
 *   font-size:       18px
 *   letter-spacing:  0%    (set ctx.letterSpacing = LEGEND_LABEL.letterSpacing at the draw site)
 *   text-align:      center (set ctx.textAlign = 'center' at the draw call site)
 */
export const LEGEND_LABEL = {
  font:          "400 18px 'Satoshi Variable', 'DM Sans', sans-serif",
  color:         '#B3B5B6',
  letterSpacing: '0px',
} as const;

// --- Color helpers ---

/** Convert hex + alpha to rgba string */
export function rgb(hex: string, alpha = 1): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Linear interpolation between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear interpolation between two hex colors */
export function lerpC(hex1: string, hex2: string, t: number): string {
  const parse = (h: string): [number, number, number] => {
    const clean = h.replace('#', '');
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [clamp(lerp(r1, r2, t)), clamp(lerp(g1, g2, t)), clamp(lerp(b1, b2, t))]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('').replace(/^/, '#');
}

// --- Canvas setup ---

/** Setup canvas with DPR scaling, returns context */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  dpr = 2,
): CanvasRenderingContext2D {
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(dpr, dpr);
  return ctx;
}

// --- Drawing primitives ---

/** Draw a radial gradient glow (cheaper than ctx.shadowBlur) */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.3,
): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, rgb(color, alpha));
  grad.addColorStop(1, rgb(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw ambient floating dust particles */
export function drawDust(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  T: number,
  count = 50,
  color = rgb(CC.blue, 0.05),
): void {
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(
      (Math.sin(T * 0.001 + i * 23) * 0.5 + 0.5) * w,
      (Math.cos(T * 0.0008 + i * 37) * 0.5 + 0.5) * h,
      0.6,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/** Draw subtle horizontal scanlines for cinematic feel */
export function drawScanline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  T: number,
  alpha = 0.015,
): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  const offset = (T * 0.5) % 6;
  for (let y = offset; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
}

/** Draw a vertical dashed crosshair line */
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
  color = rgb(CC.t1, 0.08),
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.setLineDash([]);
}
