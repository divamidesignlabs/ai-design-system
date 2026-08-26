import type { NumberSystem } from '../../constants';
import type { QuotationTrendPoint } from '../../types';

export interface TrendProps {
  points: QuotationTrendPoint[];
  selectedId?: string;
  seriesByEntity?: Record<string, QuotationTrendPoint[]>;
  colorOffset?: number;
  xLabel?: string | null;
  yLabel?: string | null;
  valuePrefix?: string | null;
  numberSystem?: NumberSystem | null;
  testID?: string;
  /** Progressive line-draw entry animation. Defaults to true (existing behavior). */
  animationEnabled?: boolean;
}
