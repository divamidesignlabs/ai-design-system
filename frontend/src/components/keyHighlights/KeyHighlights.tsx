import type React from 'react';
import { CC } from '../../canvas/canvasUtils';
import type { KeyHighlightBlock, KeyHighlightChip, KeyHighlightBadge, KeyHighlightDot, ScorecardRow, FlagsListRow, ComparisonRow } from '../../types';

// ─── Shared palette & fonts ──────────────────────────────────────────────────
const C = {
  bg:     'transparent',
  border: 'transparent',
  t1:     CC.t1,
  t2:     CC.t2,
  t3:     CC.t3,
  t4:     CC.t4,
  red:    CC.red,
  amber:  CC.amber,
  green:  CC.green,
} as const;

const SANS = "'Satoshi Variable', 'DM Sans', sans-serif";

// Typography spec — Display xs / Medium — applied to value text
const VALUE: React.CSSProperties = {
  color:      '#F7F7F7',
  fontFamily: SANS,
  fontSize:   24,
  fontWeight: 500,
  lineHeight: '32px',
};

// Typography spec — Text sm / Regular — applied to label/description text
const LABEL: React.CSSProperties = {
  color:      '#B3B5B6',
  fontFamily: SANS,
  fontSize:   18,
  fontWeight: 400,
  lineHeight: '20px',
};

