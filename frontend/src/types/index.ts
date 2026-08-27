import type { ReactNode } from 'react';

import { CHART_TYPE } from '../constants';
import type { NumberSystem } from '../constants';

export type VisualizationFrameProps = {
  className?: string;
};

export type VizRow = {
  id?: string;
  vendor: string;
  pricing?: number;
};

export type PointPair = [string, string | number];

export type MiniBarRow = [string, number, string];

export type SankeyNodeData = {
  id: string;
  name: string;
  valueLabel?: string;
};

export type SankeyLinkData = {
  source: string;
  target: string;
  value: number;
};

export type SeriesChartColors = {
  axisLine?: string;
  line?: string;
  areaFill?: string;
  point?: string;
};

export type BarChartColors = {
  axisLine?: string;
  bars?: string[];
  valueLabel?: string;
};

export type PieChartColors = {
  slices?: string[];
};

export type TrendChartColors = {
  axisLine?: string;
  line?: string;
  point?: string;
};

export type SankeyChartColors = {
  links?: string;
  activeLinks?: string;
  nodes?: string[];
  activeNodes?: string;
};

export type BarChartProps = {
  rows?: VizRow[];
  colors?: BarChartColors;
} & VisualizationFrameProps;

export type LineChartProps = {
  rows?: VizRow[];
  colors?: SeriesChartColors;
} & VisualizationFrameProps;

export type AreaChartProps = {
  rows?: VizRow[];
  colors?: SeriesChartColors;
} & VisualizationFrameProps;

export type PieChartProps = {
  rows?: VizRow[];
  variant: 'pie' | 'donut';
  colors?: PieChartColors;
} & VisualizationFrameProps;

export type DonutChartProps = {
  rows?: VizRow[];
  colors?: PieChartColors;
} & VisualizationFrameProps;

export type MiniBarsProps = {
  rows?: MiniBarRow[];
  colors?: PieChartColors;
} & VisualizationFrameProps;

export type ProcessSankeyProps = {
  selectedEntity?: string | null;
  colors?: SankeyChartColors;
} & VisualizationFrameProps;

export type RankingSankeyProps = {
  rows?: VizRow[];
  colors?: SankeyChartColors;
} & VisualizationFrameProps;

export type SankeySvgProps = {
  nodes: SankeyNodeData[];
  links: SankeyLinkData[];
  width?: number;
  height?: number;
  ariaLabel: string;
  selectedEntity?: string | null;
  colors?: SankeyChartColors;
} & VisualizationFrameProps;

export type SeriesChartProps = {
  rows?: VizRow[];
  variant: 'line' | 'area';
  colors?: SeriesChartColors;
} & VisualizationFrameProps;

export type TrendChartProps = {
  points?: PointPair[];
  colors?: TrendChartColors;
} & VisualizationFrameProps;

export type ChartFrameProps = {
  children: ReactNode;
  className?: string;
};

