import type { ContractData, SubentityPayload } from '../../types';

export interface StackedHorizontalBarChartProps {
  data: ContractData;
  dataByEntity?: Record<string, ContractData>;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  selectedId?: string;
  testID?: string;
}
