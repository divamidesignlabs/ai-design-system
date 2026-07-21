import { useRef, useEffect, useCallback } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitRect } from '../../canvas/useCanvasInteraction';
import type { TooltipContent } from '../../canvas/useCanvasInteraction';
import { CC, AXIS_LABEL, rgb, drawGlow, setupCanvas } from '../../canvas/canvasUtils';
import { easeOutBack, easeOutCubic } from '../../canvas/easing';
import type { BalanceScaleChartProps } from './types';

const W = 780;
const H = 420;

export function BalanceScaleChart({ left, right, leftTitle = 'Accepted', rightTitle = 'Submitted', unit = 'quotations', selectedId, dataByEntity, onItemClick, testID }: BalanceScaleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  const activeData  = selectedId && dataByEntity?.[selectedId] ? dataByEntity[selectedId] : { left, right };
  const activeLeft  = activeData.left;
  const activeRight = activeData.right;

  const activeSidesRef = useRef({ left: activeLeft, right: activeRight, leftTitle, rightTitle });
  activeSidesRef.current = { left: activeLeft, right: activeRight, leftTitle, rightTitle };

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const handleClick = useCallback((id: string, data: TooltipContent | string) => {
    const label = typeof data === 'object' ? (data.label ?? id) : id;
    const side = id === 'left' ? activeSidesRef.current.left : activeSidesRef.current.right;
    onItemClick?.(id, label, side?.subentity);
  }, [onItemClick]);

  const { hitZonesRef, tooltip, hoveredRef: _hoveredRef } = useCanvasInteraction(canvasRef, { width: W, height: H, onClick: onItemClick ? handleClick : undefined });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, W, H);
    frameRef.current = 0;
    const DURATION = 80;

    const cx      = W / 2;
    const pivotY  = 100;
    const beamLen = 240;
    const panW    = 99;
    const strLen  = 30;

    const absLeft  = Math.abs(activeLeft.value  ?? 0);
    const absRight = Math.abs(activeRight.value ?? 0);
    const maxVal   = Math.max(absLeft, absRight, 1);
    const rawTilt  = ((activeLeft.value - activeRight.value) / (2 * maxVal)) * 14;
    const tilt     = Math.max(-14, Math.min(14, rawTilt));

    const drawPan = (
      color: string,
      anchorX: number,
      anchorY: number,
      panH: number,
      prog: number,
    ) => {
      const panX = anchorX - panW / 2;
      const panY = anchorY + strLen;
      const r    = [0, 0, 10, 10] as [number, number, number, number];

      // Square inner glow — 4 linear gradients clipped to pan shape
      // gs > half of each dimension ensures full overlap (no dark center gap)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(panX, panY, panW, panH, r);
      ctx.clip();
      const gsX = 25;
      const gsY = 25;
      const c0  = rgb(color, 0.27 * prog);
      const c1  = rgb(color, 0);
      // Left
      const lgL = ctx.createLinearGradient(panX, 0, panX + gsX, 0);
      lgL.addColorStop(0, c0); lgL.addColorStop(1, c1);
      ctx.fillStyle = lgL; ctx.fillRect(panX, panY, gsX, panH);
      // Right
      const lgR = ctx.createLinearGradient(panX + panW, 0, panX + panW - gsX, 0);
      lgR.addColorStop(0, c0); lgR.addColorStop(1, c1);
      ctx.fillStyle = lgR; ctx.fillRect(panX + panW - gsX, panY, gsX, panH);
      // Top
      const lgT = ctx.createLinearGradient(0, panY, 0, panY + gsY);
      lgT.addColorStop(0, c0); lgT.addColorStop(1, c1);
      ctx.fillStyle = lgT; ctx.fillRect(panX, panY, panW, gsY);
      // Bottom
      const lgB = ctx.createLinearGradient(0, panY + panH, 0, panY + panH - gsY);
      lgB.addColorStop(0, c0); lgB.addColorStop(1, c1);
      ctx.fillStyle = lgB; ctx.fillRect(panX, panY + panH - gsY, panW, gsY);
      ctx.restore();

      // Border: 1px solid color, all sides — Figma spec
      ctx.beginPath();
      ctx.roundRect(panX, panY, panW, panH, r);
      ctx.strokeStyle = rgb(color, 1.0 * prog);
      ctx.lineWidth   = 1;
      ctx.stroke();

      // Single thread down, splits into small V only at the last ~10px before pan
      const panCX   = panX + panW / 2;
      const splitY  = panY - 5;
      ctx.strokeStyle = rgb(CC.t2, 0.5 * prog);
      ctx.lineWidth   = 1;
      // Main vertical thread
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY + 4);
      ctx.lineTo(panCX, splitY);
      ctx.stroke();
      // Tiny V split at the bottom
      ctx.beginPath();
      ctx.moveTo(panCX, splitY);
      ctx.lineTo(panCX - 10, panY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(panCX, splitY);
      ctx.lineTo(panCX + 10, panY);
      ctx.stroke();

      // Anchor dot
      ctx.beginPath();
      ctx.arc(anchorX, anchorY, 3, 0, Math.PI * 2);
      ctx.fillStyle = rgb(CC.t2, 0.7 * prog);
      ctx.fill();
    };

    let raf: number;

    const draw = () => {
      frameRef.current++;
      const T = frameRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.letterSpacing = AXIS_LABEL.letterSpacing;
      hitZonesRef.current = [];

      const rawP     = Math.min(T / DURATION, 1);
      const progress = easeOutCubic(rawP);
      const tiltP    = easeOutBack(Math.min(T / DURATION, 1));

      const currentTilt = tilt * tiltP;
      const tiltRad     = (currentTilt * Math.PI) / 180;

      const leftEnd  = { x: cx - Math.cos(tiltRad) * beamLen, y: pivotY + Math.sin(-tiltRad) * beamLen };
      const rightEnd = { x: cx + Math.cos(tiltRad) * beamLen, y: pivotY + Math.sin(tiltRad)  * beamLen };

      // Beam
      ctx.strokeStyle = rgb(CC.t2, 0.55 * progress);
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftEnd.x, leftEnd.y);
      ctx.lineTo(rightEnd.x, rightEnd.y);
      ctx.stroke();

      // Pivot dot (large, on beam)
      drawGlow(ctx, cx, pivotY, 18, CC.t2, 0.14 * progress);
      ctx.beginPath();
      ctx.arc(cx, pivotY, 9 * progress, 0, Math.PI * 2);
      ctx.fillStyle = rgb(CC.t2, 0.85 * progress);
      ctx.fill();

      // Pans
      const leftPanH  = Math.max(20, (absLeft  / maxVal) * 95 * progress);
      const rightPanH = Math.max(20, (absRight / maxVal) * 95 * progress);

      const leftDim  = selectedIdRef.current === 'right' ? 0.6 : 1;
      const rightDim = selectedIdRef.current === 'left'  ? 0.6 : 1;

      drawPan(CC.green, leftEnd.x,  leftEnd.y,  leftPanH,  progress * leftDim);
      drawPan(CC.amber, rightEnd.x, rightEnd.y, rightPanH, progress * rightDim);

      const LABEL_ZONE_H  = 90;
      const leftPanBot    = leftEnd.y  + strLen + leftPanH;
      const rightPanBot   = rightEnd.y + strLen + rightPanH;
      registerHitRect(hitZonesRef.current, 'left',  leftEnd.x  - panW / 2, leftEnd.y  + strLen, panW, leftPanH  + LABEL_ZONE_H, { label: leftTitle,  value: activeLeft.label,  sublabel: `${activeLeft.count} ${unit}`,  color: CC.green }, H, leftEnd.x,  leftPanBot  + 102);
      registerHitRect(hitZonesRef.current, 'right', rightEnd.x - panW / 2, rightEnd.y + strLen, panW, rightPanH + LABEL_ZONE_H, { label: rightTitle, value: activeRight.label, sublabel: `${activeRight.count} ${unit}`, color: CC.amber }, H, rightEnd.x, rightPanBot + 102);

      // Labels
      if (progress > 0.5) {
        const fade  = Math.min(1, (progress - 0.5) / 0.5);
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';

        const leftPanBottom  = leftEnd.y  + strLen + leftPanH  + 14;
        const rightPanBottom = rightEnd.y + strLen + rightPanH + 14;

        // Left value + sub-label
        ctx.globalAlpha = fade * leftDim;
        ctx.font      = `700 34px 'Satoshi Variable', 'DM Sans', sans-serif`;
        ctx.fillStyle = CC.t1;
        ctx.fillText(activeLeft.label, leftEnd.x, leftPanBottom);
        ctx.font      = AXIS_LABEL.font;
        ctx.fillStyle = AXIS_LABEL.color;
        ctx.fillText(`${leftTitle} ${activeLeft.count} ${unit}`, leftEnd.x, leftPanBottom + 42);

        // Right value + sub-label
        ctx.globalAlpha = fade * rightDim;
        ctx.font      = `700 34px 'Satoshi Variable', 'DM Sans', sans-serif`;
        ctx.fillStyle = CC.t1;
        ctx.fillText(activeRight.label, rightEnd.x, rightPanBottom);
        ctx.font      = AXIS_LABEL.font;
        ctx.fillStyle = AXIS_LABEL.color;
        ctx.fillText(`${rightTitle} ${activeRight.count} ${unit}`, rightEnd.x, rightPanBottom + 42);

        ctx.globalAlpha  = 1;
        ctx.textBaseline = 'alphabetic';
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [activeLeft, activeRight]);

  return (
    <div data-testid={testID} style={{ position: 'relative', width: '100%', maxWidth: W }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Quotation balance — accepted vs submitted quotation value"
        style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block', borderRadius: 8 }}
      />
      <CanvasTooltip {...tooltip} parentW={W} parentH={H} />
    </div>
  );
}
