import { useRef, useState, useCallback } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitRect } from '../../canvas/useCanvasInteraction';
import type { TooltipContent } from '../../canvas/useCanvasInteraction';
import { easeOutQuart, stagger, tickHoverProgress } from '../../canvas/easing';
import { CC, AXIS_LABEL, CHART_VALUE, rgb, drawGlow } from '../../canvas/canvasUtils';
import { useCanvasLoop } from '../../canvas/useCanvasLoop';
import { useContainerWidth } from '../../canvas/useContainerWidth';
import { ChartEmptyState } from '../common/ChartEmptyState';
import { ToggleButton } from '../common/ToggleButton';
import type { HorizontalBarChartProps } from './types';

const DEFAULT_W = 680;
const MIN_H     = 160;
const PAD       = { left: 8, right: 90, top: 16, bottom: 16 };
const NAME_W    = 150;
const BAR_H     = 4;
const ROW_H     = 48;
const MAX_ITEMS = 8;

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

function fmtValue(v: number, prefix: string): string {
  const abs  = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${prefix}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${prefix}${abs.toFixed(0)}`;
}

export function HorizontalBarChart({ rows, valuePrefix = '$', onItemClick, testID }: HorizontalBarChartProps) {
  const [containerRef, W] = useContainerWidth(DEFAULT_W);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverMap  = useRef<Map<string, number>>(new Map());
  const [showAll, setShowAll] = useState(false);
  const rowsRef   = useRef(rows);
  rowsRef.current = rows;

  const handleClick = useCallback((id: string, data: TooltipContent | string) => {
    const label = typeof data === 'object' ? (data.label ?? id) : id;
    const row = rowsRef.current.find(r => r.id === id);
    onItemClick?.(id, label, row?.subentity);
  }, [onItemClick]);

  const validRows   = rows.filter(r => r != null && typeof r.value === 'number');
  const visibleRows = showAll ? validRows : validRows.slice(0, MAX_ITEMS);
  const n           = visibleRows.length;
  const maxValue    = Math.max(...validRows.map(r => Math.abs(r.value)), 1);
  const barArea   = W - PAD.left - NAME_W - PAD.right;
  const contentH  = n * ROW_H;
  const H         = PAD.top + PAD.bottom + contentH;

  const { hoveredRef, tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, { width: W, height: H, onClick: onItemClick ? handleClick : undefined });

  useCanvasLoop(
    canvasRef,
    W,
    H,
    (ctx, progress) => {
      tickHoverProgress(hoverMap.current, hoveredRef.current);
      hitZonesRef.current = [];

      visibleRows.forEach((row, i) => {
        const localP = stagger(progress, i, n, easeOutQuart);
        const rowTop = PAD.top + i * ROW_H;
        const barY   = rowTop + (ROW_H - BAR_H) / 2;
        const midY   = rowTop + ROW_H / 2;
        const x0     = PAD.left + NAME_W;
        const hp     = hoverMap.current.get(row.id) ?? 0;
        const barW   = (Math.abs(row.value) / maxValue) * barArea * localP;
        const label  = row.valueLabel ?? fmtValue(row.value, valuePrefix);

        ctx.save();

        // Row name — right-aligned before bar start
        ctx.font         = AXIS_LABEL.font;
        ctx.fillStyle    = hp > 0 ? CC.cyan : AXIS_LABEL.color;
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncate(ctx, row.name, NAME_W - 16), x0 - 8, midY);

        registerHitRect(hitZonesRef.current, row.id, 0, rowTop, x0, ROW_H, {
          label: row.name,
          value: label,
          color: CC.cyan,
        });

        // Track — full-width dim cyan fill matching reference
        ctx.fillStyle = rgb(CC.cyan, 0.10);
        ctx.beginPath();
        ctx.roundRect(x0, barY, barArea, BAR_H, BAR_H / 2);
        ctx.fill();

        // Bar fill — horizontal gradient: dim left → bright right
        if (barW > 0) {
          if (hp > 0) drawGlow(ctx, x0 + barW, barY + BAR_H / 2, barW * 0.25, CC.cyan, 0.14 * hp);
          const grad = ctx.createLinearGradient(x0, barY, x0 + barW, barY);
          grad.addColorStop(0,    rgb(CC.cyan, 0.2  + hp * 0.05));
          grad.addColorStop(0.55, rgb(CC.cyan, 0.55 + hp * 0.15));
          grad.addColorStop(1,    rgb(CC.cyan, 0.72 + hp * 0.18));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x0, barY, barW, BAR_H, BAR_H / 2);
          ctx.fill();
        }

        // Hover border
        if (hp > 0 && barW > 0) {
          ctx.strokeStyle = rgb(CC.cyan, 0.6 * hp);
          ctx.lineWidth   = 1;
          ctx.beginPath();
          ctx.roundRect(x0, barY, barW, BAR_H, BAR_H / 2);
          ctx.stroke();
        }

        // Value label — fixed right-aligned column
        if (localP > 0.35) {
          const fade = Math.min(1, (localP - 0.35) / 0.4);
          ctx.globalAlpha  = fade;
          ctx.font         = CHART_VALUE.font;
          ctx.fillStyle    = hp > 0 ? CC.cyan : CHART_VALUE.color;
          ctx.textAlign    = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, W - 8, midY);
        }

        ctx.restore();

        registerHitRect(hitZonesRef.current, row.id, x0, rowTop, Math.max(barW, 1), ROW_H, {
          label: row.name,
          value: label,
          color: CC.cyan,
        });
      });
    },
    true,
    { easing: easeOutQuart },
  );

  if (validRows.length === 0) {
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <ChartEmptyState width={W} height={MIN_H} message="No data available" testID={testID} />
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid={testID} style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Horizontal bar chart"
          style={{ width: '100%', height: H, display: 'block', borderRadius: 8 }}
        />
        <CanvasTooltip {...tooltip} parentW={W} parentH={H} />
      </div>
      {validRows.length > MAX_ITEMS && (
        <div style={{ marginTop: 8 }}>
          <ToggleButton
            expanded={showAll}
            onToggle={() => setShowAll(prev => !prev)}
            data-testid={testID ? `${testID}-toggle` : undefined}
          />
        </div>
      )}
    </div>
  );
}
