import { useEffect } from 'react';

import { KeyHighlights } from '../../components/keyHighlights/KeyHighlights';
import { MultiSegmentHorizontalBarChart } from '../../components/multiSegmentHorizontalBarChart';
import { Trend } from '../../components/trend/Trend';
import { VisualizationGroup } from '../../components/visualizationGroup/VisualizationGroup';
import { VisualizationRenderer } from '../../components/visualizationRenderer/VisualizationRenderer';
import { dualSegmentBarRows } from '../../mocks/workspace.mock';
import type { KeyHighlightBlock } from '../../types';

// ─── Group 1: Generic chart mock data ────────────────────────────────────────

/** bar / line / area / pie / donut / sankey */
const vizRows = [
  { id: 'a', vendor: 'Acme Corp',    pricing: 82 },
  { id: 'b', vendor: 'BuildRight',   pricing: 64 },
  { id: 'c', vendor: 'CostCo Build', pricing: 47 },
  { id: 'd', vendor: 'DeltaWork',    pricing: 91 },
  { id: 'e', vendor: 'EdgeWorks',    pricing: 73 },
];

/** trend — [label, value][] */
const trendPoints: [string, number][] = [
  ["Feb 2025", 3], ["Mar 2025", 2], ["Apr 2025", 15], ["May 2025", 12], ["Jun 2025", 35], ["Jul 2025", 24], ["Aug 2025", 12], ["Sep 2025", 30], ["Oct 2025", 15], ["Nov 2025", 12], ["Dec 2025", 11], ["Jan 2026", 18], ["Feb 2026", 16], ["Mar 2026", 16]
];
/** mini-bars — [label, value, color][] */
const miniBarsRows: [string, number, string][] = [
  ['Acme',   82, '#4C93D9'],
  ['Build',  64, '#5DA537'],
  ['CostCo', 47, '#3C45D1'],
  ['Delta',  91, '#A0B724'],
  ['Edge',   73, '#EEBF3B'],
];

// ─── Group 2: Domain-specific chart mock data ─────────────────────────────────

/**
 * Q1 — stacked-horizontal-bar-chart
 * Horizontal bars: base (solid) + variation (lighter) per entity.
 * ContractorRow: { id, name, abbreviation?, base?, variation?, total?, percentage? }
 * totals: { base?, variation?, total? } — shown as "Portfolio: £xM" in legend
 */
const contractValueData = {
  items: [
    { id: 'c1', name: 'Tata Projects',        base: 142, variation: 18.4, total: 16798564.4, percentage: 87 },
    { id: 'c2', name: 'L&T Construction',     base: 198, variation: 12.6, total: 21034567.6, percentage: 92 },
    { id: 'c3', name: 'Afcons Infra',      base: 89,  variation: 22.1, total: 1134561.1, percentage: 78 },
    { id: 'c4', name: 'NCC Ltd',             base: 156, variation: 8.9,  total: 1634564.9, percentage: 95 },
    { id: 'c5', name: 'KEC International',    base: 74,  variation: 31.2, total: 13456705.2, percentage: 69 },
    { id: 'c6', name: 'KEC International',    base: 142,  variation: 18.4, total: 14567860.4, percentage: 87 },
    { id: 'c7', name: 'KEC International',    base: 74,  variation: 31.2, total: 105675.2, percentage: 69 },
    { id: 'c8', name: 'KEC International',    base: 74,  variation: 31.2, total: 10345675.2, percentage: 69 },
    { id: 'c9', name: 'KEC International',    base: 198,  variation: 12.6, total: 2145670.6, percentage: 92 },
    { id: 'c10', name: 'KEC International',    base: 74,  variation: 31.2, total: 1034565.2, percentage: 69 },
    { id: 'c11', name: 'KEC International',    base: 74,  variation: 31.2, total: 1234505.2, percentage: 69 },
    { id: 'c12', name: 'KEC International',    base: 74,  variation: 31.2, total: 1345605.2, percentage: 69 },
    { id: 'c13', name: 'KEC International',    base: 74,  variation: 31.2, total: 104565.2, percentage: 69 },
    { id: 'c14', name: 'KEC International',    base: 74,  variation: 31.2, total: 1456705.2, percentage: 69 },
    

  ],
  totals: { base: 659, variation: 93.2, total: 752.2 },
};

/**
 * Q2 — multi-metric-constellation-chart
 * Triangle KPI map per entity — same ContractorRow[] shape as above.
 * Each triangle vertex = base (top), variation (lower-right), percentage (lower-left).
 */
const contractBarsContractors = contractValueData.items;

