import { AreaChart } from '../areaChart/AreaChart';
import { BarChart } from '../barChart/BarChart';
import { ProgressRaceChart } from '../progressRaceChart';
import { SemiCircularGaugeChart } from '../semiCircularGaugeChart';
import { MultiMetricConstellationChart } from '../multiMetricConstellationChart';
import { StackedHorizontalBarChart } from '../stackedHorizontalBarChart';
import { RankedCardLeaderboard } from '../rankedCardLeaderboard';
import { DotMatrixChart } from '../dotMatrixChart';
import { LineChart } from '../lineChart/LineChart';
import { MiniBars } from '../miniBars/MiniBars';
import { RadialFanTreeChart } from '../radialFanTreeChart';
import { PieChart } from '../pieChart/PieChart';
import { ProcessSankey, RankingSankey } from '../sankey';
import { BalanceScaleChart } from '../balanceScaleChart';
import { AreaLineChart } from '../areaLineChart';
import { Trend } from '../trend';
import { ProportionalBandChart } from '../proportionalBandChart';
import { HubAndSpokeRadialChart } from '../hubAndSpokeRadialChart';
import { TrendChart } from '../trendChart/TrendChart';
import { SegmentedSplitBarChart } from '../segmentedSplitBarChart';
import { WeeklyFlow } from '../weeklyFlow';
import { HorizontalBarChart } from '../horizontalBarChart';
import type { VisualizationRendererProps, ContractorRow, NCEContractorRow, VariationRow, HorizontalBarRow, EWOpenContractorRow, EWSeverityRow, QuotationTrendPoint, SubentityItem } from '../../types';
import { CHART_TYPE } from '../../constants';
import { formatNumber } from '../../utils/numberFormat';

