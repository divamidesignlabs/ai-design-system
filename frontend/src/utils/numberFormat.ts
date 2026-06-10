const THRESHOLDS = [
    { value: 1_000_000_000_000, suffix: 'T', divisor: 1_000_000_000_000 },
    { value: 1_000_000_000, suffix: 'B', divisor: 1_000_000_000 },
    { value: 1_000_000, suffix: 'M', divisor: 1_000_000 },
    { value: 1_000, suffix: 'K', divisor: 1_000 },
];

export function formatNumber(value: number, precision: number = 1): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    for (const threshold of THRESHOLDS) {
        if (abs >= threshold.value) {
            const formatted = (abs / threshold.divisor).toFixed(precision);
            return `${sign}${formatted}${threshold.suffix}`;
        }
    }

    if (precision === 0) return `${sign}${Math.round(abs)}`;
    // parseFloat strips trailing zeros: "5.20" → 5.2, "5.00" → 5
    return `${sign}${parseFloat(abs.toFixed(precision))}`;
}