export type BaseVisualizationConfig =
  | {
      type: typeof CHART_TYPE.LINE | typeof CHART_TYPE.AREA | typeof CHART_TYPE.BAR | typeof CHART_TYPE.PIE | typeof CHART_TYPE.DONUT | typeof CHART_TYPE.SANKEY;
      rows: VizRow[];
    }
  | {
      type: typeof CHART_TYPE.FLOW;
      selectedEntity?: string | null;
    }
  | {
      type: typeof CHART_TYPE.TREND;
      points: PointPair[];
    }
  | {
      type: typeof CHART_TYPE.MINI_BARS;
      rows: MiniBarRow[];
    }
  | { type: typeof CHART_TYPE.STACKED_HORIZONTAL_BAR; data: ContractData; items?: never; dataByEntity?: Record<string, ContractData> }
  | { type: typeof CHART_TYPE.STACKED_HORIZONTAL_BAR; items: ContractorRow[]; data?: never; dataByEntity?: Record<string, ContractData> }
  | { type: typeof CHART_TYPE.MULTI_METRIC_CONSTELLATION; items: ContractorRow[] }
  | { type: typeof CHART_TYPE.PROGRESS_RACE; items: ContractorRow[]; itemsByEntity?: Record<string, ContractorRow[]>; numberSystem?: NumberSystem | null }
  | { type: typeof CHART_TYPE.HUB_AND_SPOKE_RADIAL; segments: EWStatusRow[]; title?: string; unitLabel?: string }
  | { type: typeof CHART_TYPE.DOT_MATRIX; items: EWCategoryRow[]; title?: string }
  | { type: typeof CHART_TYPE.RANKED_CARD_LEADERBOARD; items: EWOpenContractorRow[]; title?: string; numberSystem?: NumberSystem | null }
  | { type: typeof CHART_TYPE.PROPORTIONAL_BAND; severities: EWSeverityRow[]; title?: string; numberSystem?: NumberSystem | null }
  | { type: typeof CHART_TYPE.RADIAL_FAN_TREE; total: number; totalLabel?: string; items: NCEContractorRow[]; dataByEntity?: Record<string, { total: number; totalLabel?: string; items: NCEContractorRow[] }>; numberSystem?: NumberSystem | null }
  | { type: typeof CHART_TYPE.SEMI_CIRCULAR_GAUGE; confirmed: number; total: number; label?: string; gaugeByEntity?: Record<string, { confirmed: number; total: number }>; subentity?: SubentityItem[]; numberSystem?: NumberSystem | null }
  | { type: typeof CHART_TYPE.SEGMENTED_SPLIT_BAR; items: VariationRow[]; labelA?: string; labelB?: string; unit?: string; itemsByEntity?: Record<string, VariationRow[]>; numberSystem?: NumberSystem | null }
  | { type: typeof CHART_TYPE.BALANCE_SCALE; left: QuotationSide; right: QuotationSide; leftTitle?: string; rightTitle?: string; unit?: string; dataByEntity?: Record<string, QuotationSummary>; numberSystem?: NumberSystem | null }
  | { type: typeof CHART_TYPE.AREA_LINE; points: QuotationTrendPoint[] }
  | { type: typeof CHART_TYPE.TREND_VIEW; points: QuotationTrendPoint[]; pointsByEntity?: Record<string, QuotationTrendPoint[]>; xLabel?: string | null; yLabel?: string | null; valuePrefix?: string | null; numberSystem?: NumberSystem | null; animationEnabled?: boolean }
  | { type: typeof CHART_TYPE.WEEKLY_FLOW; items: ContractorRow[]; numberSystem?: NumberSystem | null }
  | { type: typeof CHART_TYPE.HORIZONTAL_BAR; rows: HorizontalBarRow[]; valuePrefix?: string | null; numberSystem?: NumberSystem | null };

export type SubentityItem = Record<string, unknown>;

export type RadialFanSubentity = { total: number; totalLabel: string; items: SubentityItem[] };

export type SubentityPayload = SubentityItem[] | RadialFanSubentity;

export type VisualizationRendererProps = {
  config: BaseVisualizationConfig;
  className?: string;
  colorOffset?: number;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  selectedId?: string;
  listenerItems?: SubentityPayload;
};

export type VisualizationGroupProps = {
  items: BaseVisualizationConfig[];
  colorOffset?: number;
  title?: string;
  'data-testid'?: string;
};

// ─── Contract Management Dashboard Types ─────────────────────────────────────

export type ContractorRow = {
  id: string;
  name: string;
  abbreviation?: string;
  base?: number;
  variation?: number;
  total?: number;
  percentage?: number;
  baseLabel?: string;
  variationLabel?: string;
  totalLabel?: string;
  subentity?: SubentityPayload;
};

export type ContractData = {
  items: (ContractorRow | number | null)[];
  totals?: { base?: number; variation?: number; total?: number } | null;
};

