import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { VisualizationRenderer } from '../visualizationRenderer/VisualizationRenderer';
import type { BaseVisualizationConfig, VisualizationGroupProps, SubentityPayload } from '../../types';
import { CHART_TYPE } from '../../constants';
import arrowClockwiseIcon from '../../assets/ArrowClockwise.svg';
import './VisualizationGroup.css';

function normalizeId(id: string): string {
  return id.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function hasUsableSubentity(subentity: unknown): boolean {
  return subentity != null && (Array.isArray(subentity) ? subentity.length > 0 : true);
}

// Mirrors the backend's BROADCAST_LIST_FIELDS/BROADCAST_DICT_FIELDS contract
// (chart_config.py): most charts carry drill-down rows under "items"; balance-scale
// carries them under "left"/"right"; semi-circular-gauge carries "subentity" directly.
function configHasAnySubentity(config: BaseVisualizationConfig): boolean {
  const c = config as unknown as Record<string, unknown>;
  if (hasUsableSubentity(c.subentity)) return true;
  for (const dictField of ['left', 'right']) {
    const side = c[dictField] as Record<string, unknown> | undefined;
    if (side && hasUsableSubentity(side.subentity)) return true;
  }
  const items = c.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && typeof item === 'object' && hasUsableSubentity((item as Record<string, unknown>).subentity)) {
        return true;
      }
    }
  }
  return false;
}

const W = 56;   // connector column width (px)

