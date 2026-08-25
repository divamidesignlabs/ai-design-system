/**
 * Dev-only theme toggle for previewing charts in both themes.
 *
 * Why this exists: every chart in this package resolves its colours from
 * `--chart-*` custom properties at draw time, and the HOST app defines those.
 * This dev app defines none of them, so it always rendered with the dark
 * fallbacks baked into canvasUtils — there was no way to see a chart in light
 * theme without editing source or typing custom properties into a console.
 *
 * The two value sets below are the real ARKA values, lifted from the consuming
 * app's `theme.ts` (its darkTheme / lightTheme chart blocks), so this preview
 * cannot flatter the palette with numbers the product does not actually use.
 *
 * Applied as inline custom properties on <html>. That is deliberately the same
 * route a host might use, and canvasUtils' MutationObserver watches `style` on
 * the root element, so charts repaint on the next frame with no extra plumbing.
 *
 * NOT exported from src/index.ts — this is dev-app scaffolding, not library API.
 */
import { useEffect, useState } from 'react';

const CHART_DARK: Record<string, string> = {
  '--chart-bg': '#0C0E12',
  '--chart-bg-alt': '#0C1420',
  '--chart-surface': '#13161B',
  '--chart-border': '#22262F',
  '--chart-blue': '#4C93D9',
  '--chart-cyan': '#36BFFA',
  '--chart-orange': '#EC772A',
  '--chart-red': '#EC772A',
  '--chart-green': '#5DA537',
  '--chart-purple': '#818FF8',
  '--chart-amber': '#EEBF3B',
  '--chart-teal': '#69DFE9',
  '--chart-teal-dark': '#00818F',
  '--chart-bar-bg': '#7DB9DF',
  '--chart-text-1': '#F7F9FA',
  '--chart-text-2': '#B3B5B6',
  '--chart-text-3': '#94979C',
  '--chart-text-4': '#334155',
  '--chart-axis-label': '#F7F7F7',
  '--chart-value': '#F7F7F7',
  '--chart-legend-label': '#B3B5B6',
  '--chart-track': 'rgba(255,255,255,0.07)',
  '--chart-divider': 'rgba(255,255,255,0.12)',
  '--chart-rule': 'rgba(255,255,255,0.08)',
  '--chart-empty-bg': 'rgba(255,255,255,0.03)',
  '--chart-empty-text': 'rgba(255,255,255,0.35)',
};

const CHART_LIGHT: Record<string, string> = {
  '--chart-bg': '#FAFCFF',
  '--chart-bg-alt': '#FFFFFF',
  '--chart-surface': '#FFFFFF',
  '--chart-border': '#C8D8EA',
  '--chart-blue': '#2D70F7',
  '--chart-cyan': '#458C92',
  '--chart-orange': '#B65B1A',
  '--chart-red': '#B65B1A',
  '--chart-green': '#267A3D',
  '--chart-purple': '#654EC0',
  '--chart-amber': '#8A6A00',
  '--chart-teal': '#458C92',
  '--chart-teal-dark': '#356E75',
  '--chart-bar-bg': '#2D70F7',
  '--chart-text-1': '#131C24',
  '--chart-text-2': '#334152',
  '--chart-text-3': '#536273',
  '--chart-text-4': '#334155',
  '--chart-axis-label': '#334152',
  '--chart-value': '#131C24',
  '--chart-legend-label': '#334152',
  '--chart-track': '#DCE8F4',
  '--chart-divider': '#DCE7F3',
  '--chart-rule': '#E6EEF7',
  '--chart-empty-bg': '#FAFCFF',
  '--chart-empty-text': '#617081',
};

type Mode = 'dark' | 'light';

const STORAGE_KEY = 'ds-chart-theme';

function apply(mode: Mode): void {
  const root = document.documentElement;
  const vars = mode === 'light' ? CHART_LIGHT : CHART_DARK;
  // Iterate the union of both key sets so switching can never leave a stale
  // value behind, even if the two stop having identical keys.
  for (const name of Object.keys({ ...CHART_DARK, ...CHART_LIGHT })) {
    const value = vars[name];
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }
  // The page chrome outside the canvases is styled by App.css for dark only, so
  // give the body a matching ground. Otherwise light charts sit on a black page
  // and the contrast being judged is not the one the product actually has.
  root.style.setProperty('color-scheme', mode);
  document.body.style.background = mode === 'light' ? '#FAFCFF' : '';
  root.setAttribute('data-theme', mode);
}

export function ChartThemeToggle() {
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem(STORAGE_KEY) as Mode | null) ?? 'dark',
  );

  useEffect(() => {
    apply(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const next: Mode = mode === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      title={`Preview charts in ${next} theme`}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 9999,
        padding: '8px 14px',
        borderRadius: 999,
        border: `1px solid ${mode === 'light' ? '#C8D8EA' : '#22262F'}`,
        background: mode === 'light' ? '#FFFFFF' : '#13161B',
        color: mode === 'light' ? '#131C24' : '#F7F9FA',
        font: '500 12px/1 system-ui, sans-serif',
        letterSpacing: '0.04em',
        cursor: 'pointer',
      }}
    >
      {mode === 'dark' ? 'Dark → Light' : 'Light → Dark'}
    </button>
  );
}
