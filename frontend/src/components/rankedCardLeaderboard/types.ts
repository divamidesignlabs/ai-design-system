import type { EWOpenContractorRow, SubentityPayload } from '../../types';

export interface RankedCardLeaderboardProps {
  items: EWOpenContractorRow[];
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  testID?: string;
}
