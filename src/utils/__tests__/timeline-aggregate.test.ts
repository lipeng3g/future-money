import { describe, expect, it } from 'vitest';
import { aggregateAccountTimelines } from '@/utils/timeline-aggregate';
import type { DailySnapshot } from '@/types';

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

describe('aggregateAccountTimelines', () => {
  it('按日期聚合多账户余额/变动，并保留事件所属账户', () => {
    const aggregated = aggregateAccountTimelines(
      {
        'acc-1': [
          createDay({
            date: '2025-01-01',
            balance: 100,
            change: 100,
            zone: 'frozen',
            reconciliationId: 'recon-a',
            events: [
              {
                id: 'occ-1',
                eventId: 'evt-1',
                name: '工资',
                category: 'income',
                amount: 100,
                date: '2025-01-01',
              },
            ],
          }),
        ],
        'acc-2': [
          createDay({
            date: '2025-01-01',
            balance: 50,
            change: 50,
            snapshotId: 'snap-b',
            events: [
              {
                id: 'occ-2',
                eventId: 'evt-2',
                name: '兼职',
                category: 'income',
                amount: 50,
                date: '2025-01-01',
                accountId: 'custom-acc',
              },
            ],
          }),
        ],
      },
      ['acc-1', 'acc-2'],
    );

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]).toMatchObject({
      date: '2025-01-01',
      balance: 150,
      change: 150,
      zone: 'frozen',
      reconciliationId: 'recon-a',
      snapshotId: 'snap-b',
    });
    expect(aggregated[0].events).toEqual([
      expect.objectContaining({ eventId: 'evt-1', accountId: 'acc-1' }),
      expect.objectContaining({ eventId: 'evt-2', accountId: 'custom-acc' }),
    ]);
  });

  it('忽略空时间线账户，并在没有有效账户时返回空数组', () => {
    expect(aggregateAccountTimelines({ 'acc-1': [] }, ['acc-1'])).toEqual([]);
    expect(aggregateAccountTimelines({}, ['missing'])).toEqual([]);
  });

  it('会合并不重叠日期，并保持日期升序', () => {
    const aggregated = aggregateAccountTimelines(
      {
        'acc-1': [createDay({ date: '2025-01-03', balance: 300, change: 30 })],
        'acc-2': [createDay({ date: '2025-01-01', balance: 100, change: 10, isToday: true })],
      },
      ['acc-1', 'acc-2'],
    );

    expect(aggregated.map((day) => day.date)).toEqual(['2025-01-01', '2025-01-03']);
    expect(aggregated[0].isToday).toBe(true);
  });

  it('会沿用缺失账户最近一个有效余额，而不是把缺口算成 0', () => {
    const aggregated = aggregateAccountTimelines(
      {
        'acc-1': [
          createDay({ date: '2025-01-01', balance: 100, change: 0, zone: 'frozen', reconciliationId: 'recon-a' }),
          createDay({ date: '2025-01-03', balance: 130, change: 30, events: [
            {
              id: 'occ-1',
              eventId: 'evt-1',
              name: '工资',
              category: 'income',
              amount: 30,
              date: '2025-01-03',
            },
          ] }),
        ],
        'acc-2': [
          createDay({ date: '2025-01-01', balance: 200, change: 0, zone: 'frozen', reconciliationId: 'recon-b' }),
          createDay({ date: '2025-01-02', balance: 150, change: -50, events: [
            {
              id: 'occ-2',
              eventId: 'evt-2',
              name: '房租',
              category: 'expense',
              amount: 50,
              date: '2025-01-02',
            },
          ] }),
        ],
      },
      ['acc-1', 'acc-2'],
    );

    expect(aggregated.map((day) => ({ date: day.date, balance: day.balance, change: day.change }))).toEqual([
      { date: '2025-01-01', balance: 300, change: 0 },
      { date: '2025-01-02', balance: 250, change: -50 },
      { date: '2025-01-03', balance: 280, change: 30 },
    ]);
    expect(aggregated[1].events).toEqual([
      expect.objectContaining({ eventId: 'evt-2', accountId: 'acc-2' }),
    ]);
    expect(aggregated[2].events).toEqual([
      expect.objectContaining({ eventId: 'evt-1', accountId: 'acc-1' }),
    ]);
  });

  it('不会把账户首个时间点之前的日期错误补成余额', () => {
    const aggregated = aggregateAccountTimelines(
      {
        'acc-1': [createDay({ date: '2025-01-05', balance: 500, change: 0 })],
        'acc-2': [createDay({ date: '2025-01-01', balance: 100, change: 0 })],
      },
      ['acc-1', 'acc-2'],
    );

    expect(aggregated.map((day) => ({ date: day.date, balance: day.balance }))).toEqual([
      { date: '2025-01-01', balance: 100 },
      { date: '2025-01-05', balance: 600 },
    ]);
  });
});
