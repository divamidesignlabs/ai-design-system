import { UI } from '../../canvas/canvasUtils';

export interface ToggleButtonProps {
  expanded: boolean;
  onToggle: () => void;
  labelExpanded?: string;
  labelCollapsed?: string;
  testID?: string;
}

export function ToggleButton({
  expanded,
  onToggle,
  labelExpanded = 'View Less',
  labelCollapsed = 'View More',
  testID,
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      data-testid={testID}
      onClick={onToggle}
      style={{
        display: 'flex',
        width: 90,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        boxSizing: 'border-box',
        border: 'none',
        borderRadius: 6,
        color: UI.accent,
        fontSize: 14,
        fontFamily: "'Satoshi Variable', 'DM Sans', sans-serif",
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: '19.5px',
        textAlign: 'center',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {expanded ? labelExpanded : labelCollapsed}
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
      >
        <path
          d="M2 3.5L5 6.5L8 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