/**
 * Q3 — progress-race-chart
 * Progress race — how far each entity is toward 100% commitment.
 * Same ContractorRow[] — only percentage and abbreviation are rendered.
 */
const commitmentRaceContractors = contractValueData.items;

/**
 * Q4 — hub-and-spoke-radial-chart
 * Arc/donut — EW status split.
 * EWStatusRow: { status: string, count: number }
 * title is optional — displayed above the arc.
 */
const statusArcSegments = [
  { status: 'Open',      count: 18 },
  { status: 'Submitted', count: 10 },
  { status: 'Closed',    count: 12 },
];

/**
 * Q5 — dot-matrix-chart
 * Dot columns — each dot = one EW, grouped by category.
 * EWCategoryRow: { category: string (short), fullName: string, count: number }
 */
const ewCategories = [
  { category: 'Ground',     fullName: 'Ground Conditions', count: 12 },
  { category: 'Design',     fullName: 'Design Issues',     count: 8  },
  { category: 'Employer',   fullName: 'Employer Risk',     count: 7  },
  { category: 'Weather',    fullName: 'Weather Events',    count: 6  },
  { category: 'Regulatory', fullName: 'Regulatory',        count: 5  },
  { category: 'Other',      fullName: 'Other',             count: 2  },
];

/**
 * Q6 — ranked-card-leaderboard
 * Ranked horizontal exposure bars — open count per entity.
 * EWOpenContractorRow: { id, name, abbreviation?, count? }
 */
const contractorRankContractors = [
  { id: 'c1', name: 'Tata Projects',  label:"1 Rupee",  count: 1 },
  { id: 'c3', name: 'Afcons Infra',     label:"2",count: 2 },
  { id: 'c2', name: 'L&T Construction',    label:"6",count: 3 },
  { id: 'c4', name: 'NCC Ltd',              label:"4",count: 4 },
  { id: 'c5', name: 'KEC International',     label:"5",count: 5 },
  
];

/**
 * Q7 — proportional-band-chart
 * Horizontal spectrum from Critical → Low.
 * EWSeverityRow: { severity: string, count: number }
 * Order matters — rendered left to right.
 */
const severityBands = [
      {
        "count": 42970585,
        "severity": "90+ days (Tenova)"
      },
      {
        "severity": "0-30 days (Churngold)",
        "count": 16077404
      },
      {
        "severity": "90+ days (ASL NG Prep)",
        "count": 16035980
      },
      {
        "severity": "31-60 days (ASL NG Prep)",
        "count": 12669303
      },
      {
        "count": 28346728,
        "severity": "Other Buckets"
      }
];

/**
 * Q8 — radial-fan-tree-chart
 * Radial tree — branch thickness proportional to count per entity.
 * NCEContractorRow: { id, name, abbreviation?, count? }
 * total = sum of all counts (displayed at root).
 */

const nceByContractorData = [
  { id: 'sc-other',  name: 'Site Conditions - Other',          label: 'Site Conditions', count: 157 },
  { id: 'prog',      name: 'Programme',                         label: 'Programme',        count: 122 },
  { id: 'dm',        name: 'Design Maturity',                   label: 'Design Maturity',  count: 97  },
  { id: 'err-con',   name: 'Error by Contractor',               label: 'Contractor Error', count: 28  },
  { id: 'cs-design', name: 'Change to Scope of Work - Design',  label: 'Scope Change',     count: 27  },
];
const nceTotal = 431;
const nceTotalLabel = 'Active Early Warnings';

/**
 * Q8b — visualization_group (progress-race-chart broadcaster -> radial-fan-tree-chart listener)
 * Reproduces the exact "Open NCEs by Contractor & Approved NCEs by Area" payload that shipped
 * without `subentity` on any broadcaster item — the click hint showed but nothing happened.
 *
 * "withSubentity" -> every broadcaster item carries subentity: hint shows AND drill-down works.
 * "withoutSubentity" -> no broadcaster item carries subentity: hint must NOT render (the fix).
 */
const openNceListenerDefault = {
  type: 'radial-fan-tree-chart' as const,
  total: 159,
  totalLabel: '159 Approved NCEs',
  items: [
    { id: 'area-meltshop', name: 'Meltshop', count: 148 },
    { id: 'area-programme', name: 'Programme', count: 11 },
  ],
};

