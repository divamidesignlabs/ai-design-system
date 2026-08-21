import type React from 'react';

import { UI } from '../../canvas/canvasUtils';

const SANS = "'Satoshi Variable', 'DM Sans', sans-serif";

const LABEL: React.CSSProperties = {
  color:      UI.takeaway,
  fontFamily: SANS,
  fontSize:   18,
  fontWeight: 400,
  lineHeight: 1.65,
};

export function Takeaway({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '8px 0px',
        border: 'transparent',
        borderRadius: 5,
        background: 'transparent',
      }}
    >
      <span
        style={{
          fontSize: 18, fontWeight: 500, color: UI.text1,
          fontFamily: SANS, lineHeight: 1.65,
          marginRight: 8,
        }}
      >
        Takeaway
      </span>
      <span style={{ ...LABEL }}>
        {text}
      </span>
    </div>
  );
}
