import { describe, expect, it } from 'vitest';
import {
  buildBalanceChartFocusInsight,
  buildBalanceChartFocusTargets,
  buildBalanceChartOption,
  buildCashFlowChartOption,
  getAdaptiveAxisLabelInterval,
  getBalanceChartZoomWindow,
  getDefaultBalanceChartFocusDate,
  shouldDisableChartAnimation,
} from '@/utils/chart-options';
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

const createUniqueDate = (index: number) => {
  const base = new Date(Date.UTC(2025, 0, 1 + index));
  return base.toISOString().slice(0, 10);
};

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

  it('余额图优先聚焦首次预警，否则回落到今天或最近对账', () => {
    const warningTimeline = [
      createDay({ date: '2025-01-01', balance: 2000, change: 0 }),
      createDay({ date: '2025-01-02', balance: 900, change: -1100 }),
      createDay({ date: '2025-01-03', balance: 1200, change: 300, isToday: true }),
    ];
    expect(getDefaultBalanceChartFocusDate(warningTimeline, 1000, '2025-01-01')).toBe('2025-01-02');

    const todayTimeline = [
      createDay({ date: '2025-01-01', balance: 2000, change: 0 }),
      createDay({ date: '2025-01-02', balance: 1800, change: -200, isToday: true }),
    ];
    expect(getDefaultBalanceChartFocusDate(todayTimeline, 1000, '2025-01-01')).toBe('2025-01-02');
    expect(getDefaultBalanceChartFocusDate([
      createDay({ date: '2025-01-01', balance: 2000, change: 0 }),
      createDay({ date: '2025-01-02', balance: 1800, change: -200 }),
    ], 1000, '2025-01-01')).toBe('2025-01-01');
  });

  it('会生成可复用的余额图聚焦目标，供图表工具条和统计卡共享', () => {
    const timeline = [
      createDay({ date: '2025-01-01', balance: 2000, change: 0 }),
      createDay({ date: '2025-01-02', balance: 900, change: -1100, isToday: true }),
      createDay({ date: '2025-01-03', balance: 2600, change: 1700 }),
    ];

    expect(buildBalanceChartFocusTargets(timeline, 1000, '2025-01-01')).toEqual([
      { key: 'latest', label: '最新区间', date: '2025-01-03' },
      { key: 'today', label: '今天', date: '2025-01-02' },
      { key: 'warning', label: '首次预警', date: '2025-01-02' },
      { key: 'min', label: '最低点', date: '2025-01-02' },
      { key: 'max', label: '最高点', date: '2025-01-03' },
      { key: 'reconciliation', label: '最近对账', date: '2025-01-01' },
    ]);
  });

  it('会为首次预警生成可读解释，包含阈值缺口与事件摘要', () => {
    const timeline = [
      createDay({ date: '2025-01-01', balance: 2200, change: 0 }),
      createDay({
        date: '2025-01-02',
        balance: 900,
        change: -1300,
        events: [
          {
            id: 'occ-1',
            eventId: 'rule-1',
            name: '房租',
            category: 'expense',
            amount: 1300,
            date: '2025-01-02',
          },
        ],
      }),
    ];

    const insight = buildBalanceChartFocusInsight({
      timeline,
      warningThreshold: 1000,
      focusKey: 'warning',
    });

    expect(insight).toMatchObject({
      key: 'warning',
      tone: 'warning',
      date: '2025-01-02',
      balance: 900,
    });
    expect(insight?.summary).toContain('首次跌破预警线');
    expect(insight?.detail).toContain('比你的安全线少');
    expect(insight?.eventSummary).toContain('房租');
  });

  it('会为最高点和最近对账生成不同语气的解释', () => {
    const timeline = [
      createDay({ date: '2025-01-01', balance: 1800, change: 0, zone: 'frozen' }),
      createDay({ date: '2025-01-02', balance: 2600, change: 800 }),
    ];

    const maxInsight = buildBalanceChartFocusInsight({
      timeline,
      warningThreshold: 1000,
      focusKey: 'max',
      reconciliationDate: '2025-01-01',
      reconciliationBalance: 1800,
    });
    const reconciliationInsight = buildBalanceChartFocusInsight({
      timeline,
      warningThreshold: 1000,
      focusKey: 'reconciliation',
      reconciliationDate: '2025-01-01',
      reconciliationBalance: 1800,
    });

    expect(maxInsight?.tone).toBe('success');
    expect(maxInsight?.summary).toContain('最高余额');
    expect(reconciliationInsight?.tone).toBe('info');
    expect(reconciliationInsight?.summary).toContain('对账锚点');
    expect(reconciliationInsight?.detail).toContain('¥1,800');
  });

  it('会围绕聚焦日期生成默认时间窗，并在尾部自动贴边', () => {
    const labels = Array.from({ length: 120 }, (_, index) => createUniqueDate(index));

    expect(getBalanceChartZoomWindow(labels, labels[40], 30)).toEqual({
      startValue: 30,
      endValue: 59,
    });

    expect(getBalanceChartZoomWindow(labels, labels.at(-1), 30)).toEqual({
      startValue: 90,
      endValue: 119,
    });
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

  it('余额图在长时间线下会稀疏标签并围绕聚焦点设置默认时间窗', () => {
    const timeline = Array.from({ length: 200 }, (_, index) =>
      createDay({
        date: createUniqueDate(index),
        balance: index,
        change: 1,
        isToday: index === 150,
      }),
    );

    const option = buildBalanceChartOption({
      timeline,
      warningThreshold: 500,
      chartType: 'line',
      focusDate: timeline[150].date,
    });

    expect(option.animation).toBe(false);
    expect(option.xAxis.axisLabel.interval).toBeGreaterThan(0);
    expect(option.dataZoom).toHaveLength(2);
    expect(option.dataZoom[0].startValue).toBeGreaterThan(0);
    expect(option.dataZoom[0].endValue).toBeLessThan(timeline.length);
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
