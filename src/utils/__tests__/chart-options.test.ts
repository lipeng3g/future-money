import { describe, expect, it } from 'vitest';
import { buildBalanceChartOption, buildCashFlowChartOption, getAdaptiveAxisLabelInterval, shouldDisableChartAnimation } from '@/utils/chart-options';
import type { DailySnapshot } from '@/types/timeline';
import type { MonthlySnapshot } from '@/types/analytics';

const createDay = (overrides: Partial<DailySnapshot> & Pick<DailySnapshot, 'date' | 'balance' | 'change'>): DailySnapshot => ({
  date: overrides.date,
  balance: overrides.balance,
  change: overrides.change,
  events: overrides.events ?? [],
  isWeekend: overrides.isWeekend ?? false,
  isToday: overrides.isToday ?? false,
  zone: overrides.zone ?? 'projected',
  reconciliationId: overrides.reconciliationId,
  snapshotId: overrides.snapshotId,
});

describe('chart-options', () => {
  it('会按点数自适应稀疏 x 轴标签', () => {
    expect(getAdaptiveAxisLabelInterval(5, 10)).toBe(0);
    expect(getAdaptiveAxisLabelInterval(12, 10)).toBe(1);
    expect(getAdaptiveAxisLabelInterval(30, 10)).toBe(2);
  });

  it('长时间线会关闭动画，短时间线保持动画', () => {
    expect(shouldDisableChartAnimation(179)).toBe(false);
    expect(shouldDisableChartAnimation(180)).toBe(true);
  });

  it('余额图在空时间线下不创建 dataZoom，避免无意义控件', () => {
    const option = buildBalanceChartOption({
      timeline: [],
      warningThreshold: 1000,
      chartType: 'area',
      showWeekends: true,
    });

    expect(option.xAxis.data).toEqual([]);
    expect(option.dataZoom).toEqual([]);
    expect(option.series).toHaveLength(1);
    expect(option.animation).toBe(true);
  });

  it('余额图在长时间线下会稀疏标签并关闭动画', () => {
    const timeline = Array.from({ length: 200 }, (_, index) =>
      createDay({
        date: `2025-01-${String((index % 28) + 1).padStart(2, '0')}`,
        balance: index,
        change: 1,
      }),
    );

    const option = buildBalanceChartOption({
      timeline,
      warningThreshold: 500,
      chartType: 'line',
    });

    expect(option.animation).toBe(false);
    expect(option.xAxis.axisLabel.interval).toBeGreaterThan(0);
    expect(option.dataZoom).toHaveLength(2);
  });

  it('月度收支图会输出正确的数据序列与标签策略', () => {
    const months: MonthlySnapshot[] = [
      { monthLabel: '2025-01', income: 1000, expense: 800, net: 200 },
      { monthLabel: '2025-02', income: 1200, expense: 900, net: 300 },
      { monthLabel: '2025-03', income: 900, expense: 1100, net: -200 },
      { monthLabel: '2025-04', income: 1400, expense: 1000, net: 400 },
      { monthLabel: '2025-05', income: 1600, expense: 1200, net: 400 },
      { monthLabel: '2025-06', income: 1500, expense: 1300, net: 200 },
      { monthLabel: '2025-07', income: 1700, expense: 900, net: 800 },
    ];

    const option = buildCashFlowChartOption(months);

    expect(option.xAxis.data).toEqual(months.map((item) => item.monthLabel));
    expect(option.xAxis.axisLabel.interval).toBeGreaterThan(0);
    expect(option.series[0].data).toEqual(months.map((item) => item.income));
    expect(option.series[1].data).toEqual(months.map((item) => -item.expense));
    expect(option.series[2].data).toEqual(months.map((item) => item.income - item.expense));
  });
});
