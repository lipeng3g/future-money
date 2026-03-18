import { describe, it, expect } from 'vitest';
import type { MonthlySnapshot } from '@/types/analytics';
import { buildCashFlowChartOption, getAdaptiveAxisLabelInterval, shouldDisableChartAnimation } from '@/utils/chart-options-cashflow';

describe('buildCashFlowChartOption', () => {
  const createMockSnapshot = (overrides: Partial<MonthlySnapshot> = {}): MonthlySnapshot => ({
    monthLabel: '2025-01',
    income: 10000,
    expense: 5000,
    balance: 5000,
    ...overrides,
  });

  it('should generate chart option for empty months array', () => {
    const result = buildCashFlowChartOption([]);

    expect(result).toBeDefined();
    expect(result.xAxis?.data).toEqual([]);
    expect(result.series).toHaveLength(3);
    // Animation is enabled for empty data (only disabled when >= 180 points)
    expect(result.animation).toBe(true);
  });

  it('should map income, expense, and net data correctly', () => {
    const months = [
      createMockSnapshot({ monthLabel: '2025-01', income: 10000, expense: 5000 }),
      createMockSnapshot({ monthLabel: '2025-02', income: 12000, expense: 4000 }),
    ];

    const result = buildCashFlowChartOption(months);

    expect(result.xAxis?.data).toEqual(['2025-01', '2025-02']);
    expect(result.series?.[0]?.data).toEqual([10000, 12000]); // income (bar)
    expect(result.series?.[1]?.data).toEqual([-5000, -4000]); // expense (bar, negated)
    expect(result.series?.[2]?.data).toEqual([5000, 8000]); // net (line)
  });

  it('should set animation to false when data points exceed 180', () => {
    const months = Array.from({ length: 200 }, (_, i) =>
      createMockSnapshot({
        monthLabel: `2024-${String(Math.floor(i / 12) + 1).padStart(2, '0')}`,
        income: 10000,
        expense: 5000,
      })
    );

    const result = buildCashFlowChartOption(months);
    expect(result.animation).toBe(false);
  });

  it('should set animation to true when data points are within threshold', () => {
    const months = [
      createMockSnapshot({ monthLabel: '2025-01', income: 10000, expense: 5000 }),
      createMockSnapshot({ monthLabel: '2025-02', income: 12000, expense: 4000 }),
    ];

    const result = buildCashFlowChartOption(months);
    expect(result.animation).toBe(true);
  });

  it('should include all three series types: bar (income), bar (expense), line (net)', () => {
    const months = [createMockSnapshot({ income: 10000, expense: 5000 })];

    const result = buildCashFlowChartOption(months);

    expect(result.series?.[0]?.type).toBe('bar');
    expect(result.series?.[0]?.name).toBe('收入');
    expect(result.series?.[1]?.type).toBe('bar');
    expect(result.series?.[1]?.name).toBe('支出');
    expect(result.series?.[2]?.type).toBe('line');
    expect(result.series?.[2]?.name).toBe('结余');
  });

  it('should configure tooltip with correct structure', () => {
    const months = [createMockSnapshot({ monthLabel: '2025-01', income: 10000, expense: 5000 })];

    const result = buildCashFlowChartOption(months);

    expect(result.tooltip).toBeDefined();
    expect(result.tooltip?.trigger).toBe('axis');
    expect(result.tooltip?.formatter).toBeDefined();
  });

  it('should configure legend with Chinese labels', () => {
    const months = [createMockSnapshot()];

    const result = buildCashFlowChartOption(months);

    expect(result.legend?.data).toContain('收入');
    expect(result.legend?.data).toContain('支出');
    expect(result.legend?.data).toContain('结余');
  });

  it('should configure x-axis with category type and labels', () => {
    const months = [
      createMockSnapshot({ monthLabel: '2025-01' }),
      createMockSnapshot({ monthLabel: '2025-02' }),
    ];

    const result = buildCashFlowChartOption(months);

    expect(result.xAxis?.type).toBe('category');
    expect(result.xAxis?.data).toEqual(['2025-01', '2025-02']);
  });

  it('should configure y-axis with value type', () => {
    const months = [createMockSnapshot()];

    const result = buildCashFlowChartOption(months);

    expect(result.yAxis?.type).toBe('value');
    expect(result.yAxis?.axisLabel).toBeDefined();
    expect(result.yAxis?.axisLabel?.formatter).toBeDefined();
  });

  it('should configure grid with correct spacing', () => {
    const months = [createMockSnapshot()];

    const result = buildCashFlowChartOption(months);

    expect(result.grid?.left).toBe(50);
    expect(result.grid?.right).toBe(12);
    expect(result.grid?.top).toBe(48);
    expect(result.grid?.bottom).toBe(30);
  });

  it('should handle negative net balance (expense > income)', () => {
    const months = [createMockSnapshot({ income: 5000, expense: 8000 })];

    const result = buildCashFlowChartOption(months);

    // net = income - expense = 5000 - 8000 = -3000
    expect(result.series?.[2]?.data).toEqual([-3000]);
  });
});

describe('getAdaptiveAxisLabelInterval', () => {
  it('should return 0 when total points <= target labels', () => {
    expect(getAdaptiveAxisLabelInterval(0, 6)).toBe(0);
    expect(getAdaptiveAxisLabelInterval(3, 6)).toBe(0);
    expect(getAdaptiveAxisLabelInterval(6, 6)).toBe(0);
  });

  it('should calculate interval when total points > target labels', () => {
    expect(getAdaptiveAxisLabelInterval(12, 6)).toBe(1);
    expect(getAdaptiveAxisLabelInterval(18, 6)).toBe(2);
    expect(getAdaptiveAxisLabelInterval(24, 6)).toBe(3);
  });
});

describe('shouldDisableChartAnimation', () => {
  it('should return false when points < 180', () => {
    expect(shouldDisableChartAnimation(0)).toBe(false);
    expect(shouldDisableChartAnimation(100)).toBe(false);
    expect(shouldDisableChartAnimation(179)).toBe(false);
  });

  it('should return true when points >= 180', () => {
    expect(shouldDisableChartAnimation(180)).toBe(true);
    expect(shouldDisableChartAnimation(200)).toBe(true);
  });
});