// ─── ChipRow — shared small chip row used by several block types ─────────────
function ChipRow({ chips = [] }: { chips: KeyHighlightChip[] }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
      {chips.map((chip, i) => (
        <div
          key={i}
          style={{
            width: 260, height: 80, display: 'flex', alignItems: 'baseline', gap: 8,
            padding: '10px 0px',
            background: C.bg,
            border: `1px solid ${C.border}`,
            rowGap: 16,
            borderRadius: 5,
            boxSizing: 'border-box' as const,
          }}
        >
          <span style={{ ...VALUE, color:  C.t1 }}>
            {chip.value}
          </span>
          <span style={{ ...LABEL, flex: 1 }}>
            {chip.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stats ───────────────────────────────────────────────────────────────────
// 3 equal tiles — large number, small label, colored top border
// Used for: Q1, Q11, Q12
function Stats({ items = [] }: { items: Array<{ value: string; label: string; sublabel?: string; color?: string; icon?: string }> }) {
  const visible = items.filter(item => item.value);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 20 }}>
      {visible.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex', flexDirection: 'row' as const,
            justifyContent: 'space-between', alignItems: 'center',
            width: 286, minHeight: 129, padding: '20px 16px',
            flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.20)',
            background: 'rgba(255,255,255,0.05)',
            boxShadow: '3.42px 3.42px 3.42px 0px rgba(0,0,0,0.30)',
            boxSizing: 'border-box' as const,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 24, flex: 1, minWidth: 0 }}>
            <div style={{ ...VALUE, color: '#FFFFFF' }}>
              {item.value}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
              <div style={{ ...LABEL, color: 'rgba(255,255,255,0.70)' }}>
                {item.label}
              </div>
              {item.sublabel && (
                <div style={{ ...LABEL, fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
                  {item.sublabel}
                </div>
              )}
            </div>
          </div>
          {item.icon && (
            <div style={{ width: 60, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={item.icon} width={60} height={60} alt="" style={{ objectFit: 'contain' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Ranked ──────────────────────────────────────────────────────────────────
// Name chip + value + description rows — each with colored left border
// Used for: Q2, Q5, Q6
function Ranked({ items = [] }: { items: Array<{ name: string; value: string; kpiLabel?: string }> }) {
  const visible = items.filter(item => item.name ?? item.value);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
      {visible.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0px',
            background: C.bg,
            border: `1px solid ${C.border}`,
          }}
        >
          <span
            style={{
              fontSize: 18, fontWeight: 500, color: C.t2,
              background: 'transparent', padding: '2px 8px',
              borderRadius: 4, fontFamily: SANS, flexShrink: 0,
            }}
          >
            {item.name}
          </span>
          <span style={{ ...VALUE, fontSize: 18, color: C.t1, minWidth: 70, flexShrink: 0 }}>
            {item.value}
          </span>
          <span style={{ ...LABEL, flex: 1 }}>
            {item.kpiLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Chips ───────────────────────────────────────────────────────────────────
// Large value callout cards — value prominent, label below
// Used for: Q4, Q8
function Chips({ items = [] }: { items: KeyHighlightChip[] }) {
  const visible = items.filter(item => item.value);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 20 }}>
      {visible.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex', flexDirection: 'row' as const,
            justifyContent: 'space-between', alignItems: 'center',
            width: 286, minHeight: 129, padding: '20px 16px',
            flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.20)',
            background: 'rgba(255,255,255,0.05)',
            boxShadow: '3.42px 3.42px 3.42px 0px rgba(0,0,0,0.30)',
            boxSizing: 'border-box' as const,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 24, flex: 1, minWidth: 0 }}>
            <div style={{ ...VALUE, color: '#FFFFFF' }}>
              {item.value}
            </div>
            <div style={{ ...LABEL, color: 'rgba(255,255,255,0.70)' }}>
              {item.label}
            </div>
          </div>
          {item.icon && (
            <div style={{ width: 60, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={item.icon} width={60} height={60} alt="" style={{ objectFit: 'contain' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────
// Severity-colored badge rows — red / amber / green
// Used for: Q7, Q9
const BADGE_COLOR: Record<KeyHighlightBadge['severity'], string> = {
  red:   C.red,
  amber: C.amber,
  green: C.green,
};

function Badges({ items = [] }: { items: KeyHighlightBadge[] }) {
  const visible = items.filter(item => item.text);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
      {visible.map((item, i) => {
        const _color = BADGE_COLOR[item.severity];
        return (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 0px',
              background: C.bg,
              border: `1px solid ${C.border}`,
            }}
          >
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%', background: CC.t2,
                flexShrink: 0, marginTop: 5,
              }}
            />
            <span style={{ ...LABEL , color: '#B3B5B6'}}>
              {item.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── DotStrip ────────────────────────────────────────────────────────────────
// Contractors as colored dots on a min→max range track
// Labels alternate above/below to avoid crowding at the high end
// Used for: Q3
function DotStrip({ min, max, unit, dots = [], chips = [] }: {
  min: number; max: number; unit: string;
  dots: KeyHighlightDot[];
  chips?: KeyHighlightChip[];
}) {
  const visibleDots = dots.filter(d => d.name);
  if (visibleDots.length === 0) return null;
  const range = max - min;
  return (
    <div>
      <div style={{ position: 'relative' as const, height: 90, padding: '10px 0px' }}>
        {/* Track line */}
        <div
          style={{
            position: 'absolute' as const, top: 38, left: 8, right: 8,
            height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1,
          }}
        />
        {/* Min / max labels */}
        <div style={{ position: 'absolute' as const, top: 43, left: 0, fontSize: 16, color: C.t4, fontFamily: SANS }}>
          {min}{unit}
        </div>
        <div style={{ position: 'absolute' as const, top: 43, right: 0, fontSize: 16, color: C.t4, fontFamily: SANS }}>
          {max}{unit}
        </div>
        {/* Dots */}
        {visibleDots.map((dot, i) => {
          const pct = ((dot.val - min) / range) * 100;
          const dotColor = dot.color ?? CC.blue;
          const above = i % 2 === 0; // alternate label side to reduce crowding
          return (
            <div
              key={i}
              style={{
                position: 'absolute' as const,
                left: `${pct}%`,
                top: 0,
                transform: 'translateX(-50%)',
              }}
            >
              {above && (
                <div style={{ textAlign: 'center' as const, marginBottom: 2 }}>
                  <div style={{ fontSize: 18, color: dotColor, fontFamily: SANS, whiteSpace: 'nowrap' as const }}>
                    {dot.name}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: dotColor, fontFamily: SANS, whiteSpace: 'nowrap' as const }}>
                    {dot.val}{unit}
                  </div>
                </div>
              )}
              {/* Dot */}
              <div
                style={{
                  width: 10, height: 10, borderRadius: '50%', background: dotColor,
                  boxShadow: `0 0 8px ${dotColor}70`,
                  margin: above ? '0 auto' : '26px auto 0',
                }}
              />
              {!above && (
                <div style={{ textAlign: 'center' as const, marginTop: 4 }}>
                  <div style={{ fontSize: 18, color: dotColor, fontFamily: SANS, whiteSpace: 'nowrap' as const }}>
                    {dot.name}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: dotColor, fontFamily: SANS, whiteSpace: 'nowrap' as const }}>
                    {dot.val}{unit}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {chips && chips.length > 0 && <Chips items={chips} />}
    </div>
  );
}

// ─── Proportion ──────────────────────────────────────────────────────────────
// Horizontal split bar showing left/right percentage breakdown
// Used for: Q13
function Proportion({ leftPct, leftLabel, leftValue, leftColor, rightPct, rightLabel, rightValue, rightColor, chips }: {
  leftPct: number; leftLabel: string; leftValue: string; leftColor?: string;
  rightPct: number; rightLabel: string; rightValue: string; rightColor?: string;
  chips?: KeyHighlightChip[];
}) {
  if (!leftLabel && !rightLabel) return null;
  const lColor = leftColor ?? CC.blue;
  const rColor = rightColor ?? CC.blue;
  return (
    <div>
      {/* Split bar */}
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 36, margin: '10px 0' }}>
        <div
          style={{
            width: `${leftPct}%`, background: lColor + '38',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 12,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 500, color: C.t2, fontFamily: SANS }}>
            {leftValue}
          </span>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
        <div
          style={{
            width: `${rightPct}%`, background: rColor + '2A',
            display: 'flex', alignItems: 'center',
            paddingLeft: 12,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 500, color: C.t2, fontFamily: SANS }}>
            {rightValue}
          </span>
        </div>
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', marginBottom: chips ? 4 : 0 }}>
        <div style={{ width: `${leftPct}%` }}>
          <span style={{ fontSize: 18, color: lColor, fontFamily: SANS }}>
            {leftPct}% {leftLabel}
          </span>
        </div>
        <div style={{ width: `${rightPct}%`, paddingLeft: 10 }}>
          <span style={{ fontSize: 18, color: rColor, fontFamily: SANS }}>
            {rightPct}% {rightLabel}
          </span>
        </div>
      </div>
      {chips && chips.length > 0 && <Chips items={chips} />}
    </div>
  );
}

// ─── Ring ────────────────────────────────────────────────────────────────────
// Mini SVG donut ring showing an overall % + chips on the right
// Used for: Q10
function Ring({ pct, label, color: colorProp, chips }: {
  pct: number; label: string; color?: string;
  chips?: KeyHighlightChip[];
}) {
  if (pct == null && !label) return null;
  const color = colorProp ?? CC.blue;
  const r      = 30;
  const cx     = 40;
  const cy     = 40;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      {/* Ring */}
      <div style={{ position: 'relative' as const, flexShrink: 0, width: 80, height: 80 }}>
        <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={8}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: 'absolute' as const,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center' as const,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 500, color, fontFamily: SANS }}>{pct}%</div>
        </div>
      </div>
      {/* Label + chips */}
      <div style={{ flex: 1 }}>
        <div style={{ ...LABEL, padding: '10px 0px' }}>
          {label}
        </div>
        {chips && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
            {chips.map((chip, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 8,
                  padding: '10px 10px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 5,
                }}
              >
            <span style={{ ...VALUE, color: C.t2 }}>
                  {chip.value}
                </span>
                <span style={{ ...VALUE, color: C.t2, fontWeight: 400, userSelect: 'none' as const }}>|</span>
                <span style={{ ...LABEL }}>
                  {chip.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ScorecardRows ───────────────────────────────────────────────────────────
// Per-item rows: name chip | mini bar | value | optional badge + sublabel
// Used for: Q3 (commitment), Q5 (EW categories), Q6 (open EWs), Q8 (NCEs), Q10 (variation implementation)

function ScorecardRows({ items = [] }: { items: ScorecardRow[] }) {
  const visible = items.filter(item => item.name ?? item.value);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
      {visible.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0px',
            background: C.bg,
            border: `1px solid ${C.border}`,
          }}
        >
          {/* Name */}
          <span
            style={{
              fontSize: 18, fontWeight: 500, color: C.t2,
              background: 'transparent', padding: '2px 7px',
              borderRadius: 4, fontFamily: SANS, flexShrink: 0, minWidth: 62,
              textAlign: 'center' as const,
            }}
          >
            {item.name}
          </span>

          {/* Mini bar */}
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 0, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${item.pct}%`,
                background: item.color ?? CC.purple,
                borderRadius: 0,
                opacity: 0.75,
              }}
            />
          </div>

          {/* Right-side label block — value, badge, sublabel all right-aligned in one column */}
          <span style={{ fontSize: 18, fontWeight: 400, color: C.t2, fontFamily: SANS, flexShrink: 0, minWidth: 320, textAlign: 'right' as const }}>
            {[item.value, item.badge, item.sublabel].filter(Boolean).join('  ')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── FlagsList ───────────────────────────────────────────────────────────────
// Risk/alert rows: severity dot | description text | contract tag | date
// Used for: detailed risk context panels (vendor drill-downs, etc.)
const FLAG_COLOR: Record<FlagsListRow['severity'], string> = {
  red:   C.red,
  amber: C.amber,
  green: C.green,
};

function FlagsList({ items = [] }: { items: FlagsListRow[] }) {
  const visible = items.filter(item => item.text);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
      {visible.map((item, i) => {
        const color = FLAG_COLOR[item.severity];
        return (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 12px',
              background: 'transparent',
              // border: `1px solid ${color}25`,
            }}
          >
            
            {/* <span
              style={{
                width: 7, height: 7, borderRadius: '50%', background: color,
                flexShrink: 0, marginTop: 5,
              }}
            /> */}
             <span
              style={{
                fontSize: 18, fontWeight: 500, color,
                background: color + '20', padding: '2px 7px',
                borderRadius: 4, fontFamily: SANS, flexShrink: 0,
              }}
            >
              {item.tag}
            </span>
            <span style={{ flex: 1, ...LABEL }}>
              {item.text}
            </span>
           
            <span style={{ ...LABEL, flexShrink: 0, marginTop: 1 }}>
              {item.date}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── ComparisonRows ───────────────────────────────────────────────────────────
// Mini table: label column + N data columns, each row color-coded with a left border
// Used for: Q2 (contractor base/var breakdown), Q11 (quotation accepted vs submitted)
function ComparisonRows({ columns = [], rows = [] }: { columns: string[]; rows: ComparisonRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
      {/* Column headers */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 0px 6px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ minWidth: 64 }} />
        {columns.map((col, i) => (
          <div
            key={i}
            style={{
              flex: 1, fontSize: 18, fontWeight: 500, color: C.t2,
              fontFamily: SANS, textTransform: 'uppercase' as const, letterSpacing: 0.6,
            }}
          >
            {col}
          </div>
        ))}
      </div>
      {/* Data rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0px',
            background: C.bg,
            border: `1px solid ${C.border}`,
          }}
        >
          <span
            style={{
              fontSize: 18, fontWeight: 500,
              color: C.t1,
              background: 'transparent',
              padding: '2px 8px', borderRadius: 4,
              fontFamily: SANS, flexShrink: 0, minWidth: 64,
              textAlign: 'center' as const,
            }}
          >
            {row.label}
          </span>
          {row.cells.map((cell, j) => (
            <span key={j} style={{ flex: 1, fontSize: 18, fontWeight: 500, color: C.t2, fontFamily: SANS }}>
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function KeyHighlights({ block }: { block?: KeyHighlightBlock }) {
  if (!block) return null;

  switch (block.type) {
    case 'stats':           return <Stats items={block.items} />;
    case 'ranked':          return <Ranked items={block.items} />;
    case 'chips':           return <Chips items={block.items} />;
    case 'badges':          return <Badges items={block.items} />;
    case 'dot-strip':       return <DotStrip min={block.min} max={block.max} unit={block.unit} dots={block.dots} chips={block.chips} />;
    case 'proportion':      return <Proportion leftPct={block.leftPct} leftLabel={block.leftLabel} leftValue={block.leftValue} leftColor={block.leftColor} rightPct={block.rightPct} rightLabel={block.rightLabel} rightValue={block.rightValue} rightColor={block.rightColor} chips={block.chips} />;
    case 'ring':            return <Ring pct={block.pct} label={block.label} color={block.color} chips={block.chips} />;
    case 'scorecard-rows':  return <ScorecardRows items={block.items} />;
    case 'flags-list':      return <FlagsList items={block.items} />;
    case 'comparison-rows': return <ComparisonRows columns={block.columns} rows={block.rows} />;
    default:                return null;
  }
}