const openNceBroadcasterItemsWithSubentity = [
  { id: 'c-darlow', name: 'Darlow Lloyd', abbreviation: 'Darlow', base: 15, total: 8, percentage: 53.3, baseLabel: '15 NCEs', totalLabel: '8 Open',
    subentity: { total: 8, totalLabel: '8 Open', items: [{ id: 'area-meltshop', name: 'Meltshop', count: 5 }, { id: 'area-programme', name: 'Programme', count: 3 }] } },
  { id: 'c-wernick', name: 'Wernick', abbreviation: 'Wernic', base: 15, total: 15, percentage: 100, baseLabel: '15 NCEs', totalLabel: '15 Open',
    subentity: { total: 15, totalLabel: '15 Open', items: [{ id: 'area-meltshop', name: 'Meltshop', count: 12 }, { id: 'area-programme', name: 'Programme', count: 3 }] } },
  { id: 'c-asl', name: 'ASL', abbreviation: 'ASL', base: 15, total: 12, percentage: 80, baseLabel: '15 NCEs', totalLabel: '12 Open',
    subentity: { total: 12, totalLabel: '12 Open', items: [{ id: 'area-meltshop', name: 'Meltshop', count: 9 }, { id: 'area-programme', name: 'Programme', count: 3 }] } },
];

// Same rows, `subentity` stripped -- this is the exact shape that produced the bug.
const openNceBroadcasterItemsWithoutSubentity = openNceBroadcasterItemsWithSubentity.map(
  ({ subentity: _subentity, ...rest }) => rest,
);

/**
 * Q9 — semi-circular-gauge-chart
 * Needle gauge — pct sweeps needle, confirmed/total shown in centre.
 * pct: 0–100  |  confirmed: number of confirmed NCEs  |  total: total NCEs
 */
const compensationGaugeData = {  confirmed: 519, total: 1000, label: 'NCEs confirmed' };


/**
 * Q10 — variation-split
 * Stacked bar — implemented (solid) vs unimplemented (lighter) per entity.
 * VariationRow: { id, name, abbreviation?, implemented?, unimplemented? }
 */
const variationSplitContractors = [
  { id: 'c1', name: 'Tata Projects',     abbreviation: 'Tata',   implemented: 12456, unimplemented: 4564 },
  { id: 'c2', name: 'L&T Construction',  abbreviation: 'L&T',    implemented: 8565,  unimplemented: 667 },
  { id: 'c3', name: 'Afcons Infra',      abbreviation: 'Afcons', implemented: 5434,  unimplemented: 96 },
  { id: 'c4', name: 'NCC Ltd',           abbreviation: 'NCC',    implemented: 11, unimplemented: 2 },
  { id: 'c5', name: 'KEC International', abbreviation: 'KEC',    implemented: 6345,  unimplemented: 8 },
  { id: 'c5', name: 'KEC International', abbreviation: 'KEC',    implemented: 6,  unimplemented: 8 },
  { id: 'c5', name: 'KEC International', abbreviation: 'KEC',    implemented: 6456,  unimplemented: 8 },
  { id: 'c5', name: 'KEC International', abbreviation: 'KEC',    implemented: 6,  unimplemented: 8 },
  { id: 'c5', name: 'KEC International', abbreviation: 'KEC',    implemented: 6345,  unimplemented: 8 },
  { id: 'c5', name: 'KEC International', abbreviation: 'KEC',    implemented: 6,  unimplemented: 8 },
  { id: 'c5', name: 'KEC International', abbreviation: 'KEC',    implemented: 6765,  unimplemented: 8 },
  { id: 'c5', name: 'KEC International', abbreviation: 'KEC',    implemented: 34566,  unimplemented: 8 },
];

/**
 * Q11 — quotation-balance
 * Balance beam — left pan = accepted, right pan = submitted.
 * QuotationSide: { value: number, count: number, label: string }
 * The beam tilts based on value difference.
 */
const quotationBalanceData = {
  "unit": "variations",
    "left": {
      "count": 0,
      "label": "£0.00",
      "value": 0
    },
    "right": {
      "label": "-£33.6K",
      "value": -33553,
      "count": 13
    },
    "rightTitle": "Option E (Reimbursable)",
    "type": "balance-scale-chart",
    "leftTitle": "Option A (Priced)"
};

/**
 * Q12 — quotation-trend
 * Line + bar combo — weekly submission volume and value.
 * QuotationTrendPoint: { week: string, count: number, value: number }
 */
const quotationTrendData = [
{
        "value": 12,
        "week": "Sep-2025",
        "count": 137
      },
      {
        "value": 7,
        "week": "Oct-2025",
        "count": 141
      },
      {
        "value": 4,
        "week": "Nov-2025",
        "count": 163
      },
      {
        "count": 89,
        "value": 6,
        "week": "Dec-2025"
      },
      {
        "count": 121,
        "value": 1,
        "week": "Jan-2026"
      },
      {
        "count": 137,
        "value": 4,
        "week": "Feb-2026"
      }
];