export function VisualizationRenderer({ config, className, colorOffset = 0, onItemClick, selectedId, listenerItems }: VisualizationRendererProps) {
  // When acting as a listener, selectedId belongs to the broadcaster chart — don't pass it
  // down or charts will dim all their own items (none match the broadcaster's selected id).
  const effectiveSelectedId = listenerItems ? undefined : selectedId;
  if (config.type === CHART_TYPE.LINE) return <LineChart rows={config.rows} className={className} />;
  if (config.type === CHART_TYPE.AREA) return <AreaChart rows={config.rows} className={className} />;
  if (config.type === CHART_TYPE.BAR) return <BarChart rows={config.rows} className={className} />;
  if (config.type === CHART_TYPE.PIE) return <PieChart rows={config.rows} variant="pie" className={className} />;
  if (config.type === CHART_TYPE.DONUT) return <PieChart rows={config.rows} variant="donut" className={className} />;
  if (config.type === CHART_TYPE.SANKEY) return <RankingSankey rows={config.rows} className={className} />;
  if (config.type === CHART_TYPE.FLOW) return <ProcessSankey selectedEntity={config.selectedEntity} className={className} />;
  if (config.type === CHART_TYPE.TREND) return <TrendChart points={config.points} className={className} />;
  if (config.type === CHART_TYPE.MINI_BARS) return <MiniBars rows={config.rows} className={className} />;

  if (config.type === CHART_TYPE.STACKED_HORIZONTAL_BAR) {
    const base = config.data ?? { items: config.items ?? [] };
    const data = listenerItems ? { items: listenerItems as ContractorRow[] } : base;
    return <StackedHorizontalBarChart data={data} dataByEntity={config.dataByEntity} onItemClick={onItemClick} selectedId={effectiveSelectedId} />;
  }
  if (config.type === CHART_TYPE.MULTI_METRIC_CONSTELLATION) return <MultiMetricConstellationChart items={config.items} />;
  if (config.type === CHART_TYPE.PROGRESS_RACE) {
    const items = listenerItems ? listenerItems as ContractorRow[] : config.items;
    return <ProgressRaceChart items={items} itemsByEntity={config.itemsByEntity} colorOffset={colorOffset} onItemClick={onItemClick} selectedId={effectiveSelectedId} />;
  }
  if (config.type === CHART_TYPE.HUB_AND_SPOKE_RADIAL) return <HubAndSpokeRadialChart segments={config.segments} title={config.title} unitLabel={config.unitLabel} />;
  if (config.type === CHART_TYPE.DOT_MATRIX) return <DotMatrixChart items={config.items} />;
  if (config.type === CHART_TYPE.RANKED_CARD_LEADERBOARD) {
    const items = listenerItems ? listenerItems as EWOpenContractorRow[] : config.items;
    return <RankedCardLeaderboard items={items} onItemClick={onItemClick} />;
  }
  if (config.type === CHART_TYPE.PROPORTIONAL_BAND) {
    const severities = listenerItems ? listenerItems as EWSeverityRow[] : config.severities;
    return <ProportionalBandChart severities={severities} colorOffset={colorOffset} onItemClick={onItemClick} />;
  }
  if (config.type === CHART_TYPE.RADIAL_FAN_TREE) {
    const fanData = listenerItems && !Array.isArray(listenerItems) ? listenerItems : null;
    const items = fanData ? fanData.items as NCEContractorRow[] : (listenerItems ? listenerItems as NCEContractorRow[] : config.items);
    const total = fanData ? fanData.total : listenerItems ? (listenerItems as NCEContractorRow[]).reduce((s, it) => s + (it.count ?? 0), 0) : config.total;
    const totalLabel = fanData ? fanData.totalLabel : config.totalLabel;
    return <RadialFanTreeChart total={total} totalLabel={totalLabel} items={items} dataByEntity={config.dataByEntity} colorOffset={colorOffset} onItemClick={onItemClick} selectedId={effectiveSelectedId} />;
  }
  if (config.type === CHART_TYPE.SEMI_CIRCULAR_GAUGE) {
    const firstItem = Array.isArray(listenerItems) ? (listenerItems[0] as Record<string, unknown>) : undefined;
    const confirmed = firstItem ? Number(firstItem.confirmed ?? 0) : config.confirmed;
    const total     = firstItem ? Number(firstItem.total     ?? 1) : config.total;
    return <SemiCircularGaugeChart confirmed={confirmed} total={total} label={config.label} gaugeByEntity={config.gaugeByEntity} colorOffset={colorOffset} selectedId={effectiveSelectedId} onItemClick={onItemClick} subentity={config.subentity} />;
  }
  if (config.type === CHART_TYPE.SEGMENTED_SPLIT_BAR) {
    const items = listenerItems ? listenerItems as VariationRow[] : config.items;
    return <SegmentedSplitBarChart items={items} itemsByEntity={config.itemsByEntity} labelA={config.labelA} labelB={config.labelB} unit={config.unit} onItemClick={onItemClick} selectedId={effectiveSelectedId} />;
  }
  if (config.type === CHART_TYPE.BALANCE_SCALE) {
    let left = config.left;
    let right = config.right;
    if (listenerItems && !Array.isArray(listenerItems)) {
      const fan = listenerItems as { total: number; totalLabel: string; items: SubentityItem[] };
      if (fan.items?.length >= 2) {
        const lv = Number((fan.items[0] as Record<string, unknown>).count ?? 0);
        const rv = Number((fan.items[1] as Record<string, unknown>).count ?? 0);
        left  = { value: lv, count: 1, label: '£' + formatNumber(lv, 2) };
        right = { value: rv, count: 1, label: '£' + formatNumber(rv, 2) };
      }
    }
    return <BalanceScaleChart left={left} right={right} leftTitle={config.leftTitle} rightTitle={config.rightTitle} unit={config.unit} dataByEntity={config.dataByEntity} onItemClick={onItemClick} selectedId={effectiveSelectedId} />;
  }
  if (config.type === CHART_TYPE.AREA_LINE) return <AreaLineChart points={config.points} />;
  if (config.type === CHART_TYPE.TREND_VIEW) {
    const listenerPoints = listenerItems && !Array.isArray(listenerItems)
      ? (listenerItems as { points?: QuotationTrendPoint[] }).points ?? []
      : undefined;
    return <Trend points={listenerPoints ?? config.points} colorOffset={colorOffset} xLabel={config.xLabel} yLabel={config.yLabel} valuePrefix={config.valuePrefix} animationEnabled={config.animationEnabled} />;
  }
  if (config.type === CHART_TYPE.WEEKLY_FLOW) {
    const items = listenerItems ? listenerItems as ContractorRow[] : config.items;
    return <WeeklyFlow items={items} onItemClick={onItemClick} />;
  }
  if (config.type === CHART_TYPE.HORIZONTAL_BAR) {
    const rows = listenerItems ? listenerItems as HorizontalBarRow[] : config.rows;
    return <HorizontalBarChart rows={rows} valuePrefix={config.valuePrefix} onItemClick={onItemClick} />;
  }

  return <div className="viz-empty">Visualization unavailable</div>;
}
