import type { QuotationTrendPoint } from '../../types';

export interface TrendProps {
  points: QuotationTrendPoint[];
  selectedId?: string;
  seriesByEntity?: Record<string, QuotationTrendPoint[]>;
  colorOffset?: number;
  xLabel?: string | null;
  yLabel?: string | null;
  valuePrefix?: string | null;
  testID?: string;
  /** Progressive line-draw entry animation. Defaults to true (existing behavior). */
  animationEnabled?: boolean;
}
