import type { ContractorRow, SubentityPayload } from '../../types';

export interface WeeklyFlowProps {
  items: ContractorRow[];
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  testID?: string;
}
