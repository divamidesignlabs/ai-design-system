import { useRef, useEffect, useCallback } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitRect } from '../../canvas/useCanvasInteraction';
import { setupCanvas, GRAD_PALETTE } from '../../canvas/canvasUtils';
import { CC, AXIS_LABEL, LEGEND_LABEL, rgb, drawGlow } from '../../canvas/canvasUtils';
import { easeOutBack, easeOutCubic } from '../../canvas/easing';
import { formatNumber } from '../../utils/numberFormat';
import type { SemiCircularGaugeChartProps } from './types';

const W = 480;
const H = 310;
const LINE_H = 18;


function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function SemiCircularGaugeChart({ confirmed, total, label, colorOffset = 0, selectedId, selectedLabel, gaugeByEntity, onItemClick, subentity, testID }: SemiCircularGaugeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  const activeData      = selectedId && gaugeByEntity?.[selectedId] ? gaugeByEntity[selectedId] : { confirmed, total };
  const activeConfirmed = activeData.confirmed;
  const activeTotal     = activeData.total;

  const handleClick = useCallback(() => {
    onItemClick?.('confirmed', label ?? 'confirmed', subentity);
  }, [onItemClick, label, subentity]);

  const { tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, {
    width: W, height: H,
    onClick: onItemClick ? handleClick : undefined,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, W, H);
    frameRef.current = 0;

    const [colorDark, color] = GRAD_PALETTE[colorOffset % GRAD_PALETTE.length];

    const DURATION = 80;
    const NEEDLE_DURATION = 72;

    const cx = W / 2;
    const cy = 175;
    const TRACK_R = 148; // outer dim track arc
    const ARC_R   = 133; // inner colored arc — ~5px gap between them
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;
    const totalSpan = Math.PI; // semicircle

    let raf: number;

    const draw = () => {
      frameRef.current++;
      const T = frameRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.letterSpacing = AXIS_LABEL.letterSpacing;
      hitZonesRef.current = [];

      // Register the semicircle bounding box as the single click target
      registerHitRect(hitZonesRef.current, 'confirmed', cx - TRACK_R, cy - TRACK_R, TRACK_R * 2, TRACK_R, {
        label: label ?? 'Confirmed',
        value: `${formatNumber(activeConfirmed ?? 0)} / ${formatNumber(activeTotal ?? 0)}`,
        sublabel: `${Math.round(((activeConfirmed ?? 0) / (activeTotal || 1)) * 100)}%`,
        color,
      });

      const rawP    = Math.min(T / DURATION, 1);
      const progress = easeOutCubic(rawP);
      const needleP  = easeOutBack(Math.min(T / NEEDLE_DURATION, 1));

      const safeValue = Math.round(((activeConfirmed ?? 0) / (activeTotal || 1)) * 100);
      const fillAngle = startAngle + (safeValue / 100) * totalSpan * progress;

      // ── Dim track — full semicircle background ──────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, TRACK_R, startAngle, endAngle);
      ctx.strokeStyle = rgb(color, 0.28);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';

      // ── Dark sector fill — inside the gap between track and center ───────────
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, ARC_R, startAngle, fillAngle);
      ctx.closePath();
      ctx.fillStyle = rgb(colorDark, 0.35 * progress);
      ctx.fill();

      // ── Colored fill painted ON the track — same TRACK_R, paints over dim ───
      const tipX = cx + Math.cos(fillAngle) * TRACK_R;
      const tipY = cy + Math.sin(fillAngle) * TRACK_R;
      drawGlow(ctx, tipX, tipY, 10, color, 0.3 * progress);
      const arcGrad = ctx.createLinearGradient(
        cx + Math.cos(startAngle) * TRACK_R, cy + Math.sin(startAngle) * TRACK_R,
        tipX, tipY,
      );
      arcGrad.addColorStop(0, rgb(colorDark, 0.9 * progress));
      arcGrad.addColorStop(1, rgb(color,     1.0 * progress));
      ctx.beginPath();
      ctx.arc(cx, cy, TRACK_R, startAngle, fillAngle);
      ctx.strokeStyle = arcGrad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';

      // ── Needle — tapered polygon, tip at ARC_R, tail 24px past pivot ────────
      const needleAngle = startAngle + (safeValue / 100) * totalSpan * needleP;
      const nTipX  = cx + Math.cos(needleAngle) * ARC_R;
      const nTipY  = cy + Math.sin(needleAngle) * ARC_R;
      const TAIL   = 24;
      const tailX  = cx - Math.cos(needleAngle) * TAIL;
      const tailY  = cy - Math.sin(needleAngle) * TAIL;

      const perpX = -Math.sin(needleAngle);
      const perpY =  Math.cos(needleAngle);
      const HW    = 2.5 * needleP;

      ctx.beginPath();
      ctx.moveTo(nTipX, nTipY);
      ctx.lineTo(cx    + perpX * HW,  cy    + perpY * HW);
      ctx.lineTo(tailX + perpX * 1,   tailY + perpY * 1);
      ctx.lineTo(tailX - perpX * 1,   tailY - perpY * 1);
      ctx.lineTo(cx    - perpX * HW,  cy    - perpY * HW);
      ctx.closePath();
      ctx.fillStyle = rgb(CC.t1, needleP);
      ctx.fill();

      // ── Pivot — white circle + teal ring ─────────────────────────────────────
      // Teal outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.strokeStyle = rgb(color, 0.85 * needleP);
      ctx.lineWidth   = 2;
      ctx.stroke();

      // White fill
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fillStyle = CC.t1;
      ctx.fill();

      // ── 0% / 50% / 100% labels only ────────────────────────────────────────
      [[0, '0%'], [0.5, '50%'], [1, '100%']].forEach(([frac, lbl]) => {
        const a   = startAngle + (frac as number) * totalSpan;
        const offset = frac === 1 ? TRACK_R + 36 : TRACK_R + 20;
        const lx  = cx + Math.cos(a) * offset;
        const ly  = cy + Math.sin(a) * offset;
        ctx.font      = AXIS_LABEL.font;
        ctx.fillStyle = AXIS_LABEL.color;
        ctx.textAlign = 'center';
        ctx.fillText(lbl as string, lx, ly + 4);
      });

      // ── Percentage — below center ────────────────────────────────────────────
      if (progress > 0.4) {
        const fade = Math.min(1, (progress - 0.4) / 0.4);
        ctx.globalAlpha = fade;
        ctx.font      = `700 32px 'Satoshi Variable', 'DM Sans', sans-serif`;
        ctx.fillStyle = CC.t1;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(safeValue * needleP)}%`, cx, cy + 72);
        ctx.globalAlpha = 1;
      }

      // ── Stats text ───────────────────────────────────────────────────────────
      if (progress > 0.7 && label) {
        const fade = Math.min(1, (progress - 0.7) / 0.3);
        ctx.globalAlpha = fade;
        ctx.font      = LEGEND_LABEL.font;
        ctx.fillStyle = LEGEND_LABEL.color;
        ctx.textAlign = 'center';
        const statsText = `${formatNumber(activeConfirmed ?? 0)} of ${formatNumber(activeTotal ?? 0)} ${label}`;
        wrapText(ctx, statsText, W - 40).forEach((line, i) => {
          ctx.fillText(line, cx, cy + 112 + i * LINE_H);
        });
        ctx.globalAlpha = 1;
      }


      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [activeConfirmed, activeTotal, label, colorOffset, selectedId, selectedLabel]);

  return (
    <div data-testid={testID} style={{ position: 'relative', width: '100%', maxWidth: W, margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Compensation event gauge — ${Math.round(((activeConfirmed ?? 0) / (activeTotal || 1)) * 100)}% of NCEs confirmed as compensation events`}
        style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block' }}
      />
      <CanvasTooltip {...tooltip} parentW={W} parentH={H} />
    </div>
  );
}
