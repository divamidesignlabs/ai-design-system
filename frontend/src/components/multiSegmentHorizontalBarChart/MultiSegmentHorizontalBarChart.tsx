import { useRef, useEffect, useMemo, useState } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitRect } from '../../canvas/useCanvasInteraction';
import { stagger, easeOutQuart } from '../../canvas/easing';
import { CC, AXIS_LABEL, CHART_VALUE, LEGEND_LABEL, setupCanvas } from '../../canvas/canvasUtils';
import { ChartEmptyState } from '../common/ChartEmptyState';
import { ToggleButton } from '../common/ToggleButton';
import type { DualSegmentBarRow } from '../../types';
import type { MultiSegmentHorizontalBarChartProps } from './types';

// ─── Layout constants (match design spec) ────────────────────────────────────
const BAR_H   = 6;
const TRACK_W = 807;
const PAD_L   = 156;   // bar left edge ≈ 155.88 px
const RVAL_W  = 66;
const W       = PAD_L + TRACK_W + RVAL_W;   // 700

const ROW_H   = 28;   // row band height (bar is centred within it)
const GAP     = 30;
const PAD_T   = 16;
const LEGEND_H = 32;
const PAD_B   = 16;

const INITIAL_VISIBLE = 5;

// Per-row colour for the agreed segment (cycles through palette, orange reserved for over-spent)
const ROW_COLORS = [CC.blue, CC.amber, CC.green, CC.purple] as const;
// Over-spent segment is always orange
const OVERSPENT_COLOR = CC.orange;

