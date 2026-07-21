import type { SubentityPayload } from '../../types';

export type HorizontalBarRow = {
  id: string;
  name: string;
  value: number;
  valueLabel?: string;
  subentity?: SubentityPayload;
};

export type HorizontalBarChartProps = {
  rows: HorizontalBarRow[];
  valuePrefix?: string;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  testID?: string;
};
