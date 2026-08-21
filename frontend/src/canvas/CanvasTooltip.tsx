import { useLayoutEffect, useRef } from 'react';
import type { TooltipContent, TooltipState } from './useCanvasInteraction';
import { UI } from './canvasUtils';

interface CanvasTooltipProps extends TooltipState {
  parentW?: number;
  parentH?: number;
}


/**
 * DOM-based tooltip overlay for canvas visualizations.
 * Render as a sibling inside a position:relative wrapper around the canvas.
 * Dynamic position is applied imperatively via useLayoutEffect to avoid
 * inline style props while still updating each frame.
 */
export function CanvasTooltip({ visible, x, y, content, parentW, parentH }: CanvasTooltipProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const elW = el.offsetWidth;
    const elH = el.offsetHeight;
    const GAP = 14;
    const maxW = parentW ?? 400;
    const maxH = parentH ?? 800;

    // Default: upper-right of cursor
    let tx = x + GAP;
    let ty = y - elH - GAP;

    // Flip horizontally if right edge overflows
    if (tx + elW > maxW - 4) tx = x - elW - GAP;
    // Flip vertically if top edge overflows
    if (ty < 4) ty = y + GAP;

    // Hard clamp so tooltip never exits the canvas
    if (tx < 4) tx = 4;
    if (ty + elH > maxH - 4) ty = maxH - elH - 4;

    el.style.transform = `translate(${tx}px, ${ty}px)`;
    el.style.opacity = visible ? '1' : '0';

    // A series colour wins when the hovered item carries one; otherwise fall
    // back to the palette default as a var() reference rather than a resolved
    // value, so the accent bar follows a theme change even if the pointer never
    // moves again (this effect only re-runs on hover).
    const accent =
      content && typeof content === 'object' && (content as TooltipContent).color
        ? (content as TooltipContent).color
        : UI.blue;
    el.style.setProperty('--tooltip-accent', accent ?? UI.blue);
  }, [visible, x, y, parentW, content]);

  if (!content) return null;

  const isObj = typeof content === 'object';
  const label = isObj ? (content as TooltipContent).label : null;
  const value = isObj ? (content as TooltipContent).value : (content as string);
  const sublabel = isObj ? (content as TooltipContent).sublabel : null;

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        minWidth: 80,
        pointerEvents: 'none',
        background: UI.surface,
        border: `1px solid ${UI.border}`,
        borderLeft: `2px solid var(--tooltip-accent)`,
        borderRadius: 6,
        padding: '8px 12px',
        opacity: 0,
        transition: 'opacity 0.15s ease',
        zIndex: 20,
        fontFamily: "'Satoshi Variable', 'DM Sans', sans-serif",
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: UI.text2,
            marginBottom: 3,
            whiteSpace: 'nowrap',
            lineHeight: '20px',
          }}
        >
          {label}
        </div>
      )}
      {value && (
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: UI.text1,
            whiteSpace: 'nowrap',
            lineHeight: '22px',
          }}
        >
          {value}
        </div>
      )}
      {sublabel && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--tooltip-accent)',
            marginTop: 3,
            whiteSpace: 'nowrap',
            lineHeight: '20px',
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
