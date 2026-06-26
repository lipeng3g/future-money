import { describe, expect, it } from 'vitest';
import {
  MAX_OCCURRENCES,
  expandRecurrence,
  recurrenceDates,
  type RecurrenceInput,
} from '@/utils/recurrence';

const base: Omit<RecurrenceInput, 'frequency' | 'interval' | 'startDate' | 'end'> = {
  accountId: 'a1',
  baseAmount: 100000,
};

describe('recurrenceDates', () => {
  it('once 仅生成起始日一笔', () => {
    expect(
      recurrenceDates({
        ...base,
        frequency: 'once',
        interval: 1,
        startDate: '2026-06-10',
        end: { kind: 'count', count: 5 },
      }),
    ).toEqual(['2026-06-10']);
  });

  it('daily 支持 interval', () => {
    expect(
      recurrenceDates({
        ...base,
        frequency: 'daily',
        interval: 2,
        startDate: '2026-06-01',
        end: { kind: 'count', count: 3 },
      }),
    ).toEqual(['2026-06-01', '2026-06-03', '2026-06-05']);
  });

  it('weekly 按周步进', () => {
    expect(
      recurrenceDates({
        ...base,
        frequency: 'weekly',
        interval: 1,
        startDate: '2026-06-01',
        end: { kind: 'count', count: 2 },
      }),
    ).toEqual(['2026-06-01', '2026-06-08']);
  });

  it('monthly 月末 clamp（1/31 → 2/28 → 3/31）', () => {
    expect(
      recurrenceDates({
        ...base,
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-01-31',
        end: { kind: 'count', count: 3 },
      }),
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('quarterly 每季步进', () => {
    expect(
      recurrenceDates({
        ...base,
        frequency: 'quarterly',
        interval: 1,
        startDate: '2026-01-15',
        end: { kind: 'count', count: 2 },
      }),
    ).toEqual(['2026-01-15', '2026-04-15']);
  });

  it('annual 闰年 clamp（2/29 → 2/28）', () => {
    expect(
      recurrenceDates({
        ...base,
        frequency: 'annual',
        interval: 1,
        startDate: '2024-02-29',
        end: { kind: 'count', count: 2 },
      }),
    ).toEqual(['2024-02-29', '2025-02-28']);
  });

  it('until 终止（含当日）', () => {
    expect(
      recurrenceDates({
        ...base,
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-06-10',
        end: { kind: 'until', date: '2026-08-10' },
      }),
    ).toEqual(['2026-06-10', '2026-07-10', '2026-08-10']);
  });

  it('不超过安全上限', () => {
    const dates = recurrenceDates({
      ...base,
      frequency: 'daily',
      interval: 1,
      startDate: '2026-01-01',
      end: { kind: 'count', count: MAX_OCCURRENCES + 100 },
    });
    expect(dates).toHaveLength(MAX_OCCURRENCES);
  });
});

describe('expandRecurrence', () => {
  it('生成 series 元数据与对应数量的真实记录', () => {
    const { series, transactions } = expandRecurrence({
      ...base,
      frequency: 'monthly',
      interval: 1,
      startDate: '2026-06-10',
      end: { kind: 'count', count: 3 },
      note: '工资',
    });
    expect(transactions).toHaveLength(3);
    expect(series.frequency).toBe('monthly');
    expect(transactions.every((t) => t.seriesId === series.id)).toBe(true);
    expect(transactions.every((t) => t.amount === 100000)).toBe(true);
    expect(transactions[0].note).toBe('工资');
  });
});
