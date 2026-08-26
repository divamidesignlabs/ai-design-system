import { useRef, useEffect, useState, useMemo, useCallback } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitCircle, registerHitRect } from '../../canvas/useCanvasInteraction';
import type { TooltipContent } from '../../canvas/useCanvasInteraction';
import { easeOutCubic } from '../../canvas/easing';
import { isLightChartGround, CC, GRAD_PALETTE, AXIS_LABEL, CHART_VALUE, hoverInkFor, rgb, drawGlow, drawDust, drawScanline, setupCanvas } from '../../canvas/canvasUtils';
import { useContainerWidth } from '../../canvas/useContainerWidth';
import { ChartEmptyState } from '../common/ChartEmptyState';
import { ToggleButton } from '../common/ToggleButton';
import { NUMBER_SYSTEM } from '../../constants';
import { formatNumber } from '../../utils/numberFormat';
import type { ContractorRow } from '../../types';
import type { ProgressRaceChartProps } from './types';

const DEFAULT_W  = 660;
const TRACK_H    = 4;
const TRACK_GAP  = 30;
const PAD_T      = TRACK_GAP / 2;
const PAD_B      = TRACK_GAP / 2;
const MAX_ITEMS  = 8;


function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}


export function ProgressRaceChart({ items: rawItems = [], itemsByEntity, onItemClick, selectedId, colorOffset = 0, numberSystem: rawNumberSystem, testID }: ProgressRaceChartProps) {
  const numberSystem = rawNumberSystem ?? NUMBER_SYSTEM.INTERNATIONAL;
  const [containerRef, W] = useContainerWidth(DEFAULT_W);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef(0);
  const hoverMap  = useRef<Map<string, number>>(new Map());
  const selectedIdRef  = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const visibleRef = useRef<ContractorRow[]>([]);

  const handleClick = useCallback((id: string, data: TooltipContent | string) => {
    const label = typeof data === 'object' ? (data.label ?? id) : id;
    const item = visibleRef.current.find(c => c.id === id);
    onItemClick?.(id, label, item?.subentity);
  }, [onItemClick]);
  const [showAll, setShowAll] = useState(false);

  const isDrillMode = !!(selectedId && itemsByEntity?.[selectedId]);
  const activeRawItems = isDrillMode ? itemsByEntity![selectedId!] : rawItems;

  const items = useMemo(
    () => (rawItems as unknown[]).filter((c): c is ContractorRow => c != null && typeof c === 'object'),
    [rawItems],
  );
  const activeItems = useMemo(
    () => (activeRawItems as unknown[]).filter((c): c is ContractorRow => c != null && typeof c === 'object'),
    [activeRawItems],
  );
  const sorted = useMemo(
    () => [...activeItems].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0)),
    [activeItems],
  );
  const visible = useMemo(
    () => showAll ? sorted : sorted.slice(0, MAX_ITEMS),
    [sorted, showAll],
  );
  visibleRef.current = visible;
  const n       = visible.length;
  const H       = PAD_T + PAD_B + n * TRACK_H + Math.max(0, n - 1) * TRACK_GAP;

  const { hoveredRef, tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, { width: W, height: H, onClick: onItemClick ? handleClick : undefined });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, W, H);
    frameRef.current = 0;

    ctx.font = AXIS_LABEL.font;
    ctx.letterSpacing = AXIS_LABEL.letterSpacing;
    const maxLabelW = visible.reduce((acc, c) => Math.max(acc, ctx.measureText(c.name ?? c.abbreviation ?? '').width), 0);
    ctx.font = CHART_VALUE.font;
    const maxValW = visible.reduce((acc, c) => Math.max(acc, ctx.measureText(c.totalLabel ?? formatNumber(c.total ?? 0, 1, numberSystem)).width), 0);
    const padL   = Math.max(Math.min(maxLabelW + 20, W * 0.3), 40);
    const padR   = Math.max(maxValW + 20, 28);
    const trackW = W - padL - padR;

    const [gradFrom, gradTo] = GRAD_PALETTE[colorOffset % GRAD_PALETTE.length];
    // Name, value, tip glow and tooltip accent share one ink. gradTo is the
    // pair's BRIGHT stop — correct on dark, washed out on light. See hoverInkFor.
    const hoverInk = hoverInkFor(GRAD_PALETTE[colorOffset % GRAD_PALETTE.length]);
    let raf: number;

    const draw = () => {
      frameRef.current++;
      const T = frameRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.letterSpacing = AXIS_LABEL.letterSpacing;
      hitZonesRef.current = [];

      // Tick hover map
      hoverMap.current.forEach((val, id) => {
        const target = id === hoveredRef.current ? 1 : 0;
        const next = val + (target - val) * 0.12;
        if (Math.abs(next - target) < 0.005) {
          if (target === 0) hoverMap.current.delete(id);
          else hoverMap.current.set(id, 1);
        } else {
          hoverMap.current.set(id, next);
        }
      });
      if (hoveredRef.current && !hoverMap.current.has(hoveredRef.current)) {
        hoverMap.current.set(hoveredRef.current, 0);
      }

      drawDust(ctx, W, H, T, 40, rgb(gradTo, 0.04));

      const maxTotal = Math.max(...visible.map(c => c.total ?? 0), 1);

      visible.forEach((contractor, i) => {
        const hp        = hoverMap.current.get(contractor.id) ?? 0;
        const dimFactor = !isDrillMode && selectedIdRef.current && contractor.id !== selectedIdRef.current ? 0.6 : 1;
        const trackY    = PAD_T + i * (TRACK_H + TRACK_GAP);

        // Track background
        // Track background. --chart-bar-bg is a SERIES colour (blue in the light
        // theme) while the fill is whichever series this row owns, so at 0.2 the
        // track read as a saturated periwinkle competing with a teal bar. Light
        // uses --chart-track, the token that actually means "unfilled track";
        // dark keeps the original so its output is unchanged.
        ctx.fillStyle = isLightChartGround() ? CC.trackFill : rgb(CC.barBg, 0.2);
        ctx.beginPath();
        ctx.rect(padL, trackY, trackW, TRACK_H);
        ctx.fill();

        // Runner animation
        const trackProgress = (contractor.total ?? 0) / maxTotal;
        const animProg = Math.min(trackProgress, trackProgress * easeOutCubic(Math.min(1, T * 0.005)));
        const runnerX  = padL + trackW * animProg;

        // Gradient fill bar — dark start → bright end
        if (runnerX > padL + 2) {
          const trailGrad = ctx.createLinearGradient(padL, 0, runnerX, 0);
          trailGrad.addColorStop(0, rgb(gradFrom, 0.75 * dimFactor));
          trailGrad.addColorStop(1, rgb(gradTo,   0.95 * dimFactor));
          ctx.fillStyle = trailGrad;
          ctx.beginPath();
          ctx.rect(padL, trackY, runnerX - padL, TRACK_H);
          ctx.fill();
        }

        // Subtle glow at bar tip on hover
        if (hp > 0) {
          drawGlow(ctx, runnerX, trackY + TRACK_H / 2, 12 * hp, hoverInk, 0.35 * hp);
        }

        const hitData = {
          label: contractor.name,
          sublabel: contractor.totalLabel ?? (contractor.total != null ? formatNumber(contractor.total) : undefined),
          color: hoverInk,
        };
        registerHitRect(
          hitZonesRef.current,
          contractor.id,
          0,
          trackY - TRACK_GAP / 2,
          padL + trackW,
          TRACK_H + TRACK_GAP,
          hitData,
          undefined,
          padL + trackW + 12 + maxValW + 14,
        );
        registerHitCircle(
          hitZonesRef.current,
          contractor.id,
          runnerX,
          trackY + TRACK_H / 2,
          10,
          hitData,
        );

        // Value label — right edge
        ctx.font         = CHART_VALUE.font;
        ctx.fillStyle    = hp > 0 ? rgb(hoverInk, 1 * dimFactor) : rgb(CC.t1, 0.85 * dimFactor);
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(contractor.totalLabel ?? formatNumber(contractor.total ?? 0, 1, numberSystem), padL + trackW + 12, trackY + TRACK_H / 2);

        // Left label: contractor name
        ctx.font      = AXIS_LABEL.font;
        ctx.fillStyle = hp > 0 ? rgb(hoverInk, 1 * dimFactor) : rgb(CC.t2, 0.85 * dimFactor);
        ctx.textAlign = 'right';
        ctx.fillText(truncate(ctx, contractor.name ?? contractor.abbreviation ?? '', padL - 16), padL - 8, trackY + TRACK_H / 2);
      });

drawScanline(ctx, W, H, T, 0.015);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [visible, H, colorOffset, W, numberSystem]);

  const isEmpty = sorted.length === 0;
  if (isEmpty) {
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <ChartEmptyState width={W} height={160} testID={testID} />
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid={testID} style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Commitment race — contractors ranked by commitment percentage"
          style={{ width: '100%', height: H, display: 'block', borderRadius: 8 }}
        />
        <CanvasTooltip {...tooltip} parentW={W} parentH={H} />
      </div>
      {items.length > MAX_ITEMS && (
        <div style={{ marginTop: 8 }}>
          <ToggleButton expanded={showAll} onToggle={() => setShowAll(prev => !prev)} />
        </div>
      )}
    </div>
  );
}
