import type { QuotationSide, QuotationSummary, SubentityPayload } from '../../types';

export interface BalanceScaleChartProps {
  left: QuotationSide;
  right: QuotationSide;
  leftTitle?: string;
  rightTitle?: string;
  unit?: string;
  selectedId?: string;
  dataByEntity?: Record<string, QuotationSummary>;
  onItemClick?: (id: string, label: string, subentity?: SubentityPayload) => void;
  testID?: string;
}
