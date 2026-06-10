import { useRef, useEffect, useMemo, useCallback } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitCircle } from '../../canvas/useCanvasInteraction';
import type { TooltipContent } from '../../canvas/useCanvasInteraction';
import { stagger, tickHoverProgress, easeOutCubic } from '../../canvas/easing';
import { CC, CHART_PALETTE, AXIS_LABEL, CHART_VALUE, rgb, drawGlow, setupCanvas } from '../../canvas/canvasUtils';
import { useContainerWidth } from '../../canvas/useContainerWidth';
import { ChartEmptyState } from '../common/ChartEmptyState';
import { formatNumber } from '../../utils/numberFormat';
import type { NCEContractorRow } from '../../types';
import type { RadialFanTreeChartProps } from './types';

const DEFAULT_W = 770;
const MIN_H = 320;
const PAD_V = 60;
const MIN_LEAF_SPACING = 28;

export function RadialFanTreeChart({ total = 0, totalLabel, items: rawByContractor = [], dataByEntity, onItemClick, selectedId, colorOffset = 0, testID }: RadialFanTreeChartProps) {
  const [containerRef, W] = useContainerWidth(DEFAULT_W);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverMap = useRef(new Map<string, number>());
  const frameRef = useRef(0);
  const selectedIdRef  = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const byContractorRef = useRef<NCEContractorRow[]>([]);

  const handleClick = useCallback((id: string, data: TooltipContent | string) => {
    if (id === '__root__') return;
    const label = typeof data === 'object' ? (data.label ?? id) : id;
    const item = byContractorRef.current.find(c => c.id === id);
    onItemClick?.(id, label, item?.subentity);
  }, [onItemClick]);

  const isDrillMode = !!(selectedId && dataByEntity?.[selectedId]);
  const drillData = isDrillMode ? dataByEntity![selectedId!] : null;
  const activeTotal      = drillData ? drillData.total      : total;
  const activeTotalLabel = drillData ? drillData.totalLabel : totalLabel;
  const activeRawItems   = drillData ? drillData.items      : rawByContractor;

  const byContractor = useMemo(
    () => (activeRawItems as unknown[]).filter((c): c is NCEContractorRow => c != null && typeof c === 'object'),
    [activeRawItems],
  );
  byContractorRef.current = byContractor;

  const fanH = useMemo(
    () => Math.max(MIN_H, PAD_V + Math.max(0, byContractor.length - 1) * MIN_LEAF_SPACING),
    [byContractor.length],
  );
  const H = fanH;

  const { hoveredRef, tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, { width: W, height: fanH, onClick: onItemClick ? handleClick : undefined });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, W, H);
    frameRef.current = 0;
    const DURATION = 72;

    const rootX = 60;
    const rootY = fanH / 2;
    const rootR = 40;
    const splitX = rootX + rootR + 60; // single stem ends here, branches fan out from this point
    const leafX = W - 140;
    const maxCount = Math.max(...byContractor.map(c => c.count ?? 0), 1);
    const leafSpacing = byContractor.length > 1 ? (fanH - 60) / (byContractor.length - 1) : 60;
    const maxLeafR = Math.min(22, leafSpacing / 2 - 3);
    const minLeafR = Math.min(8, Math.max(3, maxLeafR - 6));
    const leafStartY = 30;
    const labelX = leafX + maxLeafR + 10; // fixed left-align for all leaf labels

    const leafPositions = byContractor.map((_, i) => ({
      x: leafX,
      y: leafStartY + i * leafSpacing,
    }));

    let raf: number;

    const draw = () => {
      frameRef.current++;
      const T = frameRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.letterSpacing = AXIS_LABEL.letterSpacing;

      const rawP = Math.min(T / DURATION, 1);
      const progress = easeOutCubic(rawP);

      tickHoverProgress(hoverMap.current, hoveredRef.current);
      hitZonesRef.current = [];

      const color = CHART_PALETTE[colorOffset % CHART_PALETTE.length];

      // Single stem: root edge → splitX along rootY
      const stemP = Math.min(1, progress * 2.5);
      const stemEndX = (rootX + rootR) + (splitX - rootX - rootR) * stemP;
      const stemGrad = ctx.createLinearGradient(rootX + rootR, 0, stemEndX, 0);
      stemGrad.addColorStop(0, rgb(color, 0.8));
      stemGrad.addColorStop(1, rgb(color, 0.7));
      ctx.beginPath();
      ctx.moveTo(rootX + rootR, rootY);
      ctx.lineTo(stemEndX, rootY);
      ctx.strokeStyle = stemGrad;
      ctx.lineWidth = 1.33;
      ctx.stroke();

      // Draw branches from splitX → each leaf
      byContractor.forEach((c, i) => {
        const localP = stagger(progress, i, byContractor.length, easeOutCubic);
        const lpos = leafPositions[i];
        const hp = hoverMap.current.get(c.id) ?? 0;
        const dimFactor = !isDrillMode && selectedIdRef.current && c.id !== selectedIdRef.current ? 0.6 : 1;

        if (localP < 0.01) return;

        // Curve from splitX/rootY → lpos
        const cp1x = splitX + (leafX - splitX) * 0.35;
        const cp1y = rootY;
        const cp2x = splitX + (leafX - splitX) * 0.65;
        const cp2y = lpos.y;

        const steps = 40;
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const t = (s / steps) * localP;
          const x = (1 - t) ** 3 * splitX + 3 * (1 - t) ** 2 * t * cp1x + 3 * (1 - t) * t ** 2 * cp2x + t ** 3 * lpos.x;
          const y = (1 - t) ** 3 * rootY  + 3 * (1 - t) ** 2 * t * cp1y + 3 * (1 - t) * t ** 2 * cp2y + t ** 3 * lpos.y;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const branchGrad = ctx.createLinearGradient(splitX, rootY, lpos.x, lpos.y);
        branchGrad.addColorStop(0, rgb(color, (hp > 0 ? 1.0 : 0.8) * dimFactor));
        branchGrad.addColorStop(1, rgb(color, (hp > 0 ? 1.0 : 0.7) * dimFactor));
        ctx.strokeStyle = branchGrad;
        ctx.lineWidth = hp > 0 ? 2 : 1.33;
        ctx.stroke();

        // Leaf node — radius scales with count
        if (localP > 0.85) {
          const leafFade = Math.min(1, (localP - 0.85) / 0.15);
          const leafR = minLeafR + ((c.count ?? 0) / maxCount) * (maxLeafR - minLeafR);

          drawGlow(ctx, lpos.x, lpos.y, leafR * 2, color, (0.2 + hp * 0.2) * leafFade * dimFactor);
          ctx.beginPath();
          ctx.arc(lpos.x, lpos.y, leafR * leafFade, 0, Math.PI * 2);
          ctx.fillStyle = rgb(color, leafFade * dimFactor);
          ctx.fill();

          const displayVal = formatNumber(c.count ?? 0);
          registerHitCircle(hitZonesRef.current, c.id, lpos.x, lpos.y, leafR + 8, {
            label: c.name,
            value: displayVal,
            sublabel: `${Math.round(((c.count ?? 0) / (activeTotal || 1)) * 100)}% of total`,
            color,
          }, W);

          // Labels — fixed labelX for consistent left alignment
          ctx.globalAlpha = leafFade * dimFactor;
          ctx.font = AXIS_LABEL.font;
          ctx.textAlign = 'left';
          const nameText = c.abbreviation ?? c.name?.slice(0, 6) ?? '';
          const countText = ` ${formatNumber(c.count ?? 0)}`;
          const yLabel = lpos.y + 4;
          ctx.fillStyle = hp > 0 ? color : rgb(CC.t2, 0.85);
          ctx.fillText(nameText, labelX, yLabel);
          const nameW = ctx.measureText(nameText).width;
          ctx.font = CHART_VALUE.font;
          ctx.fillStyle = hp > 0 ? color : CC.t1;
          ctx.fillText(countText, labelX + nameW, yLabel);
          ctx.globalAlpha = 1;
        }
      });

      // Root node — radial gradient inner shadow (transparent center → vivid at edge)
      const rootDrawR = rootR * progress;
      const rootGrad = ctx.createRadialGradient(rootX, rootY, 0, rootX, rootY, rootDrawR);
      rootGrad.addColorStop(0,    rgb(color, 0.02 * progress));
      rootGrad.addColorStop(0.55, rgb(color, 0.02 * progress));
      rootGrad.addColorStop(1,    rgb(color, 0.15 * progress));
      ctx.beginPath();
      ctx.arc(rootX, rootY, rootDrawR, 0, Math.PI * 2);
      ctx.fillStyle = rootGrad;
      ctx.fill();

      // Outer border: 1px teal
      ctx.beginPath();
      ctx.arc(rootX, rootY, rootDrawR, 0, Math.PI * 2);
      ctx.strokeStyle = rgb(color, 0.8 * progress);
      ctx.lineWidth = 1;
      ctx.stroke();


      if (progress > 0.4) {
        const fade = Math.min(1, (progress - 0.4) / 0.4);
        ctx.globalAlpha = fade;
        const fullValue = formatNumber(activeTotal);
        const maxTextW = rootR * 1.7;
        ctx.font = `500 16px 'Satoshi Variable', 'DM Sans', sans-serif`;
        let truncated = fullValue;
        while (ctx.measureText(truncated).width > maxTextW && truncated.length > 1) {
          truncated = truncated.slice(0, -1);
        }
        if (truncated !== fullValue) truncated = truncated.slice(0, -1) + '…';
        ctx.fillStyle = CC.t1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncated, rootX, rootY);
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha = 1;
      }

      registerHitCircle(hitZonesRef.current, '__root__', rootX, rootY, rootR, {
        label: activeTotalLabel ?? 'Total',
        value: formatNumber(activeTotal),
        sublabel: `${byContractor.length} items`,
        color,
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [activeTotal, activeTotalLabel, byContractor, fanH, W, isDrillMode]);

  const isEmpty = byContractor.length === 0;
  if (isEmpty) {
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <ChartEmptyState width={W} height={MIN_H} testID={testID} />
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid={testID} style={{ position: 'relative', width: '100%', height: H }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="NCE fault tree — NCEs per contractor as branching tree"
        style={{ width: '100%', height: H, display: 'block' }}
      />
      <CanvasTooltip {...tooltip} parentW={W} parentH={H} />
    </div>
  );
}
