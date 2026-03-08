import { describe, expect, it } from 'vitest';
import { buildEventChartFocusState, buildEventListFocusState, stepEventChartFocusState } from '@/utils/event-focus';
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

    expect(buildEventListFocusState(timeline, events, '2025-01-10', [
      { id: 'acc-cash', name: '现金', typeLabel: '现金账户', initialBalance: 0, currency: 'CNY', warningThreshold: 1000, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      { id: 'acc-bank', name: '银行卡', typeLabel: '银行账户', initialBalance: 0, currency: 'CNY', warningThreshold: 1000, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ])).toEqual({
      sourceDate: '2025-01-10',
      eventIds: ['evt-rent', 'evt-salary'],
      accountIds: ['acc-cash', 'acc-bank'],
      title: '2025-01-10 对应规则事件',
      summary: '已定位 2 条规则事件：房租、工资',
      detail: '涉及账户：现金 2 笔 · 支出 ¥6,000；银行卡 1 笔 · 收入 ¥2,200。当日余额变动 -¥800。',
    });
  });

  it('点击无事件日期时返回空，避免误筛选事件列表', () => {
    const timeline = [createDay({ date: '2025-01-11', balance: 3200, change: 0, events: [] })];
    expect(buildEventListFocusState(timeline, [], '2025-01-11')).toBeNull();
  });

  it('在缺少账户配置时会回退到 accountId，且能汇总同账户收支', () => {
    const timeline = [
      createDay({
        date: '2025-02-01',
        balance: 1500,
        change: -500,
        events: [
          { id: 'occ-1', eventId: 'evt-rent', name: '房租', amount: 3000, category: 'expense', date: '2025-02-01', accountId: 'acc-cash' },
          { id: 'occ-2', eventId: 'evt-refund', name: '退款', amount: 500, category: 'income', date: '2025-02-01', accountId: 'acc-cash' },
        ],
      }),
    ];

    const events = [
      createEvent({ id: 'evt-rent', accountId: 'acc-cash', name: '房租', amount: 3000, category: 'expense', type: 'monthly', startDate: '2025-01-01', enabled: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z', monthlyDay: 1 }),
      createEvent({ id: 'evt-refund', accountId: 'acc-cash', name: '退款', amount: 500, category: 'income', type: 'once', startDate: '2025-02-01', onceDate: '2025-02-01', enabled: true, createdAt: '2025-02-01T00:00:00.000Z', updatedAt: '2025-02-01T00:00:00.000Z' }),
    ];

    expect(buildEventListFocusState(timeline, events, '2025-02-01')).toEqual({
      sourceDate: '2025-02-01',
      eventIds: ['evt-rent', 'evt-refund'],
      accountIds: ['acc-cash'],
      title: '2025-02-01 对应规则事件',
      summary: '已定位 2 条规则事件：房租、退款',
      detail: '涉及账户：acc-cash 2 笔 · 收入 ¥500 · 支出 ¥3,000。当日余额变动 -¥500。',
    });
  });

  it('会从事件反向定位到图表中的下一次发生日期，并给出可切换状态', () => {
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
      createDay({
        date: '2025-03-10',
        balance: 500,
        change: -3000,
        events: [{ id: 'occ-3', eventId: 'evt-rent', name: '房租', amount: 3000, category: 'expense', date: '2025-03-10', accountId: 'acc-cash' }],
      }),
    ];

    expect(buildEventChartFocusState(timeline, event)).toEqual({
      eventId: 'evt-rent',
      date: '2025-02-10',
      occurrenceCount: 3,
      occurrenceIndex: 1,
      matchedDates: ['2025-01-10', '2025-02-10', '2025-03-10'],
      title: '已定位到「房租」',
      summary: '图表已跳到 2025-02-10（第 2 / 3 次发生，可继续切换查看前后日期）。',
      canFocusPrev: true,
      canFocusNext: true,
    });
  });

  it('支持在同一事件的多个发生日期之间前后切换', () => {
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
      createDay({
        date: '2025-03-10',
        balance: 500,
        change: -3000,
        events: [{ id: 'occ-3', eventId: 'evt-rent', name: '房租', amount: 3000, category: 'expense', date: '2025-03-10', accountId: 'acc-cash' }],
      }),
    ];

    const initial = buildEventChartFocusState(timeline, event);
    expect(initial?.date).toBe('2025-02-10');

    const next = initial ? stepEventChartFocusState(timeline, event, initial, 1) : null;
    expect(next).toEqual({
      eventId: 'evt-rent',
      date: '2025-03-10',
      occurrenceCount: 3,
      occurrenceIndex: 2,
      matchedDates: ['2025-01-10', '2025-02-10', '2025-03-10'],
      title: '已定位到「房租」',
      summary: '图表已跳到 2025-03-10（第 3 / 3 次发生，可继续切换查看前后日期）。',
      canFocusPrev: true,
      canFocusNext: false,
    });

    const back = next ? stepEventChartFocusState(timeline, event, next, -1) : null;
    expect(back?.date).toBe('2025-02-10');
    expect(back?.occurrenceIndex).toBe(1);
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
