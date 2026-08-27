import { NUMBER_SYSTEM } from '../constants';
import { formatNumber } from './numberFormat';

describe('formatNumber', () => {
  describe('international system (default)', () => {
    it('formats thousands, millions, billions, and trillions', () => {
      expect(formatNumber(1_500)).toBe('1.5K');
      expect(formatNumber(1_500_000)).toBe('1.5M');
      expect(formatNumber(1_500_000_000)).toBe('1.5B');
      expect(formatNumber(1_500_000_000_000)).toBe('1.5T');
    });

    it('falls back to a plain number below the smallest threshold', () => {
      expect(formatNumber(999)).toBe('999');
      expect(formatNumber(5.2)).toBe('5.2');
    });

    it('is the default when numberSystem is omitted', () => {
      expect(formatNumber(1_500_000)).toBe(formatNumber(1_500_000, 1, NUMBER_SYSTEM.INTERNATIONAL));
    });
  });

  describe('Indian system', () => {
    it('formats thousands, lakhs, and crores', () => {
      expect(formatNumber(1_000, 1, NUMBER_SYSTEM.INDIAN)).toBe('1.0K');
      expect(formatNumber(1_50_000, 1, NUMBER_SYSTEM.INDIAN)).toBe('1.5L');
      expect(formatNumber(2_00_00_000, 1, NUMBER_SYSTEM.INDIAN)).toBe('2.0Cr');
    });

    it('has no international M/B suffixes', () => {
      expect(formatNumber(15_000_000, 1, NUMBER_SYSTEM.INDIAN)).toBe('1.5Cr');
    });

    it('falls back to a plain number below the smallest threshold', () => {
      expect(formatNumber(999, 1, NUMBER_SYSTEM.INDIAN)).toBe('999');
    });
  });

  describe('sign and precision handling', () => {
    it('preserves the negative sign above and below threshold', () => {
      expect(formatNumber(-1_500)).toBe('-1.5K');
      expect(formatNumber(-999)).toBe('-999');
    });

    it('respects a custom precision', () => {
      expect(formatNumber(1_234_000, 2)).toBe('1.23M');
      expect(formatNumber(1_000, 0)).toBe('1K');
    });

    it('strips trailing zeros below threshold', () => {
      expect(formatNumber(5, 2)).toBe('5');
    });
  });
});
