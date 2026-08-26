import type { NumberSystem } from '../../constants';
import type { ContractorRow, SubentityPayload } from '../../types';

export interface WeeklyFlowProps {
  items: ContractorRow[];
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  numberSystem?: NumberSystem | null;
  testID?: string;
}
