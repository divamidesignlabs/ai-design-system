import { useRef, useEffect, useMemo, useCallback } from "react";

import { CanvasTooltip } from "../../canvas/CanvasTooltip";
import {
  useCanvasInteraction,
  registerHitRect,
} from "../../canvas/useCanvasInteraction";
import type { TooltipContent } from "../../canvas/useCanvasInteraction";
import { dampedPulse } from "../../canvas/easing";
import {
  CC,
  AXIS_LABEL,
  CHART_VALUE,
  PALETTE,
  rgb,
  drawGlow,
  drawScanline,
  setupCanvas,
} from "../../canvas/canvasUtils";
import { useContainerWidth } from "../../canvas/useContainerWidth";
import { ChartEmptyState } from "../common/ChartEmptyState";
import { formatNumber } from "../../utils/numberFormat";
import type { EWOpenContractorRow } from "../../types";
import type { RankedCardLeaderboardProps } from "./types";

const DEFAULT_W = 780;
const H = 240;
const CARD_PAD = 12;
const CARD_GAP = 10;
const MAX_COLS = 5;

export function RankedCardLeaderboard({
  items: rawItems = [],
  onItemClick,
  testID,
}: RankedCardLeaderboardProps) {
  const [containerRef, W] = useContainerWidth(DEFAULT_W);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const hoverMap = useRef<Map<string, number>>(new Map());

  const items = useMemo(
    () =>
      (rawItems as unknown[]).filter(
        (c): c is EWOpenContractorRow => c != null && typeof c === "object",
      ),
    [rawItems],
  );
  const sorted = [...items]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 5);
  const total = sorted.reduce((s, c) => s + (c.count ?? 0), 0);

  const sortedRef = useRef(sorted);
  sortedRef.current = sorted;

  const handleClick = useCallback((id: string, data: TooltipContent | string) => {
    const label = typeof data === 'object' ? (data.label ?? id) : id;
    const item = sortedRef.current.find(c => c.id === id);
    onItemClick?.(id, label, item?.subentity);
  }, [onItemClick]);

  const cols = Math.min(MAX_COLS, sorted.length);
  const cardW = cols > 0
    ? (W - 2 * CARD_PAD - (cols - 1) * CARD_GAP) / cols
    : (W - 2 * CARD_PAD) / MAX_COLS;

  const { hoveredRef, tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, {
    width: W,
    height: H,
    onClick: onItemClick ? handleClick : undefined,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, W, H);
    frameRef.current = 0;
    const cardH = H * 0.84;
    const cardY = H * 0.08;
    const startX  = CARD_PAD;

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

      sorted.forEach((contractor, i) => {
        const isTop  = i === 0;
        const color  = i === 0 ? CC.red : i === 1 ? CC.amber : PALETTE[i % PALETTE.length];
        const baseX  = startX + i * (cardW + CARD_GAP);
        const hp     = hoverMap.current.get(contractor.id) ?? 0;

        // Symmetric hover expansion — expand by up to 8px (4px each side)
        const expand = hp * 8;
        const x = baseX - expand / 2;
        const w = cardW + expand;

        // Ambient pulsing glow intensity for top card (NOT width — width is hover-driven only)
        const pulse = isTop ? dampedPulse(T, 0.04, 0.0003) * 0.06 + 0.06 : 0;

        // Card background
        ctx.fillStyle = rgb(color, 0.08 + hp * 0.07);
        ctx.beginPath();
        ctx.roundRect(x, cardY, w, cardH, 6);
        ctx.fill();

        // Card border
        ctx.strokeStyle = rgb(color, 0.2 + hp * 0.4 + pulse);
        ctx.lineWidth = isTop ? 1.5 : 1;
        ctx.stroke();

        // Glow — all cards on hover, top card has ambient glow
        if (hp > 0.01 || isTop) {
          drawGlow(
            ctx,
            x + w / 2,
            cardY + cardH / 2,
            w * 0.55,
            color,
            pulse + hp * 0.14,
          );
        }

        // Rank badge top-left
        ctx.font = CHART_VALUE.font;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = rgb(color, 0.5 + hp * 0.35);
        ctx.fillText(`#${i + 1}`, x + 7, cardY + 6);

        // Circular avatar — cap radius so circle never overflows the card
        const photoR = Math.min(cardW * 0.28, cardH * 0.32, 72);
        const photoX = x + w / 2;
        const photoY = cardY + cardH * 0.38;

        const photoGrad = ctx.createRadialGradient(
          photoX,
          photoY - photoR * 0.2,
          0,
          photoX,
          photoY,
          photoR,
        );
        photoGrad.addColorStop(0, rgb(color, 0.5 + hp * 0.2));
        photoGrad.addColorStop(1, rgb(color, 0.2 + hp * 0.1));
        ctx.beginPath();
        ctx.arc(photoX, photoY, photoR, 0, Math.PI * 2);
        ctx.fillStyle = photoGrad;
        ctx.fill();
        ctx.strokeStyle = rgb(color, 0.4 + hp * 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();

        // ShortName inside circle — truncate to fit, show full name in tooltip
        ctx.font = CHART_VALUE.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = rgb(CC.t1, 0.9);
        const fullCircleText = contractor.abbreviation ?? contractor.name ?? '';
        const maxCircleW = photoR * 1.7;
        let circleText = fullCircleText;
        while (ctx.measureText(circleText).width > maxCircleW && circleText.length > 1) {
          circleText = circleText.slice(0, -1);
        }
        if (circleText !== fullCircleText) circleText = circleText.slice(0, -1) + '…';
        ctx.fillText(circleText, photoX, photoY);

        // Show count when present, fall back to label only when count is absent
        const formattedCount = contractor.count != null ? formatNumber(contractor.count) : null;
        const fullVal = contractor.label ?? formattedCount;
        if (fullVal) {
          ctx.font = CHART_VALUE.font;
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = rgb(color, 0.9 + hp * 0.1);
          const maxValW = w - 16;
          let displayVal = fullVal;
          while (ctx.measureText(displayVal).width > maxValW && displayVal.length > 1) {
            displayVal = displayVal.slice(0, -1);
          }
          if (displayVal !== fullVal) displayVal = displayVal.slice(0, -1) + '…';
          ctx.fillText(displayVal, photoX, cardY + cardH * 0.74);
        }


        const pct = Math.round(((contractor.count ?? 0) / (total || 1)) * 100);

        registerHitRect(
          hitZonesRef.current,
          contractor.id,
          baseX,
          cardY,
          cardW,
          cardH,
          {
            label: contractor.name,
            value: `${fullVal} · ${pct}% of total`,
            sublabel: `Rank #${i + 1}`,
            color,
          },
        );
      });

      drawScanline(ctx, W, H, T, 0.015);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [sorted, total, W]);

  const isEmpty = sorted.length === 0;
  if (isEmpty)
    return <ChartEmptyState width={W} height={H} testID={testID} />;

  return (
    <div
      data-testid={testID}
      style={{ position: "relative", width: W, height: H }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Contractor rank — open EW count per contractor"
        style={{ width: W, height: H, display: "block", borderRadius: 8 }}
      />
      <CanvasTooltip {...tooltip} parentW={W} parentH={H} />
    </div>
  );
}
