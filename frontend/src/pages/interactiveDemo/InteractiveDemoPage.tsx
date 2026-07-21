import { useState, useCallback, useEffect } from 'react';

import { styles } from './styles';

import { StackedHorizontalBarChart } from '../../components/stackedHorizontalBarChart';
import { SegmentedSplitBarChart } from '../../components/segmentedSplitBarChart/SegmentedSplitBarChart';
import { ProgressRaceChart } from '../../components/progressRaceChart/ProgressRaceChart';
import { Trend } from '../../components/trend';
import { SemiCircularGaugeChart } from '../../components/semiCircularGaugeChart/SemiCircularGaugeChart';
import { RadialFanTreeChart } from '../../components/radialFanTreeChart/RadialFanTreeChart';
import { VisualizationGroup } from '../../components/visualizationGroup/VisualizationGroup';
import type { GaugeEntityData } from '../../components/semiCircularGaugeChart/types';
import type { RadialFanEntityData } from '../../components/radialFanTreeChart/types';
import type { VariationRow, ContractorRow, QuotationSummary, SubentityItem, NCEContractorRow } from '../../types';
import { CHART_TYPE } from '../../constants';

// ─── Contractor IDs ───────────────────────────────────────────────────────────
// All datasets MUST use these exact keys so cross-chart selection works.
const IDS = {
  srm:    'srm-civils',
  cisdi:  'cisdi-uk',
  bath:   'bath-demolition',
  ska:    'skanska',
  knights:'knights-brown',
};

// ─── Stacked horizontal bar ───────────────────────────────────────────────────
const BAR_DATA = {
  items: [
    { id: IDS.srm,     name: 'SRM Civils',     abbreviation: 'SRM',    base: 8_500_000,  variation: 1_200_000, total: 9_700_000  },
    { id: IDS.cisdi,   name: 'CISDI UK',        abbreviation: 'CISDI',  base: 12_300_000, variation: 4_100_000, total: 16_400_000 },
    { id: IDS.bath,    name: 'Bath Demolition', abbreviation: 'Bath D', base: 3_200_000,  variation: 900_000,   total: 4_100_000  },
    { id: IDS.ska,     name: 'Skanska Opt A',   abbreviation: 'Ska',    base: 5_800_000,  variation: 1_500_000, total: 7_300_000  },
    { id: IDS.knights, name: 'Knights Brown',   abbreviation: 'KnBr',   base: 7_100_000,  variation: 2_300_000, total: 9_400_000  },
  ],
  totals: { base: 36_900_000, variation: 10_000_000, total: 46_900_000 },
};

// ─── Segmented split bar (variations) ────────────────────────────────────────
const VARIATION_ITEMS = [
  { id: IDS.cisdi,   name: 'CISDI UK',        abbreviation: 'CISDI',  implemented: 28, unimplemented: 19 },
  { id: IDS.knights, name: 'Knights Brown',   abbreviation: 'KnBr',   implemented: 15, unimplemented: 6  },
  { id: IDS.srm,     name: 'SRM Civils',      abbreviation: 'SRM',    implemented: 12, unimplemented: 9  },
  { id: IDS.ska,     name: 'Skanska Opt A',   abbreviation: 'Ska',    implemented: 9,  unimplemented: 3  },
  { id: IDS.bath,    name: 'Bath Demolition', abbreviation: 'Bath D', implemented: 4,  unimplemented: 0  },
];

// ─── Progress race ────────────────────────────────────────────────────────────
const RACE_ITEMS = [
  { id: IDS.cisdi,   name: 'CISDI UK',        abbreviation: 'CISDI',  percentage: 88, total: 16_400_000 },
  { id: IDS.ska,     name: 'Skanska Opt A',   abbreviation: 'Ska',    percentage: 91, total: 7_300_000  },
  { id: IDS.knights, name: 'Knights Brown',   abbreviation: 'KnBr',   percentage: 82, total: 9_400_000  },
  { id: IDS.srm,     name: 'SRM Civils',      abbreviation: 'SRM',    percentage: 74, total: 9_700_000  },
  { id: IDS.bath,    name: 'Bath Demolition', abbreviation: 'Bath D', percentage: 100, total: 4_100_000 },
];

