import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { aggregate } from '@/utils/aggregate';
import { dailyBalances, totalDailyBalances } from '@/utils/balance';
import { addMonths, today } from '@/utils/date';
import { centsToYuan } from '@/utils/money';

export interface ChartSeries {
  name: string;
  color: string;
}

export interface ChartValue {
  time: string;
  value: number;
  type: string;
}

export interface ChartDataResult {
  values: ChartValue[];
  series: ChartSeries[];
  /** 聚合标签 → 该区间末真实日期，用于点击图表定位当日明细 */
  labelToDate: Record<string, string>;
  from: string;
  to: string;
}

export const TOTAL_NAME = '总资产';
const TOTAL_COLOR = '#64748b';

/** 解析时间范围预设，如 'P1M-F12M' = 过去 1 月 ~ 未来 12 月 */
export function parseRange(preset: string): { from: string; to: string } {
  const matched = /P(\d+)M-F(\d+)M/.exec(preset);
  const past = matched ? Number(matched[1]) : 1;
  const future = matched ? Number(matched[2]) : 12;
  const base = today();
  return { from: addMonths(base, -past), to: addMonths(base, future) };
}

/** 由 store 派生图表所需的多系列折线数据（总资产线 + 各账户线） */
export function useChartData(): ChartDataResult {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const granularity = useStore((s) => s.granularity);
  const rangePreset = useStore((s) => s.rangePreset);
  const visibleAccountIds = useStore((s) => s.visibleAccountIds);
  const showTotal = useStore((s) => s.showTotal);

  return useMemo(() => {
    const { from, to } = parseRange(rangePreset);
    const activeAccounts = accounts.filter((a) => !a.archived);
    const shown = visibleAccountIds.length
      ? activeAccounts.filter((a) => visibleAccountIds.includes(a.id))
      : activeAccounts;

    const values: ChartValue[] = [];
    const series: ChartSeries[] = [];
    const labelToDate: Record<string, string> = {};

    if (showTotal && activeAccounts.length) {
      series.push({ name: TOTAL_NAME, color: TOTAL_COLOR });
      for (const point of aggregate(
        totalDailyBalances(activeAccounts, transactions, from, to),
        granularity,
      )) {
        values.push({ time: point.label, value: centsToYuan(point.value), type: TOTAL_NAME });
        labelToDate[point.label] = point.date;
      }
    }

    for (const account of shown) {
      series.push({ name: account.name, color: account.color });
      for (const point of aggregate(
        dailyBalances(account, transactions, from, to),
        granularity,
      )) {
        values.push({ time: point.label, value: centsToYuan(point.value), type: account.name });
        labelToDate[point.label] = point.date;
      }
    }

    return { values, series, labelToDate, from, to };
  }, [accounts, transactions, granularity, rangePreset, visibleAccountIds, showTotal]);
}
