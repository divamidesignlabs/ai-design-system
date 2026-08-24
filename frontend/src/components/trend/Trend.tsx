import { useRef, useEffect, useMemo, useSyncExternalStore } from 'react';

import { CanvasTooltip } from '../../canvas/CanvasTooltip';
import { useCanvasInteraction, registerHitCircle } from '../../canvas/useCanvasInteraction';
import { easeOutCubic } from '../../canvas/easing';
import { CC, AXIS_LABEL, CHART_PALETTE, UI, rgb, setupCanvas, subscribeThemeChange, getThemeVersion } from '../../canvas/canvasUtils';
import { ChartEmptyState } from '../common/ChartEmptyState';
import { formatNumber } from '../../utils/numberFormat';
import type { QuotationTrendPoint } from '../../types';
import type { TrendProps } from './types';
import './trend.css';

const MIN_W = 680;
const H = 280;
const PAD_L = 80;
const PAD_R = 48; // Increased from 28 to provide adequate space for last point
const MIN_STEP = 64;
const LABEL_FONT = AXIS_LABEL.font;
const LABEL_PAD = 12;
const PI2 = Math.PI * 2;

// Animation shortens as datasets grow — keeps the entry snappy without blocking the thread
const DURATION_BASE = 72;
const MAX_SAMPLE = 20; // max points to measureText for minStep calculation
// Hard cap on canvas pixel width — prevents GPU memory allocation stalls.
// At DPR=2 a 5 000px canvas uses ~22 MB; beyond that allocation blocks the main thread.
const MAX_CANVAS_W = 5000;