// ─── Trend — per-contractor monthly series + aggregate ────────────────────────
const SERIES_BY_ENTITY: Record<string, { week: string; count: number; value: number }[]> = {
  [IDS.srm]: [
    { week: 'Jan 2025', count: 8,  value: 720_000   },
    { week: 'Feb 2025', count: 12, value: 1_100_000  },
    { week: 'Mar 2025', count: 15, value: 1_400_000  },
    { week: 'Apr 2025', count: 10, value: 920_000   },
    { week: 'May 2025', count: 18, value: 1_800_000  },
    { week: 'Jun 2025', count: 14, value: 1_350_000  },
  ],
  [IDS.cisdi]: [
    { week: 'Jan 2025', count: 5,  value: 980_000   },
    { week: 'Feb 2025', count: 8,  value: 1_600_000  },
    { week: 'Mar 2025', count: 6,  value: 1_200_000  },
    { week: 'Apr 2025', count: 12, value: 2_400_000  },
    { week: 'May 2025', count: 9,  value: 1_900_000  },
    { week: 'Jun 2025', count: 11, value: 2_200_000  },
  ],
  [IDS.bath]: [
    { week: 'Jan 2025', count: 15, value: 320_000   },
    { week: 'Feb 2025', count: 20, value: 440_000   },
    { week: 'Mar 2025', count: 18, value: 390_000   },
    { week: 'Apr 2025', count: 22, value: 480_000   },
    { week: 'May 2025', count: 17, value: 360_000   },
    { week: 'Jun 2025', count: 25, value: 540_000   },
  ],
  [IDS.ska]: [
    { week: 'Jan 2025', count: 3,  value: 650_000   },
    { week: 'Feb 2025', count: 5,  value: 1_050_000  },
    { week: 'Mar 2025', count: 4,  value: 840_000   },
    { week: 'Apr 2025', count: 7,  value: 1_470_000  },
    { week: 'May 2025', count: 6,  value: 1_260_000  },
    { week: 'Jun 2025', count: 8,  value: 1_680_000  },
  ],
  [IDS.knights]: [
    { week: 'Jan 2025', count: 10, value: 1_100_000  },
    { week: 'Feb 2025', count: 9,  value: 990_000   },
    { week: 'Mar 2025', count: 13, value: 1_430_000  },
    { week: 'Apr 2025', count: 11, value: 1_210_000  },
    { week: 'May 2025', count: 14, value: 1_540_000  },
    { week: 'Jun 2025', count: 12, value: 1_320_000  },
  ],
};

const AGGREGATE_POINTS = [
  { week: 'Jan 2025', count: 41, value: 3_770_000 },
  { week: 'Feb 2025', count: 54, value: 5_180_000 },
  { week: 'Mar 2025', count: 56, value: 5_260_000 },
  { week: 'Apr 2025', count: 62, value: 6_480_000 },
  { week: 'May 2025', count: 64, value: 6_860_000 },
  { week: 'Jun 2025', count: 70, value: 7_090_000 },
];

// ─── Radial fan tree (NCE distribution) ──────────────────────────────────────
const NCE_ITEMS = [
  { id: IDS.cisdi,   name: 'CISDI UK',        abbreviation: 'CISDI',  count: 31, label: '31 NCEs' },
  { id: IDS.srm,     name: 'SRM Civils',      abbreviation: 'SRM',    count: 22, label: '22 NCEs' },
  { id: IDS.knights, name: 'Knights Brown',   abbreviation: 'KnBr',   count: 18, label: '18 NCEs' },
  { id: IDS.ska,     name: 'Skanska Opt A',   abbreviation: 'Ska',    count: 14, label: '14 NCEs' },
  { id: IDS.bath,    name: 'Bath Demolition', abbreviation: 'Bath D', count: 6,  label: '6 NCEs'  },
];
const NCE_TOTAL = NCE_ITEMS.reduce((s, c) => s + (c.count ?? 0), 0);

