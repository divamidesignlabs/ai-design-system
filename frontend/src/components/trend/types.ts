import type { QuotationTrendPoint } from '../../types';

export interface TrendProps {
  points: QuotationTrendPoint[];
  selectedId?: string;
  seriesByEntity?: Record<string, QuotationTrendPoint[]>;
  colorOffset?: number;
  xLabel?: string;
  yLabel?: string;
  valuePrefix?: string;
  testID?: string;
}
