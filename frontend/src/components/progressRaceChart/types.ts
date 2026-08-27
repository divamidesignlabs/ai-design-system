import type { NumberSystem } from '../../constants';
import type { ContractorRow, SubentityPayload } from '../../types';

export interface ProgressRaceChartProps {
  items: ContractorRow[];
  itemsByEntity?: Record<string, ContractorRow[]>;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  selectedId?: string;
  colorOffset?: number;
  numberSystem?: NumberSystem | null;
  testID?: string;
}
