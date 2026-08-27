import type { NumberSystem } from '../../constants';
import type { EWOpenContractorRow, SubentityPayload } from '../../types';

export interface RankedCardLeaderboardProps {
  items: EWOpenContractorRow[];
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  numberSystem?: NumberSystem | null;
  testID?: string;
}