function fmtM(v: number, prefix: string): string {
  const abs  = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(1)}B`;
  if (abs >= 1)     return `${sign}${prefix}${abs.toFixed(1)}M`;
  return `${sign}${prefix}${(abs * 1_000).toFixed(0)}K`;
}

export function MultiSegmentHorizontalBarChart({
  rows: rawRows = [],
  valuePrefix: rawValuePrefix,
  testID,
}: MultiSegmentHorizontalBarChartProps) {
  // null-safe: backend specs send JSON null, which skips a default parameter.
  const valuePrefix = rawValuePrefix ?? '$';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef(0);
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(
    () => (rawRows as unknown[]).filter((r): r is DualSegmentBarRow & { primaryValue: number } => {
      if (r == null || typeof r !== 'object') return false;
      const v = (r as Record<string, unknown>)['primaryValue'];
      return typeof v === 'number' && isFinite(v) && v > 0;
    }),
    [rawRows],
  );

  const maxTotal = useMemo(
    () => Math.max(1, ...rows.map(r => r.primaryValue + (r.secondaryValue ?? 0))),
    [rows],
  );

  const visibleRows = useMemo(
    () => expanded ? rows : rows.slice(0, INITIAL_VISIBLE),
    [rows, expanded],
  );

  const H = visibleRows.length > 0
    ? PAD_T + visibleRows.length * ROW_H + Math.max(0, visibleRows.length - 1) * GAP + LEGEND_H + PAD_B
    : 160;

  const { tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, { width: W, height: H });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, W, H);
    frameRef.current = 0;
    const DURATION = 60;

    let raf: number;

    const draw = () => {
      frameRef.current++;
      const T = frameRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.letterSpacing = AXIS_LABEL.letterSpacing;

      const rawP     = Math.min(T / DURATION, 1);
      const progress = easeOutQuart(rawP);

      hitZonesRef.current = [];

      visibleRows.forEach((row, i) => {
        const localP     = stagger(progress, i, visibleRows.length, easeOutQuart);
        const rowTop     = PAD_T + i * (ROW_H + GAP);
        const barY       = rowTop + (ROW_H - BAR_H) / 2;
        const rowColor   = ROW_COLORS[i % ROW_COLORS.length];
        const agreedId   = `${row.id}-agreed`;
        const overspentId = `${row.id}-overspent`;

        // Proportional widths (full, pre-animation)
        const agreedFullW    = (row.primaryValue / maxTotal) * TRACK_W;
        const overspentFullW = ((row.secondaryValue ?? 0) / maxTotal) * TRACK_W;

        // Animated width for agreed segment
        const agreedW = agreedFullW * localP;

        // ── Row name label (right-aligned, same baseline as bar value labels) ──
        ctx.font         = AXIS_LABEL.font;
        ctx.fillStyle    = CC.t2;
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(row.name, PAD_L - 20.6, barY - 3);

        // ── Agreed segment ───────────────────────────────────────────
        if (agreedW > 0) {
          ctx.fillStyle = rowColor;
          ctx.fillRect(PAD_L, barY, agreedW, BAR_H);

          registerHitRect(hitZonesRef.current, agreedId, PAD_L, rowTop, agreedFullW, ROW_H, {
            label  : `${row.name} — Agreed`,
            value  : fmtM(row.primaryValue, valuePrefix),
            color  : rowColor,
          });
        }

        // ── Over-spent segment (4 px gap after agreed) ───────────────
        if (overspentFullW > 0) {
          const osAnimW = overspentFullW * localP;
          const osX     = PAD_L + agreedFullW + 4;

          if (osAnimW > 0) {
            ctx.fillStyle = OVERSPENT_COLOR;
            ctx.fillRect(osX, barY, osAnimW, BAR_H);

            registerHitRect(hitZonesRef.current, overspentId, osX, rowTop, overspentFullW, ROW_H, {
              label  : `${row.name} — Over spent`,
              value  : fmtM(row.secondaryValue ?? 0, valuePrefix),
              color  : OVERSPENT_COLOR,
            });
          }

          // Punch a transparent gap between the two segments
          ctx.clearRect(PAD_L + agreedFullW, barY, 4, BAR_H);
        }

        // ── Value labels above bars (left-aligned at segment start) ──
        const labelY = barY - 3;
        ctx.font         = CHART_VALUE.font;
        ctx.textBaseline = 'bottom';
        ctx.textAlign    = 'left';

        // Agreed value — at the left edge of the agreed segment
        if (localP > 0.15) {
          ctx.globalAlpha = Math.min(1, (localP - 0.15) / 0.35);
          ctx.fillStyle   = CHART_VALUE.color;
          ctx.fillText(fmtM(row.primaryValue, valuePrefix), PAD_L, labelY);
          ctx.globalAlpha = 1;
        }

        // Over-spent value — at the left edge of the over-spent segment (after gap)
        if ((row.secondaryValue ?? 0) > 0 && localP > 0.5) {
          ctx.globalAlpha = Math.min(1, (localP - 0.5) / 0.4);
          ctx.fillStyle   = CHART_VALUE.color;
          ctx.fillText(fmtM(row.secondaryValue ?? 0, valuePrefix), PAD_L + agreedFullW + 4, labelY);
          ctx.globalAlpha = 1;
        }
      });

      // ── Legend ───────────────────────────────────────────────────────────
      const legendY = H - PAD_B - LEGEND_H / 2;
      ctx.font         = LEGEND_LABEL.font;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha  = Math.min(1, progress * 2);

      // Agreed swatch
      ctx.fillStyle = CC.green;
      ctx.fillRect(PAD_L, legendY - 6, 12, 12);
      ctx.fillStyle = LEGEND_LABEL.color;
      ctx.textAlign = 'left';
      ctx.fillText('Company agreed amount', PAD_L + 16, legendY);

      // Over-spent swatch
      const overLegendX = PAD_L + 210;
      ctx.fillStyle = OVERSPENT_COLOR;
      ctx.fillRect(overLegendX, legendY - 6, 12, 12);
      ctx.fillStyle = LEGEND_LABEL.color;
      ctx.fillText('Company over spent amount', overLegendX + 16, legendY);

      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [visibleRows, H, maxTotal, valuePrefix]);

  if (rows.length === 0) {
    return <ChartEmptyState width={W} height={160} testID={testID} />;
  }

  return (
    <div data-testid={testID} style={{ position: 'relative', width: W }}>
      <div style={{ position: 'relative', width: W, height: H }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Agreed vs over-spent amount per contractor"
          style={{ width: W, height: H, display: 'block' }}
        />
        <CanvasTooltip {...tooltip} parentW={W} parentH={H} />
      </div>
      {rows.length > INITIAL_VISIBLE && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
          <ToggleButton
            expanded={expanded}
            onToggle={() => setExpanded(prev => !prev)}
            data-testid="multi-segment-bar-toggle"
          />
        </div>
      )}
    </div>
  );
}
