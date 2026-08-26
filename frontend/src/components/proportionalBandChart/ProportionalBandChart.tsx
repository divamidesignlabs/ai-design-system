import { useRef, useEffect, useMemo, useCallback } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitRect } from '../../canvas/useCanvasInteraction';
import type { TooltipContent } from '../../canvas/useCanvasInteraction';
import { tickHoverProgress, easeOutQuart } from '../../canvas/easing';
import { CC, CHART_PALETTE, AXIS_LABEL, rgb, setupCanvas } from '../../canvas/canvasUtils';
import { useContainerWidth } from '../../canvas/useContainerWidth';
import { NUMBER_SYSTEM } from '../../constants';
import { formatNumber } from '../../utils/numberFormat';
import { ChartEmptyState } from '../common/ChartEmptyState';
import type { EWSeverityRow } from '../../types';
import type { ProportionalBandChartProps } from './types';

const DEFAULT_W  = 780;
const H          = 340;
const PAD_SIDE   = 28;
const BAND_GAP   = 4;

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

export function ProportionalBandChart({ severities: rawSeverities = [], colorOffset = 0, onItemClick, numberSystem: rawNumberSystem, testID }: ProportionalBandChartProps) {
  const numberSystem = rawNumberSystem ?? NUMBER_SYSTEM.INTERNATIONAL;
  const [containerRef, W] = useContainerWidth(DEFAULT_W);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverMap = useRef(new Map<string, number>());
  const frameRef = useRef(0);

  const severities = useMemo(
    () => (rawSeverities as unknown[]).filter((s): s is EWSeverityRow => s != null && typeof s === 'object'),
    [rawSeverities],
  );

  const severitiesRef = useRef(severities);
  severitiesRef.current = severities;

  const handleClick = useCallback((id: string, data: TooltipContent | string) => {
    const label = typeof data === 'object' ? (data.label ?? id) : id;
    const sev = severitiesRef.current.find(s => s.severity === id);
    onItemClick?.(id, label, sev?.subentity);
  }, [onItemClick]);

  const { hoveredRef, tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, { width: W, height: H, onClick: onItemClick ? handleClick : undefined });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, W, H);
    frameRef.current = 0;
    const DURATION = 60;

    const total = severities.reduce((s, s2) => s + (s2.count ?? 0), 0);
    const padL = PAD_SIDE;
    const padR = PAD_SIDE;
    const padT = 54;
    const padB = 54;
    const trackW   = W - padL - padR;
    const bandH    = H - padT - padB;
    const gapTotal = Math.max(0, severities.length - 1) * BAND_GAP;
    const bandTrackW = trackW - gapTotal;

    // Proportional widths — sum equals bandTrackW, gaps sit between them
    const segWidths = severities.map(s => ((s.count ?? 0) / (total || 1)) * bandTrackW);
    const color = CHART_PALETTE[colorOffset % CHART_PALETTE.length];
    let raf: number;

    const draw = () => {
      frameRef.current++;
      const T = frameRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.letterSpacing = AXIS_LABEL.letterSpacing;

      const rawP = Math.min(T / DURATION, 1);
      const progress = easeOutQuart(rawP);

      tickHoverProgress(hoverMap.current, hoveredRef.current);
      hitZonesRef.current = [];

      let runX = padL;

      severities.forEach((sev, i) => {
        const fullW = segWidths[i] ?? 0;
        const hp    = hoverMap.current.get(sev.severity) ?? 0;

        const taper    = 0.22;
        const midX     = runX + fullW / 2;
        const topW     = fullW * (1 - taper);

        const drawnFullW = fullW * progress;
        const drawnTopW  = topW  * progress;
        const drawnTopX  = midX - drawnTopW / 2;

        if (drawnFullW > 0) {
          const trapPath = (): void => {
            ctx.beginPath();
            ctx.moveTo(drawnTopX,             padT);
            ctx.lineTo(drawnTopX + drawnTopW, padT);
            ctx.lineTo(runX + drawnFullW,     padT + bandH);
            ctx.lineTo(runX,                  padT + bandH);
            ctx.closePath();
          };

          // 1 — Radial fill: dark transparent center → vivid color at edges
          const midX   = runX + fullW / 2;
          const midY   = padT + bandH / 2;
          const radR   = Math.sqrt((fullW / 2) ** 2 + (bandH / 2) ** 2);
          const radFill = ctx.createRadialGradient(midX, midY, 0, midX, midY, radR);
          radFill.addColorStop(0,    rgb(color, (0.03 + hp * 0.02) * progress));
          radFill.addColorStop(0.5,  rgb(color, (0.12 + hp * 0.04) * progress));
          radFill.addColorStop(1,    rgb(color, (0.28 + hp * 0.08) * progress));
          ctx.save();
          trapPath();
          ctx.clip();
          trapPath();
          ctx.fillStyle = radFill;
          ctx.fill();
          ctx.restore();

          // 3 — 1px border
          trapPath();
          ctx.strokeStyle = rgb(color, 0.9 * progress);
          ctx.lineWidth   = 1;
          ctx.stroke();
        }

        registerHitRect(hitZonesRef.current, sev.severity, runX, padT, fullW, bandH, {
          label: sev.severity,
          value: formatNumber(sev.count ?? 0, 1, numberSystem),
          sublabel: `${Math.round(((sev.count ?? 0) / (total || 1)) * 100)}%`,
          color,
        });

        if (progress > 0.5) {
          const fade = Math.min(1, (progress - 0.5) / 0.5);
          const cx = runX + fullW / 2;
          ctx.globalAlpha = fade;

          // Label above band
          ctx.font      = AXIS_LABEL.font;
          ctx.fillStyle = hp > 0 ? color : rgb(CC.t1, 0.65);
          ctx.textAlign = 'center';
          ctx.fillText(truncateToWidth(ctx, sev.severity, fullW - 8), cx, padT - 14);

          // Value inside band — larger bold font
          ctx.font      = `600 22px 'Satoshi Variable', 'DM Sans', sans-serif`;
          ctx.fillStyle = rgb(CC.t1, 0.92 + hp * 0.08);
          ctx.fillText(formatNumber(sev.count ?? 0, 1, numberSystem), cx, padT + bandH / 2 + 8);

          // Pct below band
          ctx.font      = AXIS_LABEL.font;
          ctx.fillStyle = hp > 0 ? color : rgb(CC.t1, 0.5);
          ctx.fillText(`${Math.round(((sev.count ?? 0) / (total || 1)) * 100)}%`, cx, padT + bandH + 22);
          ctx.globalAlpha = 1;
        }

        runX += fullW + BAND_GAP;
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [severities, W, colorOffset, numberSystem]);

  const isEmpty = severities.length === 0;
  if (isEmpty) return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <ChartEmptyState width={W} height={H} testID={testID} />
    </div>
  );

  return (
    <div ref={containerRef} data-testid={testID} style={{ position: 'relative', width: '100%', height: H }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Early Warning severity distribution — prism spectrum bands"
        style={{ width: '100%', height: H, display: 'block' }}
      />
      <CanvasTooltip {...tooltip} parentW={W} parentH={H} />
    </div>
  );
}
