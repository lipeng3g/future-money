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