/**
 * Q13 — weekly-flow
 * Sankey flow — base + variation streams per contractor converge into total commitment.
 * Same ContractorRow[] — base, variation, total, percentage.
 */
const weeklyFlowContractors = contractValueData.items;

/**
 * horizontal-bar-chart
 * Single-segment horizontal bar — total contract value per area/entity.
 * HorizontalBarRow: { id, name, value, valueLabel? }
 */
const contractsByAreaRows = [
  { id: 'a1', name: 'Tata',   value: 105_200_000 },
  { id: 'a2', name: 'L&T',    value: 183_200_000 },
  { id: 'a3', name: 'Afcons', value: 119_800_000 },
  { id: 'a4', name: 'NCC',    value: 115_400_000 },
  { id: 'a5', name: 'KEC',    value: 210_600_000 },
];

// ─── KeyHighlights blocks for each Q ─────────────────────────────────────────

const HIGHLIGHTS: Record<string, KeyHighlightBlock> = {

  // Q1 — 3 equal stat tiles: total, base, variations
  q1: {
    type: 'stats',
    items: [
      { value: '£752.2M', label: 'Total Portfolio Commitment',    sublabel: 'across 5 active contractors' },
      { value: '£659M',   label: 'Base Contract Value',           sublabel: '87.6% of total commitment' },
      { value: '£93.2M',  label: 'Approved Variations',          sublabel: '+12.4% on top of base' },
      { value: 'L&T',     label: 'Largest Contractor',           sublabel: '£210.6M — 28% of portfolio' },
      { value: 'KEC 42%', label: 'Highest Variation Ratio',      sublabel: '3× the portfolio average' },
    ],
    takeaway: 'L&T and NCC together anchor 50% of portfolio value. KEC\'s 42% variation ratio is 3× the average — the clearest single-contractor risk flag.',
  },

  // Q2 — comparison table: base / variations / var % per contractor
  q2: {
    type: 'comparison-rows',
    columns: ['Base', 'Variations', 'Var %'],
    rows: [
      { label: 'L&T',    cells: ['£198M', '£12.6M', '6%'],  color: '#5DA537' },
      { label: 'NCC',    cells: ['£156M', '£8.9M',  '6%'],  color: '#EEBF3B' },
      { label: 'Tata',   cells: ['£142M', '£18.4M', '13%'], color: '#4C93D9' },
      { label: 'Afcons', cells: ['£89M',  '£22.1M', '25%'], color: '#3C45D1' },
      { label: 'KEC',    cells: ['£74M',  '£31.2M', '42%'], color: '#A0B724' },
    ],
    takeaway: 'KEC\'s 42% variation-to-base ratio is 7× higher than L&T and NCC — the most exposed contractor despite holding the smallest base.',
  },

  // Q3 — chips: portfolio avg, spread, contractors below 80%
  q3: {
    type: 'chips',
    items: [
      { value: '84%',    label: 'portfolio-weighted average commitment — 16 points below full close',  },
      { value: '26 pts', label: 'spread from NCC (95%) to KEC (69%) — widest performance gap',      },
      { value: '2 of 5', label: 'contractors below the 80% target — Afcons at 78% and KEC at 69%',},
    ],
    takeaway: 'The 26-point spread signals a deeply uneven portfolio — KEC\'s 42% variation ratio is the primary factor keeping its commitment furthest from the finish line.',
  },

  // Q4 — chips: total EWs, open, pending, resolution rate
  q4: {
    type: 'chips',
    items: [
      { value: '40 EWs',   label: 'total Early Warnings active across all 5 contractors right now',  },
      { value: '18 Open',  label: '45% still active and unresolved — risk actively in flight',        },
      { value: '10 Stuck', label: 'submitted but awaiting decision — in commercial or legal limbo',  },
      { value: '30%',      label: 'resolution rate — only 12 of 40 EWs fully closed to date',       },
    ],
    takeaway: '70% of EWs remain live — the combined open and pending backlog will convert to NCEs if commercial decisions are not accelerated.',
  },

  // Q5 — scorecard rows: all 5 categories with proportional bar
  q5: {
    type: 'scorecard-rows',
    items: [
      { name: 'Ground',     value: '12 EWs', pct: 100, color: '#4C93D9', sublabel: '30% of portfolio — dominant category' },
      { name: 'Design',     value: '8 EWs',  pct: 67,  color: '#5DA537', sublabel: '20% — often contractor-caused' },
      { name: 'Employer',   value: '7 EWs',  pct: 58,  color: '#3C45D1', sublabel: '17.5% — slowest category to resolve' },
      { name: 'Weather',    value: '6 EWs',  pct: 50,  color: '#EEBF3B', sublabel: '15% — force majeure risk profile' },
      { name: 'Regulatory', value: '5 EWs',  pct: 42,  color: '#A0B724', sublabel: '12.5% — compliance-driven' },
    ],
    takeaway: 'Ground Conditions (30%) and Design Issues (20%) account for half of all EWs — both categories are strongly correlated with NCE escalation.',
  },

  // Q6 — scorecard rows: open EW count per contractor with risk badge
  q6: {
    type: 'scorecard-rows',
    items: [
      { name: 'Tata',   value: '7 open', pct: 100, color: '#4C93D9', badge: 'High risk',    sublabel: '39% of all open EWs' },
      { name: 'Afcons', value: '4 open', pct: 57,  color: '#3C45D1', badge: 'Elevated',    sublabel: '22% — combined 61%' },
      { name: 'L&T',    value: '3 open', pct: 43,  color: '#5DA537', badge: 'Moderate',  sublabel: '17% share' },
      { name: 'NCC',    value: '2 open', pct: 29,  color: '#EEBF3B', badge: 'Low risk',  sublabel: '11% — well managed' },
      { name: 'KEC',    value: '2 open', pct: 29,  color: '#A0B724', badge: 'Low risk',  sublabel: '11% — well managed' },
    ],
    takeaway: 'Tata holds 39% of open EWs — resolving Tata\'s backlog alone would reduce the total portfolio open count by over a third.',
  },

  // Q7 — badges: Critical / High / Medium / Low severity
  q7: {
    type: 'badges',
    items: [
      { text: '5 Critical — all currently unresolved, highest escalation and adjudication risk in the portfolio', severity: 'red'   },
      { text: '14 High severity — at risk of escalating to Critical without active commercial intervention',      severity: 'amber' },
      { text: '13 Medium severity — significant volume, close monitoring required across all 5 contractors',      severity: 'amber' },
      { text: '8 Low severity — flagged for awareness only, no immediate financial or schedule exposure',         severity: 'green' },
    ],
    takeaway: 'Critical + High EWs (19 total) account for 47.5% of the portfolio — all 5 Critical items remain unresolved.',
  },

  // Q8 — scorecard rows: NCE count per contractor with share sublabel
  q8: {
    type: 'scorecard-rows',
    items: [
      { name: 'Tata',   value: '8 NCEs', pct: 100, sublabel: '32% of total — highest raiser' },
      { name: 'Afcons', value: '6 NCEs', pct: 75,  sublabel: '24% — Tata + Afcons = 56%' },
      { name: 'L&T',    value: '4 NCEs', pct: 50,  sublabel: '16% share' },
      { name: 'NCC',    value: '4 NCEs', pct: 50,  sublabel: '16% share' },
      { name: 'KEC',    value: '3 NCEs', pct: 38,  sublabel: '12% — fewest despite highest var ratio' },
    ],
    takeaway: 'Tata\'s NCE concentration (32%) mirrors its EW exposure (39%) — both metrics converge on the same contractor as the portfolio\'s primary risk driver.',
  },

  // Q9 — badges: confirmation rate signals
  q9: {
    type: 'badges',
    items: [
      { text: '10 NCEs unconfirmed — each a potential adjudication trigger and active financial liability', severity: 'red'   },
      { text: '40% dispute rate — above typical 25% benchmark, signals contractor commercial aggression',  severity: 'red'   },
      { text: '60% confirmation rate — at the amber-zone boundary, below the target performance threshold', severity: 'amber' },
      { text: '15 NCEs confirmed — obligations legally established, budgeted and approved for payment',     severity: 'green' },
    ],
    takeaway: 'The 40% dispute rate exceeds typical benchmarks — 10 contested NCEs represent the portfolio\'s most volatile financial exposure.',
  },

  // Q10 — chips: overall implementation rate, backlog, spread
  q10: {
    type: 'chips',
    items: [
      { value: '59%',    label: 'overall portfolio implementation rate — 42 of 71 variations actioned', },
      { value: '29',     label: 'variations still pending across all contractors — unresolved backlog',  },
      { value: '49 pts', label: 'spread from NCC (85%) to Afcons (36%) — largest discipline gap',       },
    ],
    takeaway: 'Afcons\' 9 and KEC\'s 8 pending variations together account for 59% of the entire unimplemented backlog.',
  },

  // Q11 — comparison table: accepted / submitted / gap
  q11: {
    type: 'comparison-rows',
    columns: ['Value', 'Count', 'Avg deal'],
    rows: [
      { label: 'Accepted',  cells: ['£28.4M', '31 quotes', '~£916K'], color: '#A0B724' },
      { label: 'Submitted', cells: ['£19.8M', '22 quotes', '~£900K'], color: '#3C45D1' },
      { label: 'Gap (+)',   cells: ['+£8.6M', '+9 quotes', '—'],       color: '#4C93D9' },
    ],
    takeaway: 'The £19.8M pending pipeline represents 41% of already-accepted value — resolution of submitted quotations will define the quarter\'s commercial outcome.',
  },

  // Q12 — stats: totals, peak week, growth factor, peak value, acceleration
  q12: {
    type: 'stats',
    items: [
      { value: '57',    label: 'total submissions over the 12-week window',                  },
      { value: '9',     label: 'Week 12 peak — highest single-week volume on record',         },
      { value: '4.5×',  label: 'W12 vs W1 growth factor — acceleration across 12 weeks',     },
      { value: '£8.3M', label: 'Week 12 value — highest-value week in the 12-week window',    },
      { value: '+80%',  label: 'W11→W12 final-week acceleration — sharpest single-step jump',},
    ],
    takeaway: 'Week 12 alone accounts for 16% of all 12-week submissions at the highest value on record — the claim period is entering its most active phase.',
  },

  // Q13 — proportion split: base 88% vs variations 12% + chips
  q13: {
    type: 'proportion',
    leftPct: 100,   leftLabel: 'Base Value',  leftValue: '£659M',   leftColor: '#4C93D9',
    rightPct: 0,  rightLabel: 'Variations', rightValue: '£93.2M', rightColor: '#3C45D1',
    chips: [
      { value: 'KEC 42%',    label: 'highest variation-to-base ratio — 3× the portfolio average',             },
      { value: 'Afcons 25%', label: 'second-highest — KEC + Afcons drive 57% of variation value',         },
      { value: '£93.2M',     label: 'total approved variations — equivalent to adding a 6th mid-size contractor',  },
      { value: '2 of 5',     label: 'contractors above 20% variation rate — concentrated in the bottom tier', },
    ],
    takeaway: 'KEC and Afcons contribute 57% of all variation value despite holding only 23% of base contract value — the portfolio\'s primary financial concentration risk.',
  },

  // dot-strip — contractor commitment % on a range track
  dotStrip: {
    type: 'dot-strip',
    min: 60,
    max: 100,
    unit: '%',
    dots: [
      { name: 'KEC',    val: 69,  color: '#A0B724' },
      { name: 'Afcons', val: 78,  color: '#3C45D1' },
      { name: 'Tata',   val: 87,  color: '#4C93D9' },
      { name: 'L&T',    val: 92,  color: '#5DA537' },
      { name: 'NCC',    val: 95,  color: '#EEBF3B' },
    ],
    takeaway: 'NCC and L&T are clustered near full close while KEC and Afcons lag — a 26-point spread across the portfolio.',
  },

  dotStripWithChips: {
    type: 'dot-strip',
    min: 0,
    max: 50,
    unit: ' EWs',
    dots: [
      { name: 'NCC',    val: 4,  color: '#EEBF3B' },
      { name: 'KEC',    val: 7,  color: '#A0B724' },
      { name: 'L&T',    val: 11, color: '#5DA537' },
      { name: 'Afcons', val: 18, color: '#3C45D1' },
      { name: 'Tata',   val: 22, color: '#4C93D9' },
    ],
    chips: [
      { value: '40 EWs',  label: 'total open across portfolio' },
      { value: 'Tata',    label: 'highest — 55% above avg',     color: '#4C93D9' },
      { value: 'NCC',     label: 'lowest — well within target', color: '#EEBF3B' },
    ],
    takeaway: 'Tata holds 55% more open EWs than the portfolio average — concentrated in Ground Conditions and Design categories.',
  },

  // ring — variation implementation rate
  ring: {
    type: 'ring',
    pct: 86,
    color: '#4C93D9',
    
    label: 'overall portfolio variation implementation rate — 42 of 71 variations actioned across all contractors',
    chips: [
      { value: 'NCC 85%',    label: 'highest implementation rate — only 2 pending',   color: '#EEBF3B' },
      { value: 'L&T 57%',    label: 'mid-tier — 6 variations still outstanding',        color: '#5DA537' },
      { value: 'Afcons 36%', label: 'lowest rate — 9 pending, largest single backlog', color: '#3C45D1' },
    ],
    takeaway: 'Afcons and KEC together hold 59% of the unimplemented backlog despite representing only 23% of base contract value.',
  },

  // flags-list — active risk alerts across the portfolio
  ranked: {
    type: 'ranked',
    items: [
      { name: 'L&T',    value: '£210.6M', kpiLabel: '28% of portfolio — largest contractor by commitment' },
      { name: 'NCC',    value: '£164.9M', kpiLabel: '22% share — commitment above 90%, on track' },
      { name: 'Tata',   value: '£160.4M', kpiLabel: '21% share — 39% of all open EWs concentrated here' },
      { name: 'Afcons', value: '£111.1M', kpiLabel: '15% share — variation implementation at 36%' },
      { name: 'KEC',    value: '£105.2M', kpiLabel: '14% share — 42% variation ratio, highest in portfolio' },
    ],
    takeaway: 'L&T and NCC anchor 50% of portfolio value with healthy commitment rates. KEC carries the highest variation risk despite the smallest base.',
  },

  flagsList: {
    type: 'flags-list',
    items: [
      { text: 'KEC variation-to-base ratio at 42% — 3× portfolio average, escalation risk if unresolved in Q2', severity: 'red',   tag: 'KEC',    date: '14 Apr 2026' },
      { text: 'Tata holds 39% of all open EWs — Ground Conditions category driving concentration risk',          severity: 'red',   tag: 'Tata',   date: '12 Apr 2026' },
      { text: '10 NCEs remain unconfirmed — 40% dispute rate exceeds 25% benchmark, adjudication likely',         severity: 'red',   tag: 'Portfolio', date: '10 Apr 2026' },
      { text: 'Afcons implementation rate at 36% — 9 pending variations, largest single contractor backlog',       severity: 'amber', tag: 'Afcons', date: '9 Apr 2026' },
      { text: '14 High-severity EWs at risk of escalating without active commercial intervention this quarter',     severity: 'amber', tag: 'Portfolio', date: '7 Apr 2026' },
      { text: 'NCC and L&T commitment above 90% — on track for full close, no immediate intervention required',   severity: 'green', tag: 'NCC/L&T', date: '5 Apr 2026' },
    ],
    takeaway: 'Three red-flag items — KEC variation exposure, Tata EW concentration, and unconfirmed NCEs — represent the portfolio\'s highest-priority commercial actions.',
  },
};