// ─── Drill-down: SegmentedSplitBarChart — per-contractor package breakdown ────
const VARIATION_BY_ENTITY: Record<string, VariationRow[]> = {
  [IDS.cisdi]: [
    { id: 'cis-struct', name: 'Structural Works',    abbreviation: 'Str',  implemented: 12, unimplemented: 4 },
    { id: 'cis-mech',   name: 'Mechanical Install',  abbreviation: 'Mech', implemented: 8,  unimplemented: 7 },
    { id: 'cis-elec',   name: 'Electrical Systems',  abbreviation: 'Elec', implemented: 5,  unimplemented: 5 },
    { id: 'cis-hvac',   name: 'HVAC & Services',     abbreviation: 'HVAC', implemented: 3,  unimplemented: 3 },
  ],
  [IDS.knights]: [
    { id: 'kn-conc',    name: 'Concrete Works',      abbreviation: 'Con',  implemented: 8,  unimplemented: 2 },
    { id: 'kn-steel',   name: 'Steelwork',           abbreviation: 'Stl',  implemented: 5,  unimplemented: 3 },
    { id: 'kn-roof',    name: 'Roofing',             abbreviation: 'Rof',  implemented: 2,  unimplemented: 1 },
  ],
  [IDS.srm]: [
    { id: 'srm-civil',  name: 'Civil Works',         abbreviation: 'Civil',implemented: 6,  unimplemented: 4 },
    { id: 'srm-steel',  name: 'Steel Frame',         abbreviation: 'Steel',implemented: 4,  unimplemented: 3 },
    { id: 'srm-ground', name: 'Groundworks',         abbreviation: 'Grd',  implemented: 2,  unimplemented: 2 },
  ],
  [IDS.ska]: [
    { id: 'ska-found',  name: 'Foundation',          abbreviation: 'Fnd',  implemented: 5,  unimplemented: 1 },
    { id: 'ska-super',  name: 'Superstructure',      abbreviation: 'Sup',  implemented: 3,  unimplemented: 2 },
    { id: 'ska-mep',    name: 'MEP',                 abbreviation: 'MEP',  implemented: 1,  unimplemented: 0 },
  ],
  [IDS.bath]: [
    { id: 'bath-p1',    name: 'Phase 1 Demo',        abbreviation: 'Ph1',  implemented: 2,  unimplemented: 0 },
    { id: 'bath-p2',    name: 'Phase 2 Demo',        abbreviation: 'Ph2',  implemented: 2,  unimplemented: 0 },
  ],
};

// ─── Drill-down: ProgressRaceChart — per-contractor milestone completion ───────
// base = 100 for all items (percentage is the primary signal)
const RACE_BY_ENTITY: Record<string, ContractorRow[]> = {
  [IDS.cisdi]: [
    { id: 'cis-m1', name: 'Design',        abbreviation: 'Des',  base: 100, total: 100, percentage: 100 },
    { id: 'cis-m2', name: 'Procurement',   abbreviation: 'Pro',  base: 100, total: 97,  percentage: 97  },
    { id: 'cis-m3', name: 'Fabrication',   abbreviation: 'Fab',  base: 100, total: 91,  percentage: 91  },
    { id: 'cis-m4', name: 'Erection',      abbreviation: 'Ere',  base: 100, total: 68,  percentage: 68  },
    { id: 'cis-m5', name: 'Commissioning', abbreviation: 'Com',  base: 100, total: 12,  percentage: 12  },
  ],
  [IDS.ska]: [
    { id: 'ska-m1', name: 'Design',        abbreviation: 'Des',  base: 100, total: 100, percentage: 100 },
    { id: 'ska-m2', name: 'Foundation',    abbreviation: 'Fnd',  base: 100, total: 100, percentage: 100 },
    { id: 'ska-m3', name: 'Frame',         abbreviation: 'Frm',  base: 100, total: 91,  percentage: 91  },
    { id: 'ska-m4', name: 'Fit-Out',       abbreviation: 'Fit',  base: 100, total: 82,  percentage: 82  },
    { id: 'ska-m5', name: 'Commissioning', abbreviation: 'Com',  base: 100, total: 55,  percentage: 55  },
  ],
  [IDS.knights]: [
    { id: 'kn-m1', name: 'Mobilisation',   abbreviation: 'Mob',  base: 100, total: 100, percentage: 100 },
    { id: 'kn-m2', name: 'Groundworks',    abbreviation: 'Grd',  base: 100, total: 95,  percentage: 95  },
    { id: 'kn-m3', name: 'Superstructure', abbreviation: 'Sup',  base: 100, total: 82,  percentage: 82  },
    { id: 'kn-m4', name: 'Finishes',       abbreviation: 'Fin',  base: 100, total: 42,  percentage: 42  },
  ],
  [IDS.srm]: [
    { id: 'srm-m1', name: 'Design',        abbreviation: 'Des',  base: 100, total: 100, percentage: 100 },
    { id: 'srm-m2', name: 'Mobilisation',  abbreviation: 'Mob',  base: 100, total: 100, percentage: 100 },
    { id: 'srm-m3', name: 'Main Works',    abbreviation: 'Main', base: 100, total: 74,  percentage: 74  },
    { id: 'srm-m4', name: 'Handover',      abbreviation: 'Hand', base: 100, total: 18,  percentage: 18  },
  ],
  [IDS.bath]: [
    { id: 'bat-m1', name: 'Phase 1 Demo',  abbreviation: 'Ph1',  base: 100, total: 100, percentage: 100 },
    { id: 'bat-m2', name: 'Phase 2 Demo',  abbreviation: 'Ph2',  base: 100, total: 100, percentage: 100 },
    { id: 'bat-m3', name: 'Site Clearance',abbreviation: 'Clr',  base: 100, total: 100, percentage: 100 },
    { id: 'bat-m4', name: 'Handover',      abbreviation: 'Hnd',  base: 100, total: 100, percentage: 100 },
  ],
};

