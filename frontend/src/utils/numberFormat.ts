import { NUMBER_SYSTEM } from '../constants';
import type { NumberSystem } from '../constants';

const INTERNATIONAL_THRESHOLDS = [
    { value: 1_000_000_000_000, suffix: 'T', divisor: 1_000_000_000_000 },
    { value: 1_000_000_000, suffix: 'B', divisor: 1_000_000_000 },
    { value: 1_000_000, suffix: 'M', divisor: 1_000_000 },
    { value: 1_000, suffix: 'K', divisor: 1_000 },
];

// Indian numbering: thousand, lakh (10^5), crore (10^7) — no international M/B equivalent.
const INDIAN_THRESHOLDS = [
    { value: 1_00_00_000, suffix: 'Cr', divisor: 1_00_00_000 },
    { value: 1_00_000, suffix: 'L', divisor: 1_00_000 },
    { value: 1_000, suffix: 'K', divisor: 1_000 },
];

export function formatNumber(
    value: number,
    precision: number = 1,
    numberSystem: NumberSystem = NUMBER_SYSTEM.INTERNATIONAL,
): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const thresholds = numberSystem === NUMBER_SYSTEM.INDIAN ? INDIAN_THRESHOLDS : INTERNATIONAL_THRESHOLDS;

    for (const threshold of thresholds) {
        if (abs >= threshold.value) {
            const formatted = (abs / threshold.divisor).toFixed(precision);
            return `${sign}${formatted}${threshold.suffix}`;
        }
    }

    if (precision === 0) return `${sign}${Math.round(abs)}`;
    // parseFloat strips trailing zeros: "5.20" → 5.2, "5.00" → 5
    return `${sign}${parseFloat(abs.toFixed(precision))}`;
}
