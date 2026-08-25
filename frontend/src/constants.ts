import type { SankeyLinkData, SankeyNodeData } from './types';
import { isLightChartGround, subscribeThemeChange } from './canvas/canvasUtils';

export const PAGE = {
  PROJECT_DASHBOARD: 'project-dashboard',
  CHART_GALLERY: 'chart-gallery',
  INTERACTIVE_DEMO: 'interactive-demo',
} as const;

export const CHART_TYPE = {
  LINE: 'line',
  AREA: 'area',
  BAR: 'bar',
  PIE: 'pie',
  DONUT: 'donut',
  SANKEY: 'sankey',
  FLOW: 'flow',
  TREND: 'trend',
  MINI_BARS: 'mini-bars',
  STACKED_HORIZONTAL_BAR: 'stacked-horizontal-bar-chart',
  MULTI_METRIC_CONSTELLATION: 'multi-metric-constellation-chart',
  PROGRESS_RACE: 'progress-race-chart',
  HUB_AND_SPOKE_RADIAL: 'hub-and-spoke-radial-chart',
  DOT_MATRIX: 'dot-matrix-chart',
  RANKED_CARD_LEADERBOARD: 'ranked-card-leaderboard',
  PROPORTIONAL_BAND: 'proportional-band-chart',
  RADIAL_FAN_TREE: 'radial-fan-tree-chart',
  SEMI_CIRCULAR_GAUGE: 'semi-circular-gauge-chart',
  SEGMENTED_SPLIT_BAR: 'segmented-split-bar-chart',
  BALANCE_SCALE: 'balance-scale-chart',
  AREA_LINE: 'area-line-chart',
  TREND_VIEW: 'trend-view',
  WEEKLY_FLOW: 'weekly-flow',
  HORIZONTAL_BAR: 'horizontal-bar-chart',
} as const;

// export const palette = ['#6bbcff', '#5fe6dd', '#d7bc6d', '#95a9ff', '#7fb58a', '#ee8a8a'];

/**
 * MiniBars' fallback palette.
 *
 * Unlike the canvas charts, these bars are DOM <rect> fills, so they never went
 * through the theme-aware token layer in canvas/canvasUtils — the array was
 * read straight off this module and was therefore identical in both themes.
 *
 * Three of the seven do not survive a white ground: the orange, the
 * yellow-green and the amber measure 2.54:1, 2.26:1 and 1.73:1 against the 3:1
 * an essential mark needs. Those three are darkened within their own hue (hue
 * and saturation held, lightness reduced) until they clear 3.4:1. The other
 * four already pass and are left byte-identical, so the palette stays
 * recognisable rather than being re-picked.
 */
export const paletteDark = ['#4C93D9', '#5DA537', '#F3862C', '#4F72C6', '#A0B724', '#EEBF3B', '#3C45D1'];

export const paletteLight = ['#4C93D9', '#5DA537', '#DD6B0D', '#4F72C6', '#81941D', '#AF850F', '#3C45D1'];

/**
 * A live binding rather than a snapshot, for the same reason as the canvas
 * palettes — see the note in canvas/canvasUtils. Consumers keep importing
 * `palette` unchanged and get whichever theme applies.
 */
export let palette: readonly string[] = paletteDark;

/**
 * Self-registers with canvasUtils' theme notification rather than being driven
 * from there, which keeps the dependency one-directional: canvasUtils imports
 * nothing, so constants -> canvasUtils cannot cycle.
 *
 * The observer fires synchronously on the attribute mutation, ahead of React
 * flushing the host's own theme state, so a MiniBars re-render always reads the
 * palette for the theme it is about to paint.
 */
function refreshPalette(): void {
  palette = isLightChartGround() ? paletteLight : paletteDark;
}

refreshPalette();
subscribeThemeChange(refreshPalette);

export const flowGraph: {
  nodes: SankeyNodeData[];
  links: SankeyLinkData[];
} = {
  nodes: [
    { id: 'supplier-x', name: 'Supplier X', valueLabel: 'Si +0.12%' },
    { id: 'bf3-superheat', name: 'BF-3 Superheat', valueLabel: '22°C (target 34)' },
    { id: 'ccm3-solidification', name: 'CCM-3 Solidification', valueLabel: 'Rate deviation' },
    { id: 'grade-risk', name: 'Grade Risk', valueLabel: 'Automotive 74%' }
  ],
  links: [
    { source: 'supplier-x', target: 'bf3-superheat', value: 92 },
    { source: 'bf3-superheat', target: 'ccm3-solidification', value: 87 },
    { source: 'ccm3-solidification', target: 'grade-risk', value: 74 }
  ]
};