export function VisualizationGroup({ items, colorOffset = 0, title, 'data-testid': testID }: VisualizationGroupProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(undefined);
  const [listenerItems, setListenerItems] = useState<SubentityPayload | null>(null);
  const [broadcasterIndex, setBroadcasterIndex] = useState<number | null>(null);
  const [connectorY, setConnectorY] = useState<number | null>(null);
  const [connectorX, setConnectorX] = useState<number | null>(null);
  const [sourceY, setSourceY] = useState<number | null>(null);
  const [containerH, setContainerH] = useState<number>(0);
  const [containerW, setContainerW] = useState<number>(0);
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const broadcasterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barYInCanvasRef = useRef<number | null>(null);
  const barXInCanvasRef = useRef<number | null>(null);
  const sourceYInCanvasRef = useRef<number | null>(null);

  useEffect(() => {
    const container = chartsContainerRef.current;
    if (!container) return;
    const handler = (e: Event) => {
      const { centerClientY, centerClientX, sourceClientY } = (e as CustomEvent<{ centerClientY: number; centerClientX: number; sourceClientY?: number }>).detail;
      const rect = container.getBoundingClientRect();
      const canvas = e.target as HTMLCanvasElement;
      const canvasRect = canvas.getBoundingClientRect();
      broadcasterCanvasRef.current = canvas;
      barYInCanvasRef.current = centerClientY - canvasRect.top;
      barXInCanvasRef.current = centerClientX - canvasRect.left;
      sourceYInCanvasRef.current = sourceClientY != null ? sourceClientY - canvasRect.top : null;
      setConnectorY(centerClientY - rect.top);
      setConnectorX(centerClientX - rect.left);
      setSourceY(sourceClientY != null ? sourceClientY - rect.top : null);
      setContainerH(rect.height);
      setContainerW(rect.width);
    };
    container.addEventListener('viz-item-click', handler);
    return () => container.removeEventListener('viz-item-click', handler);
  }, []);

  useLayoutEffect(() => {
    if (!listenerItems || broadcasterCanvasRef.current === null || barYInCanvasRef.current === null) return;
    const container = chartsContainerRef.current;
    if (!container) return;
    const canvas = broadcasterCanvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setConnectorY(canvasRect.top - containerRect.top + barYInCanvasRef.current);
    if (barXInCanvasRef.current !== null) {
      setConnectorX(canvasRect.left - containerRect.left + barXInCanvasRef.current);
    }
    if (sourceYInCanvasRef.current !== null) {
      setSourceY(canvasRect.top - containerRect.top + sourceYInCanvasRef.current);
    }
    setContainerH(containerRect.height);
    setContainerW(containerRect.width);
  }, [listenerItems]);

  const handleItemClick = useCallback((chartIndex: number, id: string, label: string, subentity?: SubentityPayload) => {
    const hasSubentity = subentity != null && (Array.isArray(subentity) ? subentity.length > 0 : true);
    if (!hasSubentity) return;

    const normId = normalizeId(id);
    setSelectedId((prev) => {
      const next = prev === normId ? undefined : normId;
      setSelectedLabel(next ? label : undefined);
      if (next) {
        setBroadcasterIndex(chartIndex);
        setListenerItems(subentity!);
      } else {
        setListenerItems(null);
        setBroadcasterIndex(null);
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSelectedId(undefined);
    setSelectedLabel(undefined);
    setListenerItems(null);
    setBroadcasterIndex(null);
    setConnectorY(null);
    setConnectorX(null);
    setSourceY(null);
    broadcasterCanvasRef.current = null;
    barYInCanvasRef.current = null;
    barXInCanvasRef.current = null;
    sourceYInCanvasRef.current = null;
  }, []);

  const hasDrilldownData = items.some(configHasAnySubentity);
  const isActive = broadcasterIndex !== null && connectorY !== null;
  const lineY = connectorY ?? containerH / 2;

  // connectorLeft = width of each chart div (flex: 1 1 0 among N charts, N-1 connectors)
  const numConnectors = items.length - 1;
  const connectorLeft = containerW > 0 ? (containerW - numConnectors * W) / items.length : null;
  const isBalanceScaleBroadcaster = (idx: number) =>
    isActive && broadcasterIndex === idx && items[idx]?.type === CHART_TYPE.BALANCE_SCALE;

  // Route SVG is rendered on the container (container-relative coords), not inside the broadcaster div
  const isRouting = broadcasterIndex !== null &&
    items[broadcasterIndex]?.type === CHART_TYPE.BALANCE_SCALE &&
    isActive && connectorX !== null && sourceY !== null && connectorLeft !== null;

  return (
    <div className="viz-group" data-testid={testID}>
      {title && <div className="viz-group__title">{title}</div>}
      <div className="viz-group__bar">
        {selectedId ? (
          <button
            type="button"
            className="viz-group__reset-btn"
            onClick={handleReset}
            aria-label="Reset selection"
          >
            <img src={arrowClockwiseIcon} alt="" className="viz-group__reset-icon" />
            Reset
          </button>
        ) : hasDrilldownData ? (
          <span className="viz-group__hint">
            ↑ Click a row to drill down
          </span>
        ) : null}
      </div>
      <div ref={chartsContainerRef} className="viz-group__charts">
        {items.flatMap((config: BaseVisualizationConfig, i: number) => {
          const isListener = broadcasterIndex !== null ? i !== broadcasterIndex : i === items.length - 1;
          const showRouting = isBalanceScaleBroadcaster(i) && connectorX !== null && sourceY !== null && connectorLeft !== null;
          const chart = (
            <div key={i} className={`viz-group__chart viz-group__chart--${config.type}${isListener ? ' viz-group__chart--listener' : ''}`}>
              {isListener && (
                <div className="viz-group__listener-label">
                  {broadcasterIndex !== null ? selectedLabel : null}
                </div>
              )}
              <VisualizationRenderer
                config={config}
                colorOffset={colorOffset + i}
                onItemClick={broadcasterIndex !== null && isListener ? undefined : (id, label, subentity) => handleItemClick(i, id, label, subentity)}
                selectedId={selectedId}
                listenerItems={i !== broadcasterIndex && listenerItems ? listenerItems : undefined}
              />
            </div>
          );
          if (i === items.length - 1) return [chart];

          const isReversed = broadcasterIndex !== null && broadcasterIndex > i;
          const dotX  = isReversed ? -0.7 : W + 0.7;
          const tickX = connectorX !== null && connectorLeft !== null
            ? connectorX - connectorLeft
            : (isReversed ? W + 20 : -20);
          // When the L-shaped route SVG already covers the segment from the broadcaster
          // to the connector column entrance, start the connector path at the column edge
          // (x=0) to avoid double-drawing that causes broken/fragmented dashes.
          const pathStartX = showRouting ? (isReversed ? W : 0) : tickX;
          const path  = `M ${pathStartX} ${lineY} H ${dotX}`;

          const connector = (
            <div
              key={`connector-${i}`}
              className={`viz-group__connector${isActive ? ' viz-group__connector--active' : ''}`}
            >
              <svg
                className="viz-group__connector-svg"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {!showRouting && (
                  <line
                    x1={tickX} y1={lineY - 7}
                    x2={tickX} y2={lineY + 7}
                    className="viz-group__connector-tick"
                  />
                )}
                <path d={path} className="viz-group__connector-path" />
                <circle cx={dotX} cy={lineY} r="4" className="viz-group__connector-dot" />
              </svg>
            </div>
          );
          return [chart, connector];
        })}
        {isRouting && (
          <svg
            className="viz-group__route-svg"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <line
              x1={connectorX! - 7} y1={sourceY!}
              x2={connectorX! + 7} y2={sourceY!}
              className="viz-group__connector-tick"
            />
            <path
              d={`M ${connectorX} ${sourceY} L ${connectorX} ${lineY} H ${connectorLeft!}`}
              className="viz-group__connector-path"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