export type EWStatusRow = { status: string; count: number };
export type EWCategoryRow = { category: string; fullName: string; count: number };
export type EWSeverityRow = { severity: string; count: number; subentity?: SubentityItem[] };
export type EWOpenContractorRow = { id: string; name: string; abbreviation?: string; count?: number; label?: string; subentity?: SubentityItem[] };

export type NCEContractorRow = { id: string; name: string; abbreviation?: string; count?: number; label?: string; subentity?: SubentityItem[] };
export type NCECompensationData = { total: number; confirmed: number; pctConfirmed: number };

export type VariationRow = {
  id: string;
  name: string;
  abbreviation?: string;
  implemented?: number;
  unimplemented?: number;
  subentity?: SubentityItem[];
};

export type QuotationSide = { value: number; count: number; label: string; subentity?: SubentityItem[] };
export type QuotationSummary = { left: QuotationSide; right: QuotationSide };
export type QuotationTrendPoint = { week: string; count: number; value?: number };

// ─── Key Highlights Types ────────────────────────────────────────────────────

export type KeyHighlightChip = { value: string; label: string; color?: string; icon?: string };
export type KeyHighlightBadge = { text: string; severity: 'red' | 'amber' | 'green' };
export type KeyHighlightDot = { val: number; color?: string; name: string };
export type FlagsListRow = { text: string; tag: string; date: string; severity: 'red' | 'amber' | 'green' };
export type ComparisonRow = { label: string; cells: string[]; color?: string };

export type ScorecardRow = {
  name: string;
  value: string;
  pct: number;        // 0–100, drives the inline bar width
  color?: string;
  badge?: string;
  badgeSeverity?: 'green' | 'amber' | 'red';
  sublabel?: string;
};

export type KeyHighlightBlock =
  | { type: 'stats';           items: Array<{ value: string; label: string; sublabel?: string; color?: string; icon?: string }>; takeaway?: string }
  | { type: 'chips';           items: KeyHighlightChip[]; takeaway?: string }
  | { type: 'ranked';          items: Array<{ name: string; value: string; kpiLabel?: string }>; takeaway?: string }
  | { type: 'proportion';      leftPct: number; leftLabel: string; leftValue: string; leftColor?: string; rightPct: number; rightLabel: string; rightValue: string; rightColor?: string; chips?: KeyHighlightChip[]; takeaway?: string }
  | { type: 'ring';            pct: number; label: string; color?: string; chips?: KeyHighlightChip[]; takeaway?: string }
  | { type: 'badges';          items: KeyHighlightBadge[]; textSize?: number; takeaway?: string }
  | { type: 'dot-strip';       min: number; max: number; unit: string; dots: KeyHighlightDot[]; chips?: KeyHighlightChip[]; takeaway?: string }
  | { type: 'scorecard-rows';  items: ScorecardRow[]; takeaway?: string }
  | { type: 'flags-list';      items: FlagsListRow[]; takeaway?: string }
  | { type: 'comparison-rows'; columns: string[]; rows: ComparisonRow[]; takeaway?: string };

// ─── Horizontal Bar Chart Types ──────────────────────────────────────────────

export type HorizontalBarRow = {
  id: string;
  name: string;
  value: number;
  valueLabel?: string;
  subentity?: SubentityItem[];
};

// ─── Dual-Segment Horizontal Bar Chart Types ─────────────────────────────────

export type DualSegmentBarRow = {
  id: string;
  name: string;
  primaryValue?: number;    // First segment value (optional — row is skipped if missing/invalid)
  secondaryValue?: number;  // Second segment value (optional)
};

// ─── Narrative Chain Types ──────────────────────────────────────────────────

export type NarrativeStep = {
  id: string;
  questionText: string;
  title: string;
  insight: string;
  vizConfigs: BaseVisualizationConfig[];
  followupIds: string[];
  keyInsights: string[];
  keyHighlights?: KeyHighlightBlock;
};