export function ChartGalleryPage() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      <h1>Chart Gallery</h1>

      {/* ── Group 1: Generic ───────────────────────────────────────────── */}
      <h2>Generic Charts</h2>

      <h3>bar</h3>
      <VisualizationRenderer config={{ type: 'bar', rows: vizRows }} />

      <h3>line</h3>
      <VisualizationRenderer config={{ type: 'line', rows: vizRows }} />

      <h3>area</h3>
      <VisualizationRenderer config={{ type: 'area', rows: vizRows }} />

      <h3>pie</h3>
      <VisualizationRenderer config={{ type: 'pie', rows: vizRows }} />

      <h3>donut</h3>
      <VisualizationRenderer config={{ type: 'donut', rows: vizRows }} />

      <h3>sankey</h3>
      <VisualizationRenderer config={{ type: 'sankey', rows: vizRows }} />

      <h3>trend</h3>
      <VisualizationRenderer config={{ type: 'trend', points: trendPoints }} />

      <h3>mini-bars</h3>
      <VisualizationRenderer config={{ type: 'mini-bars', rows: miniBarsRows }} />

      <h3>flow</h3>
      <VisualizationRenderer config={{ type: 'flow', selectedEntity: 'c1' }} />

      {/* ── Group 2: Domain-specific (Project Dashboard Q1–Q13) ─────────── */}
      <h2 style={{ marginTop: 48 }}>Project Dashboard Charts</h2>

      <h3>Q1 — stacked-horizontal-bar-chart</h3>
      <VisualizationRenderer config={{ type: 'stacked-horizontal-bar-chart', data: contractValueData }} />
      <KeyHighlights block={HIGHLIGHTS.q1} />

      <h3>Q2 — multi-metric-constellation-chart</h3>
      <VisualizationRenderer config={{ type: 'multi-metric-constellation-chart', items: contractBarsContractors }} />
      <KeyHighlights block={HIGHLIGHTS.q2} />

      <h3>Q3 — progress-race-chart</h3>
      <VisualizationRenderer config={{ type: 'progress-race-chart', items: commitmentRaceContractors }} />
      <KeyHighlights block={HIGHLIGHTS.q3} />

      <h3>Q4 — hub-and-spoke-radial-chart</h3>
      <VisualizationRenderer config={{ type: 'hub-and-spoke-radial-chart', segments: statusArcSegments, title: 'Early Warning Status Split' }} />
      <KeyHighlights block={HIGHLIGHTS.q4} />

      <h3>Q5 — dot-matrix-chart</h3>
      <VisualizationRenderer config={{ type: 'dot-matrix-chart', items: ewCategories, title: 'Early Warnings by Category' }} />
      <KeyHighlights block={HIGHLIGHTS.q5} />

      <h3>Q6 — ranked-card-leaderboard</h3>
      <VisualizationRenderer config={{ type: 'ranked-card-leaderboard', items: contractorRankContractors }} />
      <KeyHighlights block={HIGHLIGHTS.q6} />

      <h3>Q7 — proportional-band-chart</h3>
      <VisualizationRenderer config={{ type: 'proportional-band-chart', severities: severityBands }} />
      <KeyHighlights block={HIGHLIGHTS.q7} />

      <h3>Q8 — radial-fan-tree-chart</h3>
      <VisualizationRenderer config={{ type: 'radial-fan-tree-chart', total: nceTotal, totalLabel: nceTotalLabel, items: nceByContractorData }} />
      <KeyHighlights block={HIGHLIGHTS.q8} />

      <h3>Q8b — visualization_group WITH subentity (hint shows, drill-down works)</h3>
      <VisualizationGroup
        title="Open NCEs by Contractor & Approved NCEs by Area"
        items={[
          { type: 'progress-race-chart', items: openNceBroadcasterItemsWithSubentity },
          openNceListenerDefault,
        ]}
        data-testid="gallery-viz-group-with-subentity"
      />

      <h3>Q8c — visualization_group WITHOUT subentity (bug repro — hint must stay hidden)</h3>
      <VisualizationGroup
        title="Open NCEs by Contractor & Approved NCEs by Area"
        items={[
          { type: 'progress-race-chart', items: openNceBroadcasterItemsWithoutSubentity },
          openNceListenerDefault,
        ]}
        data-testid="gallery-viz-group-without-subentity"
      />

      <h3>Q9 — semi-circular-gauge-chart</h3>
      <VisualizationRenderer config={{ type: 'semi-circular-gauge-chart', confirmed: compensationGaugeData.confirmed, total: compensationGaugeData.total, label: 'NCEs are confirmed compensation events' }} />
      <KeyHighlights block={HIGHLIGHTS.q9} />

      <h3>Q10 — segmented-split-bar-chart</h3>
      <VisualizationRenderer config={{ type: 'segmented-split-bar-chart', items: variationSplitContractors }} />
      <KeyHighlights block={HIGHLIGHTS.q10} />

      <h3>Q11 — balance-scale-chart</h3>
      <VisualizationRenderer config={{ type: 'balance-scale-chart', left: quotationBalanceData.left, right: quotationBalanceData.right }} />
      <KeyHighlights block={HIGHLIGHTS.q11} />

      <h3>Q12 — area-line-chart</h3>
      <VisualizationRenderer config={{ type: 'area-line-chart', points: quotationTrendData }} />
      <KeyHighlights block={HIGHLIGHTS.q12} />

      <h3>Trend (standalone)</h3>
      <Trend points={quotationTrendData} data-testid="gallery-trend" />

      <h3>Q13 — weekly-flow</h3>
      <VisualizationRenderer config={{ type: 'weekly-flow', items: weeklyFlowContractors }} />
      <KeyHighlights block={HIGHLIGHTS.q13} />

      <h3>Dot Strip</h3>
      <KeyHighlights block={HIGHLIGHTS.dotStrip} />

      <h3>Dot Strip (with chips)</h3>
      <KeyHighlights block={HIGHLIGHTS.dotStripWithChips} />

      <h3>Ring</h3>
      <KeyHighlights block={HIGHLIGHTS.ring} />

      <h3>Flags List</h3>
      <KeyHighlights block={HIGHLIGHTS.flagsList} />

      <h3>Ranked</h3>
      <KeyHighlights block={HIGHLIGHTS.ranked} />

      <h3>Multi-Segment Horizontal Bar Chart</h3>
      <MultiSegmentHorizontalBarChart
        rows={dualSegmentBarRows}
        valuePrefix="$"
        data-testid="gallery-multi-segment-bar"
      />

      <h3>Horizontal bar chart
      </h3>
      <VisualizationRenderer
        config={{ type: 'horizontal-bar-chart', rows: contractsByAreaRows, valuePrefix: '$' }}
      />
    </div>
  );
}
