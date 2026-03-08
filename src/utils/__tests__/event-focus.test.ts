import { describe, expect, it } from 'vitest';
import { buildEventChartFocusState, buildEventListFocusState } from '@/utils/event-focus';
import type { CashFlowEvent, DailySnapshot } from '@/types';

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

const createEvent = (overrides: Partial<CashFlowEvent> & Pick<CashFlowEvent, 'id' | 'accountId' | 'name' | 'amount' | 'category' | 'type' | 'startDate' | 'enabled' | 'createdAt' | 'updatedAt'>): CashFlowEvent => ({
  id: overrides.id,
  accountId: overrides.accountId,
  name: overrides.name,
  amount: overrides.amount,
  category: overrides.category,
  type: overrides.type,
  startDate: overrides.startDate,
  enabled: overrides.enabled,
  createdAt: overrides.createdAt,
  updatedAt: overrides.updatedAt,
  endDate: overrides.endDate,
  onceDate: overrides.onceDate,
  monthlyDay: overrides.monthlyDay,
  yearlyMonth: overrides.yearlyMonth,
  yearlyDay: overrides.yearlyDay,
  color: overrides.color,
  notes: overrides.notes,
});

describe('event-focus', () => {
  it('会从图表日期提取对应规则事件，并去重输出账户范围', () => {
    const timeline = [
      createDay({
        date: '2025-01-10',
        balance: 3200,
        change: -800,
        events: [
          { id: 'occ-1', eventId: 'evt-rent', name: '房租', amount: 3000, category: 'expense', date: '2025-01-10', accountId: 'acc-cash' },
          { id: 'occ-2', eventId: 'evt-rent', name: '房租', amount: 3000, category: 'expense', date: '2025-01-10', accountId: 'acc-cash' },
          { id: 'occ-3', eventId: 'evt-salary', name: '工资', amount: 2200, category: 'income', date: '2025-01-10', accountId: 'acc-bank' },
        ],
      }),
    ];

    const events = [
      createEvent({ id: 'evt-rent', accountId: 'acc-cash', name: '房租', amount: 3000, category: 'expense', type: 'monthly', startDate: '2025-01-01', enabled: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z', monthlyDay: 10 }),
      createEvent({ id: 'evt-salary', accountId: 'acc-bank', name: '工资', amount: 2200, category: 'income', type: 'monthly', startDate: '2025-01-01', enabled: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z', monthlyDay: 10 }),
    ];

    expect(buildEventListFocusState(timeline, events, '2025-01-10')).toEqual({
      sourceDate: '2025-01-10',
      eventIds: ['evt-rent', 'evt-salary'],
      accountIds: ['acc-cash', 'acc-bank'],
      title: '2025-01-10 对应规则事件',
      summary: '已定位 2 条规则事件：房租、工资',
    });
  });

  it('点击无事件日期时返回空，避免误筛选事件列表', () => {
    const timeline = [createDay({ date: '2025-01-11', balance: 3200, change: 0, events: [] })];
    expect(buildEventListFocusState(timeline, [], '2025-01-11')).toBeNull();
  });

  it('会从事件反向定位到图表中的下一次发生日期，并给出次数说明', () => {
    const event = createEvent({
      id: 'evt-rent',
      accountId: 'acc-cash',
      name: '房租',
      amount: 3000,
      category: 'expense',
      type: 'monthly',
      startDate: '2025-01-01',
      enabled: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      monthlyDay: 10,
    });

    const timeline = [
      createDay({
        date: '2025-01-10',
        balance: 3200,
        change: -3000,
        events: [{ id: 'occ-1', eventId: 'evt-rent', name: '房租', amount: 3000, category: 'expense', date: '2025-01-10', accountId: 'acc-cash' }],
      }),
      createDay({ date: '2025-01-15', balance: 4000, change: 800, isToday: true }),
      createDay({
        date: '2025-02-10',
        balance: 1000,
        change: -3000,
        events: [{ id: 'occ-2', eventId: 'evt-rent', name: '房租', amount: 3000, category: 'expense', date: '2025-02-10', accountId: 'acc-cash' }],
      }),
    ];

    expect(buildEventChartFocusState(timeline, event)).toEqual({
      eventId: 'evt-rent',
      date: '2025-02-10',
      occurrenceCount: 2,
      title: '已定位到「房租」',
      summary: '图表已跳到 2025-02-10（当前时间窗内共 2 次发生，可继续拖动查看其它日期）。',
    });
  });

  it('当前时间窗内没有该事件发生时，不触发图表定位', () => {
    const event = createEvent({
      id: 'evt-bonus',
      accountId: 'acc-bank',
      name: '年终奖',
      amount: 20000,
      category: 'income',
      type: 'yearly',
      startDate: '2025-01-01',
      enabled: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      yearlyMonth: 12,
      yearlyDay: 31,
    });

    const timeline = [createDay({ date: '2025-01-11', balance: 3200, change: 0, events: [] })];
    expect(buildEventChartFocusState(timeline, event)).toBeNull();
  });
});
