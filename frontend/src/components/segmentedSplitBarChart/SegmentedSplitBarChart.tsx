import { useRef, useEffect, useState, useMemo, useCallback } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitRect } from '../../canvas/useCanvasInteraction';
import type { TooltipContent } from '../../canvas/useCanvasInteraction';
import { stagger, tickHoverProgress, easeOutQuart } from '../../canvas/easing';
import { CC, LEGEND_LABEL, CHART_VALUE, rgb, drawGlow, setupCanvas, AXIS_LABEL } from '../../canvas/canvasUtils';
import { useContainerWidth } from '../../canvas/useContainerWidth';
import { ChartEmptyState } from '../common/ChartEmptyState';
import { ToggleButton } from '../common/ToggleButton';
import { formatNumber } from '../../utils/numberFormat';
import type { VariationRow } from '../../types';
import type { SegmentedSplitBarChartProps } from './types';

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

const DEFAULT_W  = 680;
const MAX_ITEMS  = 8;
const BAR_H      = 4;
const INNER_GAP  = 8;
const PAIR_H     = BAR_H * 2 + INNER_GAP;
const PAIR_GAP   = 36;
const PAD_T      = PAIR_GAP / 2;
const PAD_B      = 48;

export function SegmentedSplitBarChart({ items: rawItems = [], itemsByEntity, onItemClick, selectedId, labelA = 'Implemented', labelB = 'Unimplemented', unit = 'variations', testID }: SegmentedSplitBarChartProps) {
  const [containerRef, W] = useContainerWidth(DEFAULT_W);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverMap = useRef(new Map<string, number>());
  const frameRef = useRef(0);
  const selectedIdRef  = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const visibleRef = useRef<VariationRow[]>([]);

  const handleClick = useCallback((id: string, data: TooltipContent | string) => {
    const rawId = id.replace(/-impl$|-un$/, '');
    const label = typeof data === 'object' ? (data.label ?? rawId) : rawId;
    const item = visibleRef.current.find(c => c.id === rawId);
    onItemClick?.(rawId, label, item?.subentity);
  }, [onItemClick]);
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(
    () => (rawItems as unknown[]).filter((c): c is VariationRow => c != null && typeof c === 'object'),
    [rawItems],
  );

  const isDrillMode = !!(selectedId && itemsByEntity?.[selectedId]);
  const activeRawItems = isDrillMode ? itemsByEntity![selectedId!] : rawItems;
  const activeItems = useMemo(
    () => (activeRawItems as unknown[]).filter((c): c is VariationRow => c != null && typeof c === 'object'),
    [activeRawItems],
  );

  const visible = useMemo(
    () => showAll ? activeItems : activeItems.slice(0, MAX_ITEMS),
    [activeItems, showAll],
  );
  visibleRef.current = visible;

  const H = PAD_T + PAD_B + visible.length * (PAIR_H + PAIR_GAP) - PAIR_GAP;

  const { hoveredRef, tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, { width: W, height: H, onClick: onItemClick ? handleClick : undefined });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, W, H);
    frameRef.current = 0;
    const DURATION = 60;

    ctx.font = AXIS_LABEL.font;
    const maxLabelW = visible.reduce((acc, c) => Math.max(acc, ctx.measureText(c.abbreviation ?? c.name ?? '').width), 0);
    ctx.font = CHART_VALUE.font;
    const maxValW = visible.reduce((acc, c) => Math.max(acc,
      ctx.measureText(formatNumber(c.implemented ?? 0)).width,
      ctx.measureText(formatNumber(c.unimplemented ?? 0)).width,
    ), 0);
    const padL   = Math.max(Math.min(maxLabelW + 20, W * 0.3), 40);
    const padR   = Math.max(maxValW + 24, 32);
    const trackW = W - padL - padR;
    const maxVal = Math.max(
      ...visible.map(c => c.implemented   ?? 0),
      ...visible.map(c => c.unimplemented ?? 0),
      1,
    );
    const totalH = visible.length * (PAIR_H + PAIR_GAP) - PAIR_GAP;
    const startY = PAD_T + (H - PAD_T - PAD_B - totalH) / 2;

    let raf: number;

    const draw = () => {
      frameRef.current++;
      const T = frameRef.current;
      ctx.clearRect(0, 0, W, H);

      const rawP    = Math.min(T / DURATION, 1);
      const progress = easeOutQuart(rawP);

      tickHoverProgress(hoverMap.current, hoveredRef.current);
      hitZonesRef.current = [];

      visible.forEach((c, i) => {
        const localP  = stagger(progress, i, visible.length, easeOutQuart);
        const pairY   = startY + i * (PAIR_H + PAIR_GAP);
        const yImpl   = pairY;
        const yUniml  = pairY + BAR_H + INNER_GAP;
        const implId  = `${c.id}-impl`;
        const unimplId = `${c.id}-un`;
        const hpImpl  = hoverMap.current.get(implId) ?? 0;
        const hpUn    = hoverMap.current.get(unimplId) ?? 0;
        const dimFactor = !isDrillMode && selectedIdRef.current && c.id !== selectedIdRef.current ? 0.6 : 1;
        const implW   = ((c.implemented   ?? 0) / maxVal) * trackW * localP;
        const unimplW = ((c.unimplemented ?? 0) / maxVal) * trackW * localP;

        // Contractor name — centered between the two bars
        ctx.font      = AXIS_LABEL.font;
        ctx.fillStyle = hpImpl > 0 || hpUn > 0 ? CC.t1 : CC.t2;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncate(ctx, c.abbreviation ?? c.name ?? '', padL - 16), padL - 8, pairY + PAIR_H / 2);
        ctx.textBaseline = 'alphabetic';

        // Hit zone on name area — centerXOverride at bar tip for connector routing
        registerHitRect(hitZonesRef.current, implId, 0, pairY, padL, PAIR_H, {
          label: c.name ?? c.abbreviation ?? '',
          value: `${formatNumber((c.implemented ?? 0) + (c.unimplemented ?? 0))} total ${unit}`,
          sublabel: `${labelA}: ${formatNumber(c.implemented ?? 0)} · ${labelB}: ${formatNumber(c.unimplemented ?? 0)}`,
          color: CC.green,
        }, undefined, padL + Math.max(implW, unimplW) + 16 + maxValW + 14);

        // ── Implemented bar (green) ─────────────────────────────────────────
        if (implW > 0) {
          if (hpImpl > 0) drawGlow(ctx, padL + implW / 2, yImpl + BAR_H / 2, implW * 0.15, CC.green, 0.18 * hpImpl);
          const gImpl = ctx.createLinearGradient(padL, 0, padL + implW, 0);
          gImpl.addColorStop(0, rgb(CC.green, 0.7 * dimFactor));
          gImpl.addColorStop(1, rgb(CC.green, 1.0 * dimFactor));
          ctx.fillStyle = gImpl;
          ctx.beginPath();
          ctx.roundRect(padL, yImpl, implW, BAR_H, BAR_H / 2);
          ctx.fill();
        }
        registerHitRect(hitZonesRef.current, implId, padL, yImpl, Math.max(implW, 1), BAR_H, {
          label: c.name, value: formatNumber(c.implemented ?? 0), color: CC.green,
        }, pairY + PAIR_H / 2, padL + Math.max(implW, unimplW) + 16 + maxValW + 14);

        // Value label right of impl bar
        if (localP > 0.4) {
          const fade = Math.min(1, (localP - 0.4) / 0.4);
          ctx.globalAlpha  = fade;
          ctx.font         = CHART_VALUE.font;
          ctx.fillStyle    = CC.t1;
          ctx.textAlign    = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(formatNumber(c.implemented ?? 0), padL + implW + 16, yImpl + BAR_H / 2);
          ctx.globalAlpha  = 1;
          ctx.textBaseline = 'alphabetic';
        }

        // ── Unimplemented bar (amber) ────────────────────────────────────────
        if (unimplW > 0) {
          if (hpUn > 0) drawGlow(ctx, padL + unimplW / 2, yUniml + BAR_H / 2, unimplW * 0.15, CC.amber, 0.18 * hpUn);
          const gUn = ctx.createLinearGradient(padL, 0, padL + unimplW, 0);
          gUn.addColorStop(0, rgb(CC.amber, 0.5 * dimFactor));
          gUn.addColorStop(1, rgb(CC.amber, 0.9 * dimFactor));
          ctx.fillStyle = gUn;
          ctx.beginPath();
          ctx.roundRect(padL, yUniml, unimplW, BAR_H, BAR_H / 2);
          ctx.fill();
        }
        registerHitRect(hitZonesRef.current, unimplId, padL, yUniml, Math.max(unimplW, 1), BAR_H, {
          label: c.name, value: formatNumber(c.unimplemented ?? 0), color: CC.amber,
        }, pairY + PAIR_H / 2, padL + Math.max(implW, unimplW) + 16 + maxValW + 14);

        // Value label right of uniml bar
        if (localP > 0.4) {
          const fade = Math.min(1, (localP - 0.4) / 0.4);
          ctx.globalAlpha  = fade;
          ctx.font         = CHART_VALUE.font;
          ctx.fillStyle    = CC.t1;
          ctx.textAlign    = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(formatNumber(c.unimplemented ?? 0), padL + unimplW + 16, yUniml + BAR_H / 2);
          ctx.globalAlpha  = 1;
          ctx.textBaseline = 'alphabetic';
        }
      });

      // ── Legend ──────────────────────────────────────────────────────────────
      const legendY  = startY + totalH + 28;
      ctx.font       = LEGEND_LABEL.font;
      ctx.textBaseline = 'middle';
      ctx.textAlign  = 'left';

      const swatchW   = 12;
      const swatchGap = 6;
      const itemGap   = 24;
      const labelAW   = ctx.measureText(labelA).width;
      const labelBW   = ctx.measureText(labelB).width;
      const itemAW    = swatchW + swatchGap + labelAW;
      const itemBW    = swatchW + swatchGap + labelBW;
      const totalLegW = itemAW + itemGap + itemBW;
      const legendX   = (W - totalLegW) / 2;

      const gLegImpl = ctx.createLinearGradient(legendX, 0, legendX + swatchW, 0);
      gLegImpl.addColorStop(0, rgb(CC.green, 0.7));
      gLegImpl.addColorStop(1, rgb(CC.green, 1.0));
      ctx.fillStyle = gLegImpl;
      ctx.beginPath();
      ctx.rect(legendX, legendY - 6, swatchW, 12);
      ctx.fill();
      ctx.fillStyle = LEGEND_LABEL.color;
      ctx.fillText(labelA, legendX + swatchW + swatchGap, legendY);

      const bX = legendX + itemAW + itemGap;
      const gLegUn = ctx.createLinearGradient(bX, 0, bX + swatchW, 0);
      gLegUn.addColorStop(0, rgb(CC.amber, 0.5));
      gLegUn.addColorStop(1, rgb(CC.amber, 0.9));
      ctx.fillStyle = gLegUn;
      ctx.beginPath();
      ctx.rect(bX, legendY - 6, swatchW, 12);
      ctx.fill();
      ctx.fillStyle = LEGEND_LABEL.color;
      ctx.fillText(labelB, bX + swatchW + swatchGap, legendY);

      ctx.textBaseline = 'alphabetic';

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [visible, H, W]);

  const isEmpty = items.length === 0;
  if (isEmpty) {
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <ChartEmptyState width={W} height={160} testID={testID} />
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid={testID} style={{ width: '100%' }}>
      <div style={{ position: 'relative', height: H }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Implemented vs unimplemented variations per contractor — split bar"
          style={{ width: '100%', height: H, display: 'block' }}
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
