import { useRef, useState, useEffect, useCallback } from 'react';

export interface TooltipContent {
  label?: string;
  value?: string;
  sublabel?: string;
  color?: string;
}

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: TooltipContent | string | null;
}

interface HitZone {
  id: string;
  data: TooltipContent | string;
  centerY: number;
  centerX: number;
  sourceY?: number;
  test: (x: number, y: number) => boolean;
}

interface MouseState {
  x: number;
  y: number;
  over: boolean;
}

interface UseCanvasInteractionOptions {
  width: number;
  height: number;
  onClick?: (id: string, data: TooltipContent | string) => void;
  enabled?: boolean;
}

interface UseCanvasInteractionReturn {
  mouseRef: React.MutableRefObject<MouseState>;
  hoveredRef: React.MutableRefObject<string | null>;
  tooltip: TooltipState;
  showTooltip: (x: number, y: number, content: TooltipContent | string) => void;
  hideTooltip: () => void;
  hitZonesRef: React.MutableRefObject<HitZone[]>;
}

/**
 * Canvas interaction hook — mouse tracking, hit-testing, tooltip, click.
 * Uses refs (not state) for mouse position to avoid 60 re-renders/sec.
 * Ported from enterprise-brain/src/hooks/useCanvasInteraction.js
 */
export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  { width, height, onClick, enabled = true }: UseCanvasInteractionOptions,
): UseCanvasInteractionReturn {
  const mouseRef = useRef<MouseState>({ x: -1, y: -1, over: false });
  const hoveredRef = useRef<string | null>(null);
  const hitZonesRef = useRef<HitZone[]>([]);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  const showTooltip = useCallback((x: number, y: number, content: TooltipContent | string) => {
    setTooltip({ visible: true, x, y, content });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(prev =>
      prev.visible
        ? { visible: false, x: prev.x, y: prev.y, content: prev.content }
        : prev,
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      mouseRef.current.x = (e.clientX - rect.left) * scaleX;
      mouseRef.current.y = (e.clientY - rect.top) * scaleY;
      mouseRef.current.over = true;

      let found: HitZone | null = null;
      const zones = hitZonesRef.current;
      for (let i = zones.length - 1; i >= 0; i--) {
        if (zones[i].test(mouseRef.current.x, mouseRef.current.y)) {
          found = zones[i];
          break;
        }
      }

      const prevId = hoveredRef.current;
      hoveredRef.current = found ? found.id : null;
      canvas.style.cursor = found ? 'pointer' : 'default';

      if (found) {
        showTooltip(
          (e.clientX - rect.left) * scaleX,
          (e.clientY - rect.top) * scaleY,
          found.data,
        );
      } else if (prevId) {
        hideTooltip();
      }
    };

    const handleLeave = () => {
      mouseRef.current = { x: -1, y: -1, over: false };
      hoveredRef.current = null;
      canvas.style.cursor = 'default';
      hideTooltip();
    };

    const handleClick = () => {
      if (hoveredRef.current && onClick) {
        const zone = hitZonesRef.current.find(z => z.id === hoveredRef.current);
        if (zone) {
          const rect = canvas.getBoundingClientRect();
          const centerClientY = rect.top  + zone.centerY * (rect.height / height);
          const centerClientX = rect.left + zone.centerX * (rect.width  / width);
          const sourceClientY = zone.sourceY != null
            ? rect.top + zone.sourceY * (rect.height / height)
            : undefined;
          canvas.dispatchEvent(new CustomEvent('viz-item-click', {
            bubbles: true,
            detail: { centerClientY, centerClientX, sourceClientY },
          }));
          onClick(zone.id, zone.data);
        }
      }
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [canvasRef, width, height, enabled, onClick, showTooltip, hideTooltip]);

  return { mouseRef, hoveredRef, tooltip, showTooltip, hideTooltip, hitZonesRef };
}

// --- Hit zone registration helpers ---

export function registerHitCircle(
  zones: HitZone[],
  id: string,
  cx: number,
  cy: number,
  radius: number,
  data: TooltipContent | string,
  centerXOverride?: number,
): void {
  zones.push({
    id,
    data,
    centerY: cy,
    centerX: centerXOverride ?? cx,
    test: (mx, my) => (mx - cx) ** 2 + (my - cy) ** 2 <= radius * radius,
  });
}

export function registerHitRect(
  zones: HitZone[],
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  data: TooltipContent | string,
  centerYOverride?: number,
  centerXOverride?: number,
  sourceYOverride?: number,
): void {
  zones.push({
    id,
    data,
    centerY: centerYOverride ?? y + h / 2,
    centerX: centerXOverride ?? x + w / 2,
    sourceY: sourceYOverride,
    test: (mx, my) => mx >= x && mx <= x + w && my >= y && my <= y + h,
  });
}
