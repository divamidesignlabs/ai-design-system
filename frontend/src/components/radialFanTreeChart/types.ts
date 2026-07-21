import type { NCEContractorRow, SubentityPayload } from '../../types';

export interface RadialFanEntityData {
  total: number;
  totalLabel?: string;
  items: NCEContractorRow[];
}

export interface RadialFanTreeChartProps {
  total: number;
  totalLabel?: string;
  items: NCEContractorRow[];
  dataByEntity?: Record<string, RadialFanEntityData>;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  selectedId?: string;
  width?: number;
  colorOffset?: number;
  testID?: string;
}
