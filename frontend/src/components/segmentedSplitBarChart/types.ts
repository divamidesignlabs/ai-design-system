import type { NumberSystem } from '../../constants';
import type { VariationRow, SubentityPayload } from '../../types';

export interface SegmentedSplitBarChartProps {
  items: VariationRow[];
  itemsByEntity?: Record<string, VariationRow[]>;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  selectedId?: string;
  labelA?: string;
  labelB?: string;
  unit?: string;
  numberSystem?: NumberSystem | null;
  testID?: string;
}
