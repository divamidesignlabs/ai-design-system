/**
 * Shared canvas drawing utilities and color helpers.
 * Ported from enterprise-brain/src/canvas/utils.js + theme/tokens.js
 */

// --- Theme-aware token resolution ---

/**
 * Charts paint to <canvas>, so no stylesheet can reach their pixels — a host
 * app cannot restyle chart labels, gridlines or surfaces the way it restyles
 * DOM. So the palette resolves from CSS custom properties instead, read at
 * *draw* time rather than at module load.
 *
 * Every chart in this package runs a perpetual requestAnimationFrame loop
 * (each `draw()` ends with an unconditional `requestAnimationFrame(draw)`),
 * so a theme flip is picked up on the very next frame. That means no repaint
 * plumbing and no changes at any of the ~380 call sites: `CC.t1` and
 * `AXIS_LABEL.color` stay plain property reads.
 *
 * Every variable falls back to the hex it previously hardcoded, so a host
 * that defines none of them renders byte-identically to before. Opting in
 * means defining the `--chart-*` variables per theme in the host app.
 */

/**
 * getComputedStyle is far too slow to call per frame — one frame reads these
 * dozens of times — so resolved values are memoised. The cache is flushed on a
 * requestAnimationFrame tick, which bounds staleness to a single frame no
 * matter *what* changed the custom properties.
 *
 * An earlier version keyed the cache on the `data-theme` attribute instead.
 * That was too clever: it only invalidated when that specific attribute
 * changed, so any host that swapped the variables by another route — a
 * different attribute, a class, a stylesheet swap, or re-applying variables
 * under an unchanged attribute — kept serving values from the previous theme
 * indefinitely. Flushing per frame costs one small object allocation and is
 * correct regardless of how the host drives theming.
 */
let tokenCache: Record<string, string> = {};
let flushQueued = false;

function queueCacheFlush(): void {
  if (flushQueued || typeof requestAnimationFrame === 'undefined') return;
  flushQueued = true;
  requestAnimationFrame(() => {
    tokenCache = {};
    flushQueued = false;
  });
}

/**
 * Canvas silently ignores an assignment of an unparseable colour to
 * fillStyle/strokeStyle, leaving whatever was set previously — which surfaces
 * as text painted in a stale, arbitrary colour rather than as a clean failure.
 * A host typo in a custom property would therefore be near-impossible to trace,
 * so anything that does not look like a colour is rejected in favour of the
 * fallback.
 */
/**
 * Theme-change notification.
 *
 * Most charts here run a perpetual rAF loop, so they re-read the palette every
 * frame and need nothing else. Trend is the exception: it deliberately stops its
 * loop once the entrance animation finishes and paints its labels only on that
 * final frame, so whatever colour was resolved at that instant is permanent.
 * On a theme flip its canvas keeps the previous theme's ink.
 *
 * Charts that stop drawing must therefore be told to redraw. The observer
 * watches data-theme, class and style on <html>, which between them cover every
 * common way a host swaps a theme — including inline custom properties written
 * straight onto the root element.
 */
let themeVersion = 0;
const themeListeners = new Set<() => void>();

if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  new MutationObserver(() => {
    tokenCache = {};
    refreshPalettes();
    themeVersion++;
    themeListeners.forEach((listener) => listener());
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class', 'style'],
  });
}

