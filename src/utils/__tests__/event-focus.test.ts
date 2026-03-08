import { describe, expect, it } from 'vitest';
import { buildEventListFocusState } from '@/utils/event-focus';
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
});