export function Trend({ points: rawPoints = [], selectedId, seriesByEntity, colorOffset = 0, xLabel: rawXLabel, yLabel: rawYLabel, valuePrefix: rawValuePrefix, testID, animationEnabled = true }: TrendProps) {
  // Backend chart specs send JSON null for omitted optional strings, and a JS
  // default parameter only fires on undefined — so normalize explicitly or a
  // null leaks into the axis labels as the literal text "null".
  const xLabel = rawXLabel ?? 'Period';
  const yLabel = rawYLabel ?? 'Count';
  const valuePrefix = rawValuePrefix ?? '';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const yAxisRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  // Unlike the other charts, this one stops its rAF loop after the entrance
  // animation and paints labels only on the final frame — so it cannot pick up a
  // palette change on its own. Re-running the draw effect on a theme change is
  // what keeps its ink in step with the theme.
  const themeVersion = useSyncExternalStore(subscribeThemeChange, getThemeVersion, getThemeVersion);

  const activeRaw = selectedId && seriesByEntity?.[selectedId] ? seriesByEntity[selectedId] : rawPoints;

  const points = useMemo(
    () => (activeRaw as unknown[]).filter((p): p is QuotationTrendPoint => p != null && typeof p === 'object'),
    [activeRaw],
  );

  const minStep = useMemo(() => {
    if (points.length <= 1) return MIN_STEP;
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    if (!tmpCtx) return MIN_STEP;
    tmpCtx.font = LABEL_FONT;
    // Sample at most MAX_SAMPLE evenly-spaced points — avoids O(n) measureText for large datasets
    const stride = Math.max(1, Math.ceil(points.length / MAX_SAMPLE));
    const maxLabelW = Math.max(...points.filter((_, i) => i % stride === 0).map(p => tmpCtx.measureText(p.week).width));
    return Math.max(MIN_STEP, maxLabelW + LABEL_PAD);
  }, [points]);

  const padLC = Math.round(minStep / 2);
  // Natural width gives every point its full minStep; cap at MAX_CANVAS_W to avoid
  // multi-hundred-MB GPU allocations that block the main thread for large datasets.
  const naturalW = PAD_R + padLC + Math.max(0, points.length - 1) * minStep;
  const chartCanvasW = Math.max(MIN_W - PAD_L, Math.min(naturalW, MAX_CANVAS_W));

  const { tooltip, hitZonesRef } = useCanvasInteraction(canvasRef, { width: chartCanvasW, height: H });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, chartCanvasW, H);
    const yCtx = yAxisRef.current ? setupCanvas(yAxisRef.current, PAD_L, H) : null;
    frameRef.current = 0;

    const seriesColor = CHART_PALETTE[colorOffset % CHART_PALETTE.length];

    // Scale animation duration down for large datasets so each frame stays cheap
    const DURATION = points.length <= DURATION_BASE
      ? DURATION_BASE
      : Math.max(24, Math.round(DURATION_BASE * (DURATION_BASE / points.length)));

    const padR = PAD_R;
    const padT = 42; // Increased from 30 to provide space for 16px font at top
    const padB = 54;
    const chartW = chartCanvasW - padR;
    const chartH = H - padT - padB;

    // Calculate proper min/max range to handle negative values
    const counts = points.length > 0 ? points.map(p => p.count) : [0];
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const countRange = maxCount - minCount || 1; // Avoid division by zero

    const n = points.length;
    const stepX = n > 1 ? (chartW - padLC) / (n - 1) : 0;
    // Show a label only every labelStride-th point so text never overlaps when compressed.
    const labelStride = Math.max(1, Math.ceil(minStep / stepX));

    // Calculate zero line position for proper baseline when there are negative values
    const hasNegativeValues = minCount < 0;
    const zeroY = hasNegativeValues ? padT + chartH - (-minCount / countRange) * chartH : padT + chartH;

    const singlePointX = padLC + (chartW - padLC) / 2;
    const pts = points.map((p, i) => ({
      x: n === 1 ? singlePointX : padLC + i * stepX,
      y: padT + chartH - (hasNegativeValues
        ? (p.count - minCount) / countRange
        : p.count / (maxCount || 1)) * chartH,
      point: p,
    }));

    // Precision for Y-axis: derive from magnitude of max value so sub-1 decimals render correctly
    const absMax = Math.max(Math.abs(maxCount), Math.abs(minCount));
    const yPrecision = absMax === 0 ? 1
      : absMax < 0.001 ? 5
      : absMax < 0.01  ? 4
      : absMax < 0.1   ? 3
      : absMax < 1     ? 2
      : 1;

    // Draw Y-axis once — it never changes
    if (yCtx) {
      yCtx.clearRect(0, 0, PAD_L, H);
      yCtx.letterSpacing = AXIS_LABEL.letterSpacing;

      // Generate Y-axis labels with proper value formatting
      const labelValues = hasNegativeValues
        ? [minCount, minCount + countRange * 0.25, minCount + countRange * 0.5, minCount + countRange * 0.75, maxCount]
        : [0, maxCount * 0.25, maxCount * 0.5, maxCount * 0.75, maxCount];

      labelValues.forEach((value, index) => {
        const frac = index / (labelValues.length - 1);
        const y = padT + chartH - frac * chartH;
        yCtx.font = AXIS_LABEL.font;
        yCtx.fillStyle = AXIS_LABEL.color;
        yCtx.textAlign = 'right';
        yCtx.fillText(`${valuePrefix}${formatNumber(value, yPrecision)}`, PAD_L - 6, y + 3);
      });

      yCtx.save();
      yCtx.translate(12, padT + chartH / 2);
      yCtx.rotate(-Math.PI / 2);
      yCtx.font = AXIS_LABEL.font;
      yCtx.fillStyle = AXIS_LABEL.color;
      yCtx.textAlign = 'center';
      yCtx.fillText(yLabel, 0, 0);
      yCtx.restore();
    }

    // Cache the area gradient once — creating it inside draw() was doing this every frame
    const areaGrad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    areaGrad.addColorStop(0, rgb(seriesColor, 0.12));
    areaGrad.addColorStop(1, rgb(seriesColor, 0.02));

    const gridFractions = hasNegativeValues
      ? [0, 0.25, 0.5, 0.75, 1.0]
      : [0.25, 0.5, 0.75, 1.0];

    const drawGridAndBaseline = () => {
      ctx.letterSpacing = AXIS_LABEL.letterSpacing;

      gridFractions.forEach(frac => {
        const y = padT + chartH - frac * chartH;
        ctx.strokeStyle = rgb(CC.bd, 0.18);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartW, y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw baseline - use zero line if there are negative values, otherwise bottom
      ctx.strokeStyle = rgb(CC.bd, hasNegativeValues ? 0.5 : 0.3);
      ctx.lineWidth = hasNegativeValues ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(padLC, hasNegativeValues ? zeroY : padT + chartH);
      ctx.lineTo(chartW, hasNegativeValues ? zeroY : padT + chartH);
      ctx.stroke();
    };

    const drawLabels = (upTo: number) => {
      ctx.font = LABEL_FONT;
      ctx.fillStyle = AXIS_LABEL.color;
      ctx.textAlign = 'center';
      for (let i = 0; i < upTo; i++) {
        if (i % labelStride !== 0) continue;
        ctx.fillText(pts[i].point.week, pts[i].x, H - padB + 14);
      }
    };

    if (!animationEnabled) {
      // Instant full-state draw — no entry animation
      drawGridAndBaseline();

      if (n >= 2) {
        const fillBaseline = hasNegativeValues ? zeroY : padT + chartH;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, fillBaseline);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.lineTo(pts[n - 1].x, fillBaseline);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();
      }

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        i === 0 ? ctx.moveTo(pts[i].x, pts[i].y) : ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = rgb(seriesColor, 0.85);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = rgb(seriesColor, 0.8);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.moveTo(pts[i].x + 3.5, pts[i].y);
        ctx.arc(pts[i].x, pts[i].y, 3.5, 0, PI2);
      }
      ctx.fill();

      hitZonesRef.current = [];
      for (let i = 0; i < n; i++) {
        registerHitCircle(hitZonesRef.current, `pt-${i}`, pts[i].x, pts[i].y, 10, {
          label: pts[i].point.week,
          value: `${valuePrefix}${String(pts[i].point.count)}`,
          sublabel: pts[i].point.value != null ? `Queries: ${pts[i].point.value}` : undefined,
          color: seriesColor,
        });
      }

      drawLabels(n);
      return;
    }

    let prevDrawN = 0;
    let raf: number;

    const draw = () => {
      frameRef.current++;
      const rawP = Math.min(frameRef.current / DURATION, 1);
      const progress = easeOutCubic(rawP);
      const isLastFrame = rawP >= 1;

      ctx.clearRect(0, 0, chartCanvasW, H);
      drawGridAndBaseline();

      const drawUpTo = progress * (n - 1);
      const drawN = Math.floor(drawUpTo) + 1;

      // Area fill — reuses cached gradient, fill to zero line instead of bottom when negative values exist
      if (drawN >= 2) {
        const fillBaseline = hasNegativeValues ? zeroY : padT + chartH;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, fillBaseline);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < drawN; i++) {
          const t = drawUpTo - Math.floor(drawUpTo);
          const isLast = i === drawN - 1 && i === Math.ceil(drawUpTo) && t > 0;
          const px = isLast ? pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t : pts[i].x;
          const py = isLast ? pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t : pts[i].y;
          ctx.lineTo(px, py);
        }
        ctx.lineTo(pts[drawN - 1].x, fillBaseline);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();
      }

      // Line stroke
      ctx.beginPath();
      for (let i = 0; i < drawN; i++) {
        const t = drawUpTo - Math.floor(drawUpTo);
        const isLast = i === drawN - 1 && i > 0 && i === Math.ceil(drawUpTo) && t > 0;
        const px = isLast ? pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t : pts[i].x;
        const py = isLast ? pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t : pts[i].y;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rgb(seriesColor, 0.85);
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots — batched into one path+fill instead of N individual arc+fill calls
      ctx.fillStyle = rgb(seriesColor, 0.8);
      ctx.beginPath();
      for (let i = 0; i < drawN; i++) {
        ctx.moveTo(pts[i].x + 3.5, pts[i].y);
        ctx.arc(pts[i].x, pts[i].y, 3.5, 0, PI2);
      }
      ctx.fill();

      // Hit zones — only rebuild when new points become visible, not every frame
      if (drawN > prevDrawN) {
        hitZonesRef.current = [];
        for (let i = 0; i < drawN; i++) {
          registerHitCircle(hitZonesRef.current, `pt-${i}`, pts[i].x, pts[i].y, 10, {
            label: pts[i].point.week,
            value: `${valuePrefix}${String(pts[i].point.count)}`,
            sublabel: pts[i].point.value != null ? `Queries: ${pts[i].point.value}` : undefined,
            color: seriesColor,
          });
        }
        prevDrawN = drawN;
      }

      // Labels (fillText) — deferred to the last frame only to avoid per-frame text rendering
      // on large datasets (500 fillText calls × 60fps is the primary source of lag)
      if (isLastFrame) {
        drawLabels(n);
      }

      if (!isLastFrame) {
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [points, chartCanvasW, minStep, hitZonesRef, colorOffset, animationEnabled, themeVersion]);

  const isEmpty = points.length === 0;
  if (isEmpty) return <ChartEmptyState width={MIN_W} height={H} testID={testID} />;

  return (
    <div data-testid={testID} style={{ width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
        <canvas
          ref={yAxisRef}
          aria-hidden="true"
          style={{ width: PAD_L, height: H, display: 'block', flexShrink: 0 }}
        />
        <div
          className="trend-scroll"
          style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}
        >
          <div style={{ position: 'relative', width: chartCanvasW, height: H }}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Trend chart — count over time"
              style={{ width: chartCanvasW, height: H, display: 'block' }}
            />
            <CanvasTooltip {...tooltip} parentW={chartCanvasW} parentH={H} />
          </div>
        </div>
      </div>
      <div style={{ paddingLeft: PAD_L, textAlign: 'center', fontSize: 16, color: UI.axisLabel, fontFamily: "'Satoshi Variable', 'DM Sans', sans-serif", marginTop: 4 }}>
        {xLabel}
      </div>
    </div>
  );
}
