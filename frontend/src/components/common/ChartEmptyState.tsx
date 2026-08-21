import { UI } from '../../canvas/canvasUtils';

interface ChartEmptyStateProps {
  width: number;
  height: number;
  message?: string;
  testID?: string;
}

export function ChartEmptyState({
  width,
  height,
  message = 'No data available',
  testID,
}: ChartEmptyStateProps) {
  return (
    <div
      data-testid={testID}
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        background: UI.emptyBg,
        color: UI.emptyText,
        fontSize: 14,
        fontFamily: "'Satoshi Variable', 'DM Sans', sans-serif",
      }}
    >
      {message}
    </div>
  );
}