/** Subscribe to theme changes. Pair with getThemeVersion via useSyncExternalStore. */
export function subscribeThemeChange(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

/** Monotonic counter — changes whenever the resolved palette may have changed. */
export function getThemeVersion(): number {
  return themeVersion;
}

function looksLikeColor(v: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^(rgb|hsl)a?\(/.test(v) || /^[a-zA-Z]+$/.test(v);
}

function token(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback; // SSR / unit tests
  const hit = tokenCache[cssVar];
  if (hit !== undefined) return hit;
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  queueCacheFlush();
  const value = resolved && looksLikeColor(resolved) ? resolved : fallback;
  return (tokenCache[cssVar] = value);
}

// --- Color tokens ---

export const CC = {
  /** plot ground / slice separator */
  get bg()       { return token('--chart-bg',          '#0C0E12'); },
  get bgL()      { return token('--chart-bg-alt',      '#0C1420'); },
  /** raised surface — tooltip and panel backing */
  get sf()       { return token('--chart-surface',     '#13161B'); },
  /** gridlines, axes, hairline separators */
  get bd()       { return token('--chart-border',      '#22262F'); },
  get blue()     { return token('--chart-blue',        '#4C93D9'); },
  get cyan()     { return token('--chart-cyan',        '#36BFFA'); },
  get orange()   { return token('--chart-orange',      '#EC772A'); },
  get red()      { return token('--chart-red',         '#EC772A'); },
  get green()    { return token('--chart-green',       '#5DA537'); },
  get purple()   { return token('--chart-purple',      '#818FF8'); },
  get amber()    { return token('--chart-amber',       '#EEBF3B'); },
  get teal()     { return token('--chart-teal',        '#69DFE9'); },
  get tealDark() { return token('--chart-teal-dark',   '#00818F'); },
  get barBg()    { return token('--chart-bar-bg',      '#7DB9DF'); },
  /** Unfilled progress/gauge track, resolved (not a var() string) for canvas. */
  get trackFill(){ return token('--chart-track',        'rgba(255,255,255,0.07)'); },
  /** text ladder — t1 strongest, t4 is a dark slate for use on bright fills */
  get t1()       { return token('--chart-text-1',      '#F7F9FA'); },
  get t2()       { return token('--chart-text-2',      '#B3B5B6'); },
  get t3()       { return token('--chart-text-3',      '#94979C'); },
  get t4()       { return token('--chart-text-4',      '#334155'); },
};

/**
 * DOM-component surface tokens.
 *
 * Unlike CC (which feeds canvas paint), these back the package's React
 * components — KPI tiles, takeaways, empty states. They previously sat as
 * hardcoded literals inside inline `style` objects, leaving a consuming app no
 * way to reach them except by matching the emitted style string with
 * `[style*="…"]` attribute selectors — brittle, and silently broken by any
 * change to a literal.
 *
 * These deliberately resolve differently from CC. CC returns a *resolved*
 * colour because canvas needs a concrete value at paint time, and its charts
 * repaint every frame so they pick up a theme flip for free. DOM components
 * do not re-render on a theme flip, so a resolved value would go stale on the
 * element. Emitting a `var()` reference instead hands resolution to the
 * browser, which reapplies it the moment the custom property changes — no
 * re-render, no subscription, no cache.
 *
 * Each carries the exact literal it replaced as its fallback, so a host that
 * defines none of these renders byte-identically to before.
 */
export const UI = {
  /** KPI tile — translucent glass lift over the page field */
  tileBg:      'var(--kpi-tile-bg, rgba(255,255,255,0.05))',
  tileBorder:  'var(--kpi-tile-border, rgba(255,255,255,0.20))',
  /** source drop geometry 3.42/3.42/3.42 — hosts retint, keeping the offsets */
  tileShadow:  'var(--kpi-tile-shadow, 3.42px 3.42px 3.42px 0px rgba(0,0,0,0.30))',
  /** big metric number */
  value:       'var(--kpi-value, #F7F7F7)',
  valueStrong: 'var(--kpi-value-strong, #FFFFFF)',
  /** tile label under the metric, and its smaller sub-label */
  label:       'var(--kpi-label, rgba(255,255,255,0.70))',
  labelFaint:  'var(--kpi-label-faint, rgba(255,255,255,0.45))',
  /** takeaway body copy */
  takeaway:    'var(--kpi-takeaway, #C2C2C2)',
  /** unfilled progress / gauge track */
  track:       'var(--chart-track, rgba(255,255,255,0.07))',
  /** 1px vertical split between paired stats */
  divider:     'var(--chart-divider, rgba(255,255,255,0.12))',
  /** 2px horizontal rule under a stat row */
  rule:        'var(--chart-rule, rgba(255,255,255,0.08))',
  /** no-data state */
  emptyBg:     'var(--chart-empty-bg, rgba(255,255,255,0.03))',
  emptyText:   'var(--chart-empty-text, rgba(255,255,255,0.35))',
  /**
   * The canvas text ladder and series colours, as var() references for DOM use.
   *
   * DOM components must never read the CC getters: those resolve to a concrete
   * string, and a component that captures one in a module-scope constant does
   * so at import time — before the host has applied its theme — freezing the
   * dark fallback permanently in every theme. A var() reference has no such
   * failure mode, because the browser re-resolves it on every repaint.
   */
  text1:       'var(--chart-text-1, #F7F9FA)',
  text2:       'var(--chart-text-2, #B3B5B6)',
  text3:       'var(--chart-text-3, #94979C)',
  text4:       'var(--chart-text-4, #334155)',
  red:         'var(--chart-red, #EC772A)',
  amber:       'var(--chart-amber, #EEBF3B)',
  green:       'var(--chart-green, #5DA537)',
  blue:        'var(--chart-blue, #4C93D9)',
  purple:      'var(--chart-purple, #818FF8)',
  surface:     'var(--chart-surface, #13161B)',
  border:      'var(--chart-border, #22262F)',
  /** alias kept for readability at label call sites */
  labelStrong: 'var(--chart-text-2, #B3B5B6)',
  accent:      'var(--chart-teal, #69DFE9)',
  /** axis-label role, for the DOM axis titles that sit outside the canvas */
  axisLabel:   'var(--chart-axis-label, #F7F7F7)',
} as const;

/**
 * Series palettes, per theme.
 *
 * The eleven-hue order — teal, violet, mint, magenta, sky, blue, purple,
 * royal, success, warning, error — is the source series order and is an
 * invariant: a series keeps its slot across every chart and both themes, so a
 * reader who learns "slot 2 is mint" is never contradicted.
 *
 * What is NOT invariant is the value. These hues were chosen against a
 * near-black plot ground, and six of the eleven collapse on a white one:
 *
 *     teal    #69DFE9  1.53:1      success #58B21C  2.62:1
 *     violet  #C8B6F3  1.79:1      warning #E4AA0D  2.03:1
 *     mint    #81E8CE  1.42:1
 *     magenta #E7A1F0  1.90:1
 *
 * against the 3:1 an essential mark needs. So each hue has an audited light
 * stop as well. Five come from the ARKA light package's dataViz palette
 * verbatim (blue, teal, purple, warning, error — note `error` stays ORANGE,
 * which is deliberate in that design system: red is reserved for destructive
 * actions). The other six are derived mechanically — hue and saturation held,
 * lightness reduced until the value clears 3.4:1 on pure white — rather than
 * re-picked by eye, so each stays recognisably the same hue.
 *
 * Every light value clears 3:1 on all three grounds a mark can land on: the
 * plot ground (#FAFCFF), pure white, and a KPI tile (#F6FAFF). Worst case is
 * 3.25:1.
 */
const SOLID_DARK = {
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

const SOLID_LIGHT = {
  teal:    '#316e74', // package
  violet:  '#9977E9', // derived
  mint:    '#1D9D7D', // derived
  magenta: '#D354E4', // derived
  sky:     '#0068BE', // already clears on white
  blue:    '#2D70F7', // package
  purple:  '#654EC0', // package
  royal:   '#2556C8', // already clears on white
  success: '#4E9D19', // derived
  warning: '#8A6A00', // package
  error:   '#B65B1A', // package — orange, not red
} as const;

const GRAD_DARK = {
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

/**
 * Light gradients keep the source ramp's DIRECTION and widen its spread.
 *
 * Every bar runs its gradient left to right with luminance INCREASING: dark
 * theme goes deep -> bright, so light theme goes dark stop -> light tint. Same
 * direction, and the bar's tip fades out in both.
 *
 * The mistake worth recording is what happened between: the first version of
 * this block used pairs that were correct in direction but far too narrow
 * (teal ran #356E75 -> #458C92, both dark). Charts apply these with alpha on
 * top — ProgressRace at 0.75 -> 0.95 — so over a light ground the two ends
 * landed within about one contrast step and the bar read as a flat block. I
 * then "fixed" it by inverting the direction, which made the ramp visible but
 * ran it light -> dark, i.e. backwards. Reasoning about contrast rather than
 * luminance is what caused that: on a light ground the STRONG end is the dark
 * one, but strong is not where this design puts the start.
 *
 * So: direction as the source has it, spread wide enough to read. The dark
 * start carries the mark (every one clears 3.4:1) and the light tip is the
 * fade, exactly as the bright tip is on the dark theme.
 */
const GRAD_LIGHT = {
  teal:    ['#316e74', '#7bb9bd'],
  violet:  ['#9977E9', '#C6B2F3'],
  mint:    ['#1D9D7D', '#27D4A9'],
  magenta: ['#D354E4', '#E8A5F1'],
  sky:     ['#0068BE', '#7AC3FF'],
  blue:    ['#2D70F7', '#9EBDFB'],
  purple:  ['#654EC0', '#C0B6E5'],
  royal:   ['#2556C8', '#A6BCEF'],
  success: ['#4E9D19', '#69D422'],
  warning: ['#8A6A00', '#EBB400'],
  error:   ['#B65B1A', '#EDAF83'],
} as const;

/**
 * Which palette applies is derived from the resolved plot ground rather than
 * from a theme name or a new custom property, so a host that already defines
 * `--chart-bg` gets the right series with no extra wiring — and a host that
 * defines nothing keeps the dark values, because the fallback ground is dark.
 *
 * Relative luminance above 0.5 means the marks are sitting on a light surface.
 */
export function isLightChartGround(): boolean {
  const ground = token('--chart-bg', '#0C0E12');
  const m = /^#([0-9a-fA-F]{6})$/.exec(ground);
  if (!m) return false;
  const int = parseInt(m[1], 16);
  const chan = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2] > 0.5;
}

type SeriesKey = keyof typeof SOLID_DARK;

const series = (k: SeriesKey): string => (isLightChartGround() ? SOLID_LIGHT[k] : SOLID_DARK[k]);
const gradient = (k: SeriesKey): readonly [string, string] =>
  (isLightChartGround() ? GRAD_LIGHT[k] : GRAD_DARK[k]) as readonly [string, string];

/**
 * Solid endpoint colors, resolved per theme at read time. Written as explicit
 * getters rather than generated, to match the `CC` block above and so a reader
 * can see every series without following a construction.
 */
export const SOLID = {
  get teal()    { return series('teal'); },
  get violet()    { return series('violet'); },
  get mint()    { return series('mint'); },
  get magenta()    { return series('magenta'); },
  get sky()    { return series('sky'); },
  get blue()    { return series('blue'); },
  get purple()    { return series('purple'); },
  get royal()    { return series('royal'); },
  get success()    { return series('success'); },
  get warning()    { return series('warning'); },
  get error()    { return series('error'); },
} as const;

/** Gradient color pairs — [from, to] — resolved per theme at read time. */
export const GRAD = {
  get teal()    { return gradient('teal'); },
  get violet()    { return gradient('violet'); },
  get mint()    { return gradient('mint'); },
  get magenta()    { return gradient('magenta'); },
  get sky()    { return gradient('sky'); },
  get blue()    { return gradient('blue'); },
  get purple()    { return gradient('purple'); },
  get royal()    { return gradient('royal'); },
  get success()    { return gradient('success'); },
  get warning()    { return gradient('warning'); },
  get error()    { return gradient('error'); },
} as const;

/**
 * The exported palettes have to stay ARRAYS — they are part of the published
 * API and are consumed as `PALETTE[i % PALETTE.length]` at ~30 call sites —
 * but their contents must follow the theme rather than being captured once at
 * module load. (That capture was a real bug before this change: `PALETTE` was
 * built from the theme-aware `CC` getters yet froze whatever the theme happened
 * to be at import time, so it never followed a theme flip.)
 *
 * `export let` plus recomputation is the whole mechanism. ESM exports are live
 * bindings, so a consumer's `import { PALETTE }` sees each new array with no
 * call site changing and no exotic indirection.
 *
 * An earlier attempt wrapped these in a Proxy that rebuilt the backing array
 * per property access. It looked tidier and was wrong: the `get` trap returned
 * array methods unbound, so `Symbol.iterator` ran against the empty target and
 * `[...PALETTE]` silently produced `[]` instead of throwing. A spread that
 * quietly yields nothing is precisely the kind of failure that is impossible to
 * trace from a blank chart, so the clever version is gone.
 *
 * Recomputed from the MutationObserver above, which watches data-theme, class
 * and style on <html> — between them every route a host realistically uses to
 * swap a theme, including inline custom properties written onto the root.
 *
 * Deliberately NOT recomputed from the per-frame token-cache flush, even though
 * that would be marginally more thorough. Rebuilding reads tokens, reading a
 * token queues a flush, and a flush that rebuilds would queue the next one —
 * a self-perpetuating requestAnimationFrame loop that never idles. I wrote that
 * version first and it hung a Node harness outright, which is a kinder way to
 * find it than a host discovering a permanent background repaint.
 *
 * `refreshPalettes()` is exported so a host driving theming by some route the
 * observer cannot see has an explicit hook.
 */
const buildPalette = () => [CC.blue, CC.amber, CC.purple, CC.green, CC.red] as const;

const buildGradPalette = () =>
  [GRAD.teal, GRAD.violet, GRAD.mint, GRAD.magenta, GRAD.sky, GRAD.blue, GRAD.royal, GRAD.purple] as const;

const buildChartPalette = () =>
  [SOLID.teal, SOLID.violet, SOLID.mint, SOLID.magenta, SOLID.sky, SOLID.blue, SOLID.royal, SOLID.purple] as const;

export let PALETTE: readonly string[] = buildPalette();

/** Gradient pairs for per-item bar gradients — [deep start, lighter end] */
export let GRAD_PALETTE: readonly (readonly [string, string])[] = buildGradPalette();

/** Per-chart offset palette — 8-step sequence cycling through the series order */
export let CHART_PALETTE: readonly string[] = buildChartPalette();

/** Rebuild the exported arrays from the currently resolved theme. */
export function refreshPalettes(): void {
  PALETTE = buildPalette();
  GRAD_PALETTE = buildGradPalette();
  CHART_PALETTE = buildChartPalette();
}


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
  get color()    { return token('--chart-axis-label', '#F7F7F7'); },
  letterSpacing: '0px',
};


export const CHART_VALUE = {
  font:          "500 16px 'Satoshi Variable', 'DM Sans', sans-serif",
  get color()    { return token('--chart-value', '#F7F7F7'); },
};


/**
 * Hover ink — the colour a row's own name and value take while hovered, plus
 * the accent its tooltip picks up with them.
 *
 * Each series is a gradient PAIR, and hover takes the end of that pair which
 * reads as "more" against the ground it sits on:
 *
 *     dark ground  -> pair[1], the bright stop
 *     light ground -> pair[0], the dark stop   (#316e74 for teal)
 *
 * Straight out of the palette, no mixing — the hovered label is exactly the
 * colour the bar's own dark end is, which is what ties the two together.
 *
 * ProgressRaceChart previously took pair[1] on both grounds, so on light it
 * painted the label the pale tip (#7bb9bd) instead of the dark stop.
 */
export function hoverInkFor(pair: readonly [string, string]): string {
  return isLightChartGround() ? pair[0] : pair[1];
}

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
  get color()    { return token('--chart-legend-label', '#B3B5B6'); },
  letterSpacing: '0px',
};

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


let reducedMotionQuery: MediaQueryList | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  reducedMotionQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return reducedMotionQuery.matches;
}

/**
 * Whether the perpetual background effects should paint at all.
 * `isLightChartGround` reads through the per-frame token cache, so this is
 * cheap enough to call once per draw.
 */
export function ambientMotionEnabled(): boolean {
  return !isLightChartGround() && !prefersReducedMotion();
}

/** Draw ambient floating dust particles. No-op on a light ground — see above. */
export function drawDust(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  T: number,
  count = 50,
  color = rgb(CC.blue, 0.05),
): void {
  if (!ambientMotionEnabled()) return;
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

/**
 * Draw subtle horizontal scanlines for cinematic feel.
 * No-op on a light ground and under reduced motion — see drawDust above.
 */
export function drawScanline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  T: number,
  alpha = 0.015,
): void {
  if (!ambientMotionEnabled()) return;
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
