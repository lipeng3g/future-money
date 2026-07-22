import type { Frequency, Money, RecurrenceEnd, Series, Transaction } from '@/types';
import { isSameOrBeforeDate, stepDate } from './date';
import { uid } from './id';

/** 单次周期展开的最大生成笔数，防止误设导致卡死 */
export const MAX_OCCURRENCES = 5000;

/** 频率中文标签 */
export const FREQUENCY_LABELS: Record<Frequency, string> = {
  once: '一次性',
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  quarterly: '每季度',
  semiannual: '每半年',
  annual: '每年',
};

/** 周期配置下拉中的无歧义单位表达 */
export const FREQUENCY_OPTION_LABELS: Record<Frequency, string> = {
  once: '一次性',
  daily: '按天',
  weekly: '按周',
  monthly: '按月',
  quarterly: '按季度',
  semiannual: '按半年',
  annual: '按年',
};

/** 与「每 N ___ 一次」组合使用的单位 */
export const FREQUENCY_INTERVAL_UNITS: Record<Frequency, string> = {
  once: '次',
  daily: '天',
  weekly: '周',
  monthly: '个月',
  quarterly: '个季度',
  semiannual: '个半年',
  annual: '年',
};

/** 例如「每 1 个月一次」「每 2 个季度一次」 */
export function formatRecurrenceRule(frequency: Frequency, interval: number): string {
  if (frequency === 'once') return FREQUENCY_LABELS.once;
  const safeInterval = Math.max(1, Math.floor(interval));
  return `每 ${safeInterval} ${FREQUENCY_INTERVAL_UNITS[frequency]}一次`;
}

/** 可选周期频率（排除一次性） */
export const RECURRING_FREQUENCIES: Frequency[] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
];

export interface RecurrenceInput {
  accountId: string;
  frequency: Frequency;
  interval: number;
  baseAmount: Money;
  startDate: string;
  end: RecurrenceEnd;
  categoryId?: string;
  note?: string;
}

export interface RecurrenceResult {
  series: Series;
  transactions: Transaction[];
}

export interface RecurrenceExtensionResult {
  dates: string[];
  end: RecurrenceEnd;
}

/** 计算一次周期录入将生成的所有日期（真实记录的日期） */
export function recurrenceDates(input: RecurrenceInput): string[] {
  const { frequency, interval, startDate, end } = input;
  if (frequency === 'once') return [startDate];

  const dates: string[] = [];
  const safeInterval = Math.max(1, Math.floor(interval));
  for (let k = 0; k < MAX_OCCURRENCES; k++) {
    if (end.kind === 'count' && k >= end.count) break;
    const date = stepDate(startDate, frequency, safeInterval, k);
    if (end.kind === 'until' && !isSameOrBeforeDate(date, end.date)) break;
    dates.push(date);
  }
  return dates;
}

/** 将一次周期录入展开为 Series 元数据 + 一笔笔真实 Transaction */
export function expandRecurrence(input: RecurrenceInput): RecurrenceResult {
  const now = Date.now();
  const series: Series = {
    id: uid(),
    accountId: input.accountId,
    frequency: input.frequency,
    interval: Math.max(1, Math.floor(input.interval)),
    baseAmount: input.baseAmount,
    startDate: input.startDate,
    end: input.end,
    categoryId: input.categoryId,
    note: input.note,
    createdAt: now,
  };

  const transactions: Transaction[] = recurrenceDates(input).map((date) => ({
    id: uid(),
    accountId: input.accountId,
    date,
    amount: input.baseAmount,
    categoryId: input.categoryId,
    note: input.note,
    seriesId: series.id,
    createdAt: now,
    updatedAt: now,
  }));

  return { series, transactions };
}

/**
 * 在既有周期组后继续生成 count 期。
 *
 * 续期边界同时参考原 Series.end 与现存最新记录：
 * - 不回填原结束条件覆盖范围内被用户主动删除的记录；
 * - 若某笔记录被单独改到了更晚日期，则从该日期之后的下一个原周期位置继续。
 */
export function extendRecurrence(
  series: Series,
  latestTransactionDate: string | undefined,
  count: number,
): RecurrenceExtensionResult {
  if (series.frequency === 'once') return { dates: [], end: series.end };

  const safeCount = Math.min(
    MAX_OCCURRENCES,
    Math.max(1, Math.floor(Number.isFinite(count) ? count : 1)),
  );
  const safeInterval = Math.max(1, Math.floor(series.interval));

  let nextIndex: number;
  if (series.end.kind === 'count') {
    nextIndex = Math.max(1, Math.floor(series.end.count));
  } else {
    const generated = recurrenceDates({
      accountId: series.accountId,
      frequency: series.frequency,
      interval: series.interval,
      baseAmount: series.baseAmount,
      startDate: series.startDate,
      end: series.end,
      categoryId: series.categoryId,
      note: series.note,
    });
    nextIndex = generated.length;
  }

  if (latestTransactionDate) {
    while (
      isSameOrBeforeDate(
        stepDate(series.startDate, series.frequency, safeInterval, nextIndex),
        latestTransactionDate,
      )
    ) {
      nextIndex += 1;
    }
  }

  const dates = Array.from({ length: safeCount }, (_, offset) =>
    stepDate(series.startDate, series.frequency, safeInterval, nextIndex + offset),
  );
  const last = dates[dates.length - 1];
  const end: RecurrenceEnd =
    series.end.kind === 'count'
      ? { kind: 'count', count: nextIndex + dates.length }
      : { kind: 'until', date: last };

  return { dates, end };
}
