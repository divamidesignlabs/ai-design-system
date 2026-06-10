import { useRef, useState, useCallback } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitRect } from '../../canvas/useCanvasInteraction';
import type { TooltipContent } from '../../canvas/useCanvasInteraction';
import { easeOutQuart, stagger, tickHoverProgress } from '../../canvas/easing';
import { CC, AXIS_LABEL, CHART_VALUE, LEGEND_LABEL, rgb, drawGlow } from '../../canvas/canvasUtils';
import { useCanvasLoop } from '../../canvas/useCanvasLoop';
import { useContainerWidth } from '../../canvas/useContainerWidth';
import { ChartEmptyState } from '../common/ChartEmptyState';
import { ToggleButton } from '../common/ToggleButton';
import type { ContractorRow } from '../../types';
import type { StackedHorizontalBarChartProps } from './types';

const DEFAULT_W = 680;
const MIN_H    = 220;
const MAX_ITEMS = 8;
const COLORS   = [CC.teal];
const PAD      = { left: 8, right: 100, top: 16, bottom: 38 };
const NAME_W   = 150;
const BAR_H    = 6;

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

function fmtValue(v: number): string {
  const abs  = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}£${(abs / 1_000).toFixed(1)}K`;
  return `${sign}£${abs.toFixed(0)}`;
}

export function StackedHorizontalBarChart({ data, dataByEntity, onItemClick, selectedId, testID }: StackedHorizontalBarChartProps) {
  const [containerRef, W] = useContainerWidth(DEFAULT_W);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverMap  = useRef<Map<string, number>>(new Map());
  const selectedIdRef  = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const handleClick = useCallback((id: string, data: TooltipContent | string) => {
    const label = typeof data === 'object' ? (data.label ?? id) : id;
    const item = drawStateRef.current.visibleItems.find(c => c.id === id);
    onItemClick?.(id, label, item?.subentity);
  }, [onItemClick]);
  const [showAll, setShowAll] = useState(false);

  const isDrillMode   = !!(selectedId && dataByEntity?.[selectedId]);
  const activeData    = isDrillMode ? dataByEntity![selectedId!] : data;
  const { items: items = [], totals } = activeData;
  const validItems   = items.filter((c): c is ContractorRow => c != null && typeof c === 'object');
  const sortedItems  = [...validItems].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const visibleItems = showAll ? sortedItems : sortedItems.slice(0, MAX_ITEMS);
  const n             = visibleItems.length;
  const maxCommitment = Math.max(...sortedItems.map(c => Math.abs(c.total ?? 0)), 1);
  const BAR_GAP       = 38;
  const contentH      = n * BAR_H + Math.max(0, n - 1) * BAR_GAP;
  const dynamicH      = PAD.top + PAD.bottom + contentH;
  const barArea       = W - PAD.left - NAME_W - PAD.right;

  // Ref-based draw state so the stale useCanvasLoop closure reads current values every frame
  const drawStateRef = useRef({ visibleItems, maxCommitment, totals, barArea, BAR_GAP, n, dynamicH, isDrillMode });
  drawStateRef.current = { visibleItems, maxCommitment, totals, barArea, BAR_GAP, n, dynamicH, isDrillMode };

  const isEmpty = (data.items ?? []).filter((c): c is ContractorRow => c != null && typeof c === 'object').length === 0;

  const { hoveredRef, tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, { width: W, height: dynamicH, onClick: onItemClick ? handleClick : undefined });

  useCanvasLoop(
    canvasRef,
    W,
    dynamicH,
    (ctx, progress) => {
      const { visibleItems: vi, maxCommitment: mc, totals: tot, barArea: ba, BAR_GAP: bg, n: len, dynamicH: dH, isDrillMode: drill } = drawStateRef.current;
      tickHoverProgress(hoverMap.current, hoveredRef.current);
      hitZonesRef.current = [];

      vi.forEach((con, i) => {
        const color  = COLORS[i % COLORS.length];
        const localP = stagger(progress, i, len, easeOutQuart);
        const y      = PAD.top + i * (BAR_H + bg);
        const x0     = PAD.left + NAME_W;
        const hp     = hoverMap.current.get(con.id) ?? 0;
        const dimFactor = !drill && selectedIdRef.current && con.id !== selectedIdRef.current ? 0.2 : 1;
        const totalW = (Math.max(con.total ?? 0, 0) / mc) * ba * localP;

        // Contractor name  y-axis
        ctx.font         = AXIS_LABEL.font;
        ctx.fillStyle    = hp > 0 ? color : AXIS_LABEL.color;
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncate(ctx, con.name ?? '', NAME_W - 16), x0 - 8, y + BAR_H / 2);

        // Register hit on label area — same id as bar so hover effect + tooltip both trigger
        registerHitRect(hitZonesRef.current, con.id, 0, y, x0, BAR_H, {
          label   : con.name,
          value   : `${con.totalLabel ?? fmtValue(con.total ?? 0)} total`,
          sublabel: `Base ${con.baseLabel ?? fmtValue(con.base ?? 0)} + Var ${con.variationLabel ?? fmtValue(con.variation ?? 0)}`,
          color,
        });

        // Teal gradient bar (earned/obtained portion)
        if (totalW > 0) {
          if (hp > 0) drawGlow(ctx, x0 + totalW / 2, y + BAR_H / 2, totalW * 0.15, CC.teal, 0.12 * hp);
          const grad = ctx.createLinearGradient(x0, 0, x0 + totalW, 0);
          grad.addColorStop(0, rgb(CC.tealDark, 0.85 * dimFactor));
          grad.addColorStop(1, rgb(CC.teal, 1.0 * dimFactor));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.rect(x0, y, totalW, BAR_H);
          ctx.fill();
        }

        // Unobtained area — dark teal fills from end of filled bar to full track width
        const animTrackW = barArea * localP;
        const unfilledX  = x0 + totalW;
        const unfilledW  = animTrackW - totalW;
        if (unfilledW > 2) {
          ctx.fillStyle = rgb(CC.barBg, 0.2);
          ctx.beginPath();
          ctx.rect(unfilledX, y, unfilledW, BAR_H);
          ctx.fill();
        }

        // Separator + triangle ▲ at junction
        if (totalW > 4) {
          const triX = x0 + totalW;
          const tipY = y + BAR_H;

          // Vertical dark separator line spanning full bar height
          ctx.strokeStyle = rgb(CC.t4, 0.9 * localP);
          ctx.lineWidth   = 4;
          ctx.beginPath();
          ctx.moveTo(triX, y);
          ctx.lineTo(triX, tipY);
          ctx.stroke();

          // Rounded triangle — proper 3-vertex arcTo approach, 2px corner radius
          const tw = 10; const th = 12; const cr = 1;
          const ty = tipY + 3;
          const p1 = { x: triX,      y: ty };        // tip
          const p2 = { x: triX + tw, y: ty + th };   // bottom-right
          const p3 = { x: triX - tw, y: ty + th };   // bottom-left
          ctx.fillStyle = rgb(CC.t1, localP);
          ctx.beginPath();
          ctx.moveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
          ctx.arcTo(p2.x, p2.y, p3.x, p3.y, cr);
          ctx.arcTo(p3.x, p3.y, p1.x, p1.y, cr);
          ctx.arcTo(p1.x, p1.y, p2.x, p2.y, cr);
          ctx.closePath();
          ctx.fill();
        }

        // £ value label that appears after bar animates in
        if (localP > 0.35) {
          const fade = Math.min(1, (localP - 0.35) / 0.4);
          ctx.globalAlpha  = fade * dimFactor;
          ctx.font         = CHART_VALUE.font;
          ctx.fillStyle    = hp > 0 ? color : CHART_VALUE.color;
          ctx.textAlign    = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(con.totalLabel ?? fmtValue(con.total ?? 0), x0 + ba + 28, y + BAR_H / 2);
          ctx.globalAlpha = 1;
        }

        registerHitRect(hitZonesRef.current, con.id, x0, y, Math.max(totalW, 1), BAR_H, {
          label   : con.name,
          value   : con.totalLabel ?? fmtValue(con.total ?? 0),
          sublabel: `${con.baseLabel ?? fmtValue(con.base ?? 0)} + ${con.variationLabel ?? fmtValue(con.variation ?? 0)}`,
          color,
        });
      });

      // Legend row
      const ly = dH - 14;
      ctx.textBaseline = 'middle';
      ctx.font         = LEGEND_LABEL.font;
      ctx.textAlign    = 'left';

      // Base swatch
      const swatchGrad = ctx.createLinearGradient(PAD.left + NAME_W, 0, PAD.left + NAME_W + 14, 0);
      swatchGrad.addColorStop(0, rgb(CC.tealDark, 0.85));
      swatchGrad.addColorStop(1, rgb(CC.teal, 1.0));
      ctx.fillStyle = swatchGrad;
      ctx.beginPath();
      ctx.rect(PAD.left + NAME_W, ly - 6, 12, 12);
      ctx.fill();
      ctx.fillStyle = LEGEND_LABEL.color;
      ctx.fillText('base value', PAD.left + NAME_W + 16, ly);

      // Variation swatch
      ctx.fillStyle = rgb(CC.teal, 0.35);
      ctx.beginPath();
      ctx.rect(PAD.left + NAME_W + 160, ly - 6, 12, 12);
      ctx.fill();
      ctx.fillStyle = LEGEND_LABEL.color;
      ctx.fillText('approved variations', PAD.left + NAME_W + 176, ly);

      // Portfolio total right-aligned
      ctx.font      = LEGEND_LABEL.font;
      ctx.textAlign = 'right';
      ctx.fillStyle = LEGEND_LABEL.color;
      ctx.fillText(`Portfolio: ${fmtValue(tot?.total ?? 0)}`, W - 8, ly);
    },
    true,
    { easing: easeOutQuart },
  );

  if (isEmpty) {
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <ChartEmptyState width={W} height={MIN_H} message="No contract data available" testID={testID} />
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid={testID} style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Total contract value per contractor — horizontal bar chart"
          style={{ width: '100%', height: dynamicH, display: 'block', borderRadius: 8 }}
        />
        <CanvasTooltip {...tooltip} parentW={W} parentH={dynamicH} />
      </div>
      {validItems.length > MAX_ITEMS && (
        <div style={{ marginTop: 8 }}>
          <ToggleButton expanded={showAll} onToggle={() => setShowAll(prev => !prev)} />
        </div>
      )}
    </div>
  );
}