// ─── NCE items with milestone subentity (for radial→race group) ──────────────
// Populated after RACE_BY_ENTITY so the reference is valid.

// ─── Drill-down: RadialFanTreeChart — per-contractor NCE by type ──────────────
const NCE_BY_ENTITY: Record<string, RadialFanEntityData> = {
  [IDS.cisdi]: {
    total: 31, totalLabel: '31 NCEs',
    items: [
      { id: 'cis-design',   name: 'Design Changes',   abbreviation: 'Dsgn', count: 14 },
      { id: 'cis-material', name: 'Material Delays',  abbreviation: 'Mtrl', count: 9  },
      { id: 'cis-access',   name: 'Site Access',      abbreviation: 'Acc',  count: 5  },
      { id: 'cis-var',      name: 'Client Variation', abbreviation: 'Var',  count: 3  },
    ],
  },
  [IDS.srm]: {
    total: 22, totalLabel: '22 NCEs',
    items: [
      { id: 'srm-ground',  name: 'Ground Conditions', abbreviation: 'Gnd',  count: 9 },
      { id: 'srm-utility', name: 'Utility Clashes',   abbreviation: 'Util', count: 7 },
      { id: 'srm-weather', name: 'Adverse Weather',   abbreviation: 'Wthr', count: 6 },
    ],
  },
  [IDS.knights]: {
    total: 18, totalLabel: '18 NCEs',
    items: [
      { id: 'kn-design',  name: 'Design Change',    abbreviation: 'Dsgn', count: 8 },
      { id: 'kn-access',  name: 'Access Issues',    abbreviation: 'Acc',  count: 6 },
      { id: 'kn-weather', name: 'Adverse Weather',  abbreviation: 'Wthr', count: 4 },
    ],
  },
  [IDS.ska]: {
    total: 14, totalLabel: '14 NCEs',
    items: [
      { id: 'ska-design',   name: 'Design Change',     abbreviation: 'Dsgn', count: 7 },
      { id: 'ska-material', name: 'Material Supply',   abbreviation: 'Mtrl', count: 4 },
      { id: 'ska-utility',  name: 'Utility Diversion', abbreviation: 'Util', count: 3 },
    ],
  },
  [IDS.bath]: {
    total: 6, totalLabel: '6 NCEs',
    items: [
      { id: 'bat-asbestos', name: 'Asbestos Found',    abbreviation: 'Asb', count: 4 },
      { id: 'bat-struct',   name: 'Hidden Structure',  abbreviation: 'Str', count: 2 },
    ],
  },
};

const NCE_ITEMS_WITH_RACE = NCE_ITEMS.map(item => ({
  ...item,
  subentity: RACE_BY_ENTITY[item.id] as unknown as SubentityItem[],
}));

// ─── Balance scale — accepted vs submitted quotation value ───────────────────
const QUOTATION_LEFT  = { value: 36_900_000, count: 63, label: '£36.9M', subentity: NCE_ITEMS as unknown as SubentityItem[] };
const QUOTATION_RIGHT = { value: 46_900_000, count: 81, label: '£46.9M', subentity: NCE_ITEMS as unknown as SubentityItem[] };

const QUOTATION_BY_ENTITY: Record<string, QuotationSummary> = {
  [IDS.srm]:     { left: { value: 8_500_000,  count: 18, label: '£8.5M'  }, right: { value: 9_700_000,  count: 25, label: '£9.7M'  } },
  [IDS.cisdi]:   { left: { value: 12_300_000, count: 22, label: '£12.3M' }, right: { value: 16_400_000, count: 30, label: '£16.4M' } },
  [IDS.bath]:    { left: { value: 3_200_000,  count: 7,  label: '£3.2M'  }, right: { value: 4_100_000,  count: 12, label: '£4.1M'  } },
  [IDS.ska]:     { left: { value: 5_800_000,  count: 11, label: '£5.8M'  }, right: { value: 7_300_000,  count: 14, label: '£7.3M'  } },
  [IDS.knights]: { left: { value: 7_100_000,  count: 13, label: '£7.1M'  }, right: { value: 9_400_000,  count: 18, label: '£9.4M'  } },
};

// ─── Gauge — per-contractor + aggregate ──────────────────────────────────────
const GAUGE_BY_ENTITY: Record<string, GaugeEntityData> = {
  [IDS.cisdi]:   { confirmed: 23, total: 31 },
  [IDS.srm]:     { confirmed: 17, total: 22 },
  [IDS.knights]: { confirmed: 14, total: 18 },
  [IDS.ska]:     { confirmed: 11, total: 14 },
  [IDS.bath]:    { confirmed: 6,  total: 6  },
};
const GAUGE_AGGREGATE: GaugeEntityData = { confirmed: 71, total: 91 };


