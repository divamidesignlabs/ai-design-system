import type { NumberSystem } from '../../constants';
import type { SubentityPayload } from '../../types';

export interface GaugeEntityData {
  confirmed: number;
  total: number;
}

export interface SemiCircularGaugeChartProps {
  confirmed: number;
  total: number;
  label?: string;
  colorOffset?: number;
  selectedId?: string;
  selectedLabel?: string;
  gaugeByEntity?: Record<string, GaugeEntityData>;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  subentity?: SubentityPayload;
  numberSystem?: NumberSystem | null;
  testID?: string;
}
