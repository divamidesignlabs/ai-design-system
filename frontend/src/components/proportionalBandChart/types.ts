import type { NumberSystem } from '../../constants';
import type { EWSeverityRow, SubentityPayload } from '../../types';

export interface ProportionalBandChartProps {
  severities: EWSeverityRow[];
  colorOffset?: number;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  numberSystem?: NumberSystem | null;
  testID?: string;
}