// ─── Variation status by project ─────────────────────────────────────────────
const VARIATION_STATUS_ITEMS: ContractorRow[] = [
  {
    id: 'clecim',
    name: 'Clecim SAS/ABB',
    abbreviation: 'CLM',
    percentage: 100,
    total: 7_332_242.34,
    totalLabel: '£7.33M (Total)',
    base: 7_332_242.34,
    baseLabel: '£7.33M',
    subentity: {
      total: 0,
      totalLabel: '£0.00',
      items: [
        { name: 'Accepted', count: 0 },
        { name: 'Submitted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },
        { name: 'Accepted', count: 0 },

      ],
    },
  },
  {
    id: 'andrew-scott',
    name: 'Andrew Scott (ASL)',
    abbreviation: 'ASL',
    percentage: 79.7,
    total: 5_845_038.74,
    totalLabel: '£5.85M (Total)',
    base: 7_332_242.34,
    baseLabel: '£7.33M',
    subentity: {
      total: 2_607_380.33,
      totalLabel: '£2.61M Breakdown',
      items: [
        { name: 'Accepted', count: 928_297.68 },
        { name: 'Submitted', count: 1_679_082.65 },
      ],
    },
  },
  {
    id: 'tenova',
    name: 'Tenova SPA',
    abbreviation: 'TNV',
    percentage: 71.3,
    total: 5_226_799,
    totalLabel: '£5.23M (Total)',
    base: 7_332_242.34,
    baseLabel: '£7.33M',
    subentity: {
      total: 4_290_585,
      totalLabel: '£4.29M Breakdown',
      items: [
        { name: 'Accepted', count: 0 },
        { name: 'Submitted', count: 4_290_585 },
      ],
    },
  },
  {
    id: 'wernick',
    name: 'Wernick',
    abbreviation: 'WRN',
    percentage: 48.4,
    total: 3_545_436.81,
    totalLabel: '£3.55M (Total)',
    base: 7_332_242.34,
    baseLabel: '£7.33M',
    subentity: {
      total: 3_423_989.97,
      totalLabel: '£3.42M Breakdown',
      items: [
        { name: 'Accepted', count: 3_203_220.59 },
        { name: 'Submitted', count: 220_769.38 },
      ],
    },
  },
];

const VARIATION_STATUS_RADIAL = {
  total: 11_900_000,
  totalLabel: '£11.9M Programme',
  items: [
    { id: 'accepted-total',  name: 'Accepted Total',  abbreviation: 'ACC', count: 5_200_000 , },
    { id: 'submitted-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'submitted-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'sbmitted-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'submtted-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'submittd-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'submitted-ttal', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'subitted-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'submited-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'submittd-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
    { id: 'submitte-total', name: 'Submitted Total', abbreviation: 'SUB', count: 6_700_000 },
  ],
};

// ─── EW Volume by Project — priority breakdown ───────────────────────────────
const EW_PRIORITY_BY_PROJECT: Record<string, ContractorRow[]> = {
  'hrp': [
    { id: 'hrp-high', name: 'High', abbreviation: 'HGH', base: 210, total: 1, percentage: 100, totalLabel: '1', baseLabel: '210' },
  ],
  'meltshop': [
    { id: 'mlt-high',     name: 'High',     abbreviation: 'HGH', base: 193, total: 193, percentage: 100,  totalLabel: '193', baseLabel: '193' },
    { id: 'mlt-veryhigh', name: 'Very High', abbreviation: 'VHI', base: 193, total: 127, percentage: 65.8, totalLabel: '127', baseLabel: '193' },
    { id: 'mlt-medium',   name: 'Medium',   abbreviation: 'MED', base: 193, total: 104, percentage: 53.9, totalLabel: '104', baseLabel: '193' },
    { id: 'mlt-low',      name: 'Low',      abbreviation: 'LOW', base: 193, total: 81,  percentage: 42,   totalLabel: '81',  baseLabel: '193' },
    { id: 'mlt-verylow',  name: 'Very Low', abbreviation: 'VLO', base: 193, total: 47,  percentage: 24.4, totalLabel: '47',  baseLabel: '193' },
  ],
  'pickleline': [
    { id: 'pcl-veryhigh', name: 'Very High', abbreviation: 'VHI', base: 19, total: 19, percentage: 100,  totalLabel: '19', baseLabel: '19' },
    { id: 'pcl-high',     name: 'High',     abbreviation: 'HGH', base: 19, total: 16, percentage: 84.2, totalLabel: '16', baseLabel: '19' },
    { id: 'pcl-medium',   name: 'Medium',   abbreviation: 'MED', base: 19, total: 9,  percentage: 47.4, totalLabel: '9',  baseLabel: '19' },
    { id: 'pcl-low',      name: 'Low',      abbreviation: 'LOW', base: 19, total: 9,  percentage: 47.4, totalLabel: '9',  baseLabel: '19' },
    { id: 'pcl-verylow',  name: 'Very Low', abbreviation: 'VLO', base: 19, total: 3,  percentage: 15.8, totalLabel: '3',  baseLabel: '19' },
  ],
  'programme': [
    { id: 'prg-low',     name: 'Low',      abbreviation: 'LOW', base: 9, total: 9, percentage: 100,  totalLabel: '9', baseLabel: '9' },
    { id: 'prg-medium',  name: 'Medium',   abbreviation: 'MED', base: 9, total: 3, percentage: 33.3, totalLabel: '3', baseLabel: '9' },
    { id: 'prg-verylow', name: 'Very Low', abbreviation: 'VLO', base: 9, total: 3, percentage: 33.3, totalLabel: '3', baseLabel: '9' },
  ],
};

const EW_RADIAL_ITEMS: NCEContractorRow[] = [
  { id: 'hrp',        name: 'HRP',        abbreviation: 'HRP', count: 1,   subentity: EW_PRIORITY_BY_PROJECT['hrp']        as unknown as SubentityItem[] },
  { id: 'meltshop',   name: 'Meltshop',   abbreviation: 'MLT', count: 552, subentity: EW_PRIORITY_BY_PROJECT['meltshop']   as unknown as SubentityItem[] },
  { id: 'pickleline', name: 'Pickleline', abbreviation: 'PCL', count: 56,  subentity: EW_PRIORITY_BY_PROJECT['pickleline'] as unknown as SubentityItem[] },
  { id: 'programme',  name: 'Programme',  abbreviation: 'PRG', count: 15,  subentity: EW_PRIORITY_BY_PROJECT['programme']  as unknown as SubentityItem[] },
];

const EW_RACE_ITEMS: ContractorRow[] = [
  { id: 'priority-high',      name: 'High',      abbreviation: 'HGH', base: 210, total: 210, percentage: 100,  totalLabel: '210', baseLabel: '210' },
  { id: 'priority-very-high', name: 'Very High', abbreviation: 'VHI', base: 210, total: 146, percentage: 69.5, totalLabel: '146', baseLabel: '210' },
  { id: 'priority-medium',    name: 'Medium',    abbreviation: 'MED', base: 210, total: 116, percentage: 55.2, totalLabel: '116', baseLabel: '210' },
  { id: 'priority-low',       name: 'Low',       abbreviation: 'LOW', base: 210, total: 99,  percentage: 47.1, totalLabel: '99',  baseLabel: '210' },
  { id: 'priority-very-low',  name: 'Very Low',  abbreviation: 'VLO', base: 210, total: 53,  percentage: 25.2, totalLabel: '53',  baseLabel: '210' },
];

// ─── EW project distribution — split bar broadcaster + race listener ─────────
const EW_SPLIT_ITEMS = [
  {
    id: 'ew-meltshop', name: 'Meltshop', abbreviation: 'MLT',
    implemented: 320, unimplemented: 232,
    subentity: [
      { id: 'ew-mlt-high',     name: 'High',     abbreviation: 'HGH', base: 552, total: 193, percentage: 35,   totalLabel: '193 EWs' },
      { id: 'ew-mlt-veryhigh', name: 'Very High', abbreviation: 'VHI', base: 552, total: 127, percentage: 23,   totalLabel: '127 EWs' },
      { id: 'ew-mlt-medium',   name: 'Medium',   abbreviation: 'MED', base: 552, total: 104, percentage: 18.8, totalLabel: '104 EWs' },
      { id: 'ew-mlt-low',      name: 'Low',      abbreviation: 'LOW', base: 552, total: 81,  percentage: 14.7, totalLabel: '81 EWs'  },
      { id: 'ew-mlt-verylow',  name: 'Very Low', abbreviation: 'VLO', base: 552, total: 47,  percentage: 8.5,  totalLabel: '47 EWs'  },
    ] as unknown as SubentityItem[],
  },
  {
    id: 'ew-pickleline', name: 'Pickleline', abbreviation: 'PKL',
    implemented: 35, unimplemented: 21,
    subentity: [
      { id: 'ew-pkl-veryhigh', name: 'Very High', abbreviation: 'VHI', base: 56, total: 19, percentage: 33.9, totalLabel: '19 EWs' },
      { id: 'ew-pkl-high',     name: 'High',     abbreviation: 'HGH', base: 56, total: 16, percentage: 28.6, totalLabel: '16 EWs' },
      { id: 'ew-pkl-medium',   name: 'Medium',   abbreviation: 'MED', base: 56, total: 9,  percentage: 16.1, totalLabel: '9 EWs'  },
      { id: 'ew-pkl-low',      name: 'Low',      abbreviation: 'LOW', base: 56, total: 9,  percentage: 16.1, totalLabel: '9 EWs'  },
      { id: 'ew-pkl-verylow',  name: 'Very Low', abbreviation: 'VLO', base: 56, total: 3,  percentage: 5.4,  totalLabel: '3 EWs'  },
    ] as unknown as SubentityItem[],
  },
  {
    id: 'ew-programme', name: 'Programme', abbreviation: 'PRG',
    implemented: 0, unimplemented: 15,
    subentity: [
      { id: 'ew-prg-low',     name: 'Low',      abbreviation: 'LOW', base: 15, total: 9, percentage: 60, totalLabel: '9 EWs' },
      { id: 'ew-prg-medium',  name: 'Medium',   abbreviation: 'MED', base: 15, total: 3, percentage: 20, totalLabel: '3 EWs' },
      { id: 'ew-prg-verylow', name: 'Very Low', abbreviation: 'VLO', base: 15, total: 3, percentage: 20, totalLabel: '3 EWs' },
    ] as unknown as SubentityItem[],
  },
  {
    id: 'ew-hrp', name: 'HRP', abbreviation: 'HRP',
    implemented: 1, unimplemented: 0,
    subentity: [
      { id: 'ew-hrp-high', name: 'High', abbreviation: 'HGH', base: 1, total: 1, percentage: 100, totalLabel: '1 EWs' },
    ] as unknown as SubentityItem[],
  },
];

const EW_SPLIT_RACE_ITEMS: ContractorRow[] = [
  { id: 'ew-s-high',     name: 'High',      abbreviation: 'HGH', base: 210, total: 210, percentage: 100,  totalLabel: '210 EWs', baseLabel: '210 EWs' },
  { id: 'ew-s-veryhigh', name: 'Very High', abbreviation: 'VHI', base: 210, total: 146, percentage: 69.5, totalLabel: '146 EWs', baseLabel: '210 EWs' },
  { id: 'ew-s-medium',   name: 'Medium',    abbreviation: 'MED', base: 210, total: 116, percentage: 55.2, totalLabel: '116 EWs', baseLabel: '210 EWs' },
  { id: 'ew-s-low',      name: 'Low',       abbreviation: 'LOW', base: 210, total: 99,  percentage: 47.1, totalLabel: '99 EWs',  baseLabel: '210 EWs' },
  { id: 'ew-s-verylow',  name: 'Very Low',  abbreviation: 'VLO', base: 210, total: 53,  percentage: 25.2, totalLabel: '53 EWs',  baseLabel: '210 EWs' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function InteractiveDemoPage() {
  const [selectedId,    setSelectedId]    = useState<string | undefined>(undefined);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(undefined);

  const handleClick = useCallback((id: string, label: string) => {
    setSelectedId(prev => (prev === id ? undefined : id));
    setSelectedLabel(prev => (prev === label ? undefined : label));
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleClear = useCallback(() => {
    setSelectedId(undefined);
    setSelectedLabel(undefined);
  }, []);

  return (
    <div style={styles.page}>

      <div style={styles.header}>
        <h1 style={styles.title}>Interactive Chart Demo</h1>
        <p style={styles.subtitle}>
          Click a contractor in the <strong style={{ color: '#e2e8f0' }}>Contract Value</strong> chart
          to drill down — all other charts switch to that contractor's detail. Click again to reset.
        </p>
        {selectedLabel && (
          <div style={styles.globalBadge}>
            <span style={styles.filterDot} />
            Filtered to: <strong style={{ marginLeft: 4 }}>{selectedLabel}</strong>
            <button style={styles.clearBtn} onClick={handleClear}>✕</button>
          </div>
        )}
      </div>

      {/* ── Broadcasters + dimming ── */}
      <div style={styles.row}>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>Contract Value</span>
            <span style={styles.badgeBroadcast}>broadcaster — click to drill down</span>
          </div>
          <StackedHorizontalBarChart
            data={BAR_DATA}
            onItemClick={handleClick}
            selectedId={selectedId}
            data-testid="demo-bar"
          />
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>Milestone Completion</span>
            <span style={styles.badge}>drills to contractor milestones</span>
          </div>
          <ProgressRaceChart
            items={RACE_ITEMS}
            itemsByEntity={RACE_BY_ENTITY}
            onItemClick={handleClick}
            selectedId={selectedId}
            data-testid="demo-race"
          />
        </div>

      </div>

      <div style={styles.row}>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>Variations by Package</span>
            <span style={styles.badge}>drills to contractor packages</span>
          </div>
          <SegmentedSplitBarChart
            items={VARIATION_ITEMS}
            itemsByEntity={VARIATION_BY_ENTITY}
            labelA="Implemented"
            labelB="Unimplemented"
            unit="variations"
            onItemClick={handleClick}
            selectedId={selectedId}
            data-testid="demo-split"
          />
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>NCE Distribution</span>
            <span style={styles.badge}>drills to NCE type breakdown</span>
          </div>
          <RadialFanTreeChart
            total={NCE_TOTAL}
            totalLabel={`${NCE_TOTAL} total NCEs`}
            items={NCE_ITEMS}
            dataByEntity={NCE_BY_ENTITY}
            onItemClick={handleClick}
            selectedId={selectedId}
            data-testid="demo-radial"
          />
        </div>

      </div>

      <div style={styles.row}>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>Compensation Events</span>
            <span style={styles.badge}>listener</span>
          </div>
          <SemiCircularGaugeChart
            confirmed={GAUGE_AGGREGATE.confirmed}
            total={GAUGE_AGGREGATE.total}
            label="NCEs confirmed as compensation events"
            selectedId={selectedId}
            selectedLabel={selectedLabel}
            gaugeByEntity={GAUGE_BY_ENTITY}
            data-testid="demo-gauge"
          />
        </div>

      </div>

      <VisualizationGroup
        items={[
          {
            type: CHART_TYPE.BALANCE_SCALE,
            left: QUOTATION_LEFT,
            right: QUOTATION_RIGHT,
            leftTitle: 'Accepted',
            rightTitle: 'Submitted',
            unit: 'quotations',
            dataByEntity: QUOTATION_BY_ENTITY,
          },
          {
            type: CHART_TYPE.RADIAL_FAN_TREE,
            total: NCE_TOTAL,
            totalLabel: `${NCE_TOTAL} total NCEs`,
            items: NCE_ITEMS,
            dataByEntity: NCE_BY_ENTITY,
          },
        ]}
        data-testid="demo-balance-radial-group"
      />

      <VisualizationGroup
        title="EW Project Distribution — Priority Breakdown Race"
        items={[
          {
            type: CHART_TYPE.SEGMENTED_SPLIT_BAR,
            items: EW_SPLIT_ITEMS,
            labelA: 'Critical/High Priority',
            labelB: 'Lower Priority',
            unit: 'EWs',
          },
          {
            type: CHART_TYPE.PROGRESS_RACE,
            items: EW_SPLIT_RACE_ITEMS,
          },
        ]}
        data-testid="demo-ew-split-race-group"
      />

      <VisualizationGroup
        title="Contractor Quotation Exposure — Accepted vs Submitted Drill-down"
        items={[
          {
            type: CHART_TYPE.PROGRESS_RACE,
            items: VARIATION_STATUS_ITEMS,
          },
          {
            type: CHART_TYPE.RADIAL_FAN_TREE,
            total: VARIATION_STATUS_RADIAL.total,
            totalLabel: VARIATION_STATUS_RADIAL.totalLabel,
            items: VARIATION_STATUS_RADIAL.items,

          },
        ]}
        data-testid="demo-variation-status-group"
      />

      <VisualizationGroup
        title="EW Volume by Project — Priority Breakdown Drill-down"
        items={[
          {
            type: CHART_TYPE.RADIAL_FAN_TREE,
            total: 624,
            totalLabel: '624 EWs',
            items: EW_RADIAL_ITEMS,
          },
          {
            type: CHART_TYPE.PROGRESS_RACE,
            items: EW_RACE_ITEMS,
          },
        ]}
        data-testid="demo-ew-volume-group"
      />

      {/* ── Trend listener ── */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelLabel}>Monthly Quotation Trend</span>
          <span style={styles.badge}>listener — switches to selected contractor</span>
        </div>
        {selectedLabel && (
          <div style={styles.filterBadge}>
            <span style={styles.filterDot} />
            Showing: <strong style={{ marginLeft: 4 }}>{selectedLabel}</strong>
          </div>
        )}
        <Trend
          points={AGGREGATE_POINTS}
          selectedId={selectedId}
          seriesByEntity={SERIES_BY_ENTITY}
          data-testid="demo-trend"
        />
      </div>

    </div>
  );
}

