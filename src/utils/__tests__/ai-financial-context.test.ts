import { describe, expect, it } from 'vitest';
import { buildScopedFinancialContext } from '@/utils/ai';
import type { AccountConfig, CashFlowEvent, EventOverride, LedgerEntry, Reconciliation } from '@/types';

const now = '2026-03-08T00:00:00.000Z';

const accounts: AccountConfig[] = [
  {
    id: 'acc-a',
    name: '工资卡',
    initialBalance: 1000,
    currency: 'CNY',
    warningThreshold: 500,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'acc-b',
    name: '房贷卡',
    initialBalance: 2000,
    currency: 'CNY',
    warningThreshold: 300,
    createdAt: now,
    updatedAt: now,
  },
];

const events: CashFlowEvent[] = [
  {
    id: 'event-a-income',
    accountId: 'acc-a',
    name: '工资',
    amount: 1000,
    category: 'income',
    type: 'monthly',
    startDate: '2026-03-02',
    endDate: '2026-03-31',
    monthlyDay: 2,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'event-b-expense',
    accountId: 'acc-b',
    name: '房贷',
    amount: 400,
    category: 'expense',
    type: 'monthly',
    startDate: '2026-03-03',
    endDate: '2026-03-31',
    monthlyDay: 3,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
];

const reconciliations: Reconciliation[] = [
  {
    id: 'recon-a',
    accountId: 'acc-a',
    date: '2026-03-01',
    balance: 1000,
    createdAt: now,
  },
  {
    id: 'recon-b',
    accountId: 'acc-b',
    date: '2026-03-01',
    balance: 2000,
    createdAt: now,
  },
];

const ledgerEntries: LedgerEntry[] = [];
const eventOverrides: EventOverride[] = [];

describe('buildScopedFinancialContext', () => {
  it('单账户分析时只使用被选择账户的时间线和统计数据', () => {
    const context = buildScopedFinancialContext({
      accounts,
      selectedAccountIds: ['acc-a'],
      events,
      reconciliations,
      ledgerEntries,
      eventOverrides,
      viewMonths: 1,
      today: '2026-03-01',
    });

    expect(context.accounts.map((account) => account.id)).toEqual(['acc-a']);
    expect(context.events.map((event) => event.accountId)).toEqual(['acc-a']);
    expect(context.analytics.totalIncome).toBe(1000);
    expect(context.analytics.totalExpense).toBe(0);
    expect(context.analytics.endingBalance).toBe(2000);
    expect(context.timeline.some((snapshot) => snapshot.events.some((event) => event.accountId === 'acc-b'))).toBe(false);
  });

  it('多账户分析时按所选账户重新汇总时间线、预警线和事件归属', () => {
    const context = buildScopedFinancialContext({
      accounts,
      selectedAccountIds: ['acc-b', 'acc-a'],
      events,
      reconciliations,
      ledgerEntries,
      eventOverrides,
      viewMonths: 1,
      today: '2026-03-01',
    });

    expect(context.isMultiAccount).toBe(true);
    expect(context.accounts.map((account) => account.id)).toEqual(['acc-a', 'acc-b']);
    expect(context.analytics.totalIncome).toBe(1000);
    expect(context.analytics.totalExpense).toBe(400);
    expect(context.analytics.endingBalance).toBe(3600);

    const march2 = context.timeline.find((snapshot) => snapshot.date === '2026-03-02');
    const march3 = context.timeline.find((snapshot) => snapshot.date === '2026-03-03');

    expect(march2?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '工资', accountId: 'acc-a' }),
      ]),
    );
    expect(march3?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '房贷', accountId: 'acc-b' }),
      ]),
    );
  });

  it('所选账户没有任何对账记录时返回空时间线和零统计，而不是误用当前视图数据', () => {
    const context = buildScopedFinancialContext({
      accounts,
      selectedAccountIds: ['acc-missing'],
      events,
      reconciliations,
      ledgerEntries,
      eventOverrides,
      viewMonths: 1,
      today: '2026-03-01',
    });

    expect(context.accounts).toEqual([]);
    expect(context.events).toEqual([]);
    expect(context.timeline).toEqual([]);
    expect(context.analytics.endingBalance).toBe(0);
    expect(context.analytics.totalIncome).toBe(0);
    expect(context.analytics.totalExpense).toBe(0);
  });
});
