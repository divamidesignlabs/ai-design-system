import type { ContractorRow, SubentityPayload } from '../../types';

export interface ProgressRaceChartProps {
  items: ContractorRow[];
  itemsByEntity?: Record<string, ContractorRow[]>;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  selectedId?: string;
  colorOffset?: number;
  testID?: string;
}
