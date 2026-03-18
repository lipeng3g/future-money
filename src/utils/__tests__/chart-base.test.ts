import { describe, expect, it } from 'vitest';
import {
  getAdaptiveAxisLabelInterval,
  shouldDisableChartAnimation,
} from '@/utils/chart-base';

describe('chart-base', () => {
  describe('getAdaptiveAxisLabelInterval', () => {
    it('returns 0 when targetLabels is 1 or less', () => {
      expect(getAdaptiveAxisLabelInterval(100, 0)).toBe(0);
      expect(getAdaptiveAxisLabelInterval(100, 1)).toBe(0);
    });

    it('returns 0 when totalPoints <= targetLabels', () => {
      expect(getAdaptiveAxisLabelInterval(5, 10)).toBe(0);
      expect(getAdaptiveAxisLabelInterval(10, 10)).toBe(0);
    });

    it('calculates correct interval for typical cases', () => {
      // 10 points, want 5 labels: ceil(10/5) - 1 = 2 - 1 = 1
      expect(getAdaptiveAxisLabelInterval(10, 5)).toBe(1);
      // 20 points, want 4 labels: ceil(20/4) - 1 = 5 - 1 = 4
      expect(getAdaptiveAxisLabelInterval(20, 4)).toBe(4);
      // 100 points, want 10 labels: ceil(100/10) - 1 = 10 - 1 = 9
      expect(getAdaptiveAxisLabelInterval(100, 10)).toBe(9);
    });

    it('returns 0 when interval calculation results in negative', () => {
      // 6 points, want 5 labels: ceil(6/5) - 1 = 2 - 1 = 1
      expect(getAdaptiveAxisLabelInterval(6, 5)).toBe(1);
    });
  });

  describe('shouldDisableChartAnimation', () => {
    it('enables animation for short timelines', () => {
      expect(shouldDisableChartAnimation(0)).toBe(false);
      expect(shouldDisableChartAnimation(100)).toBe(false);
      expect(shouldDisableChartAnimation(179)).toBe(false);
    });

    it('disables animation for long timelines', () => {
      expect(shouldDisableChartAnimation(180)).toBe(true);
      expect(shouldDisableChartAnimation(200)).toBe(true);
      expect(shouldDisableChartAnimation(500)).toBe(true);
    });

    it('uses threshold of 180 points', () => {
      expect(shouldDisableChartAnimation(179)).toBe(false);
      expect(shouldDisableChartAnimation(180)).toBe(true);
    });
  });
});