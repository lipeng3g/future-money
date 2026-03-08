import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFinanceStore } from '@/stores/finance';

const readEnvelope = () => {
  const raw = window.localStorage.getItem('futureMoney.state');
  return raw ? JSON.parse(raw) : null;
};

describe('finance store import/export', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
  });

  it('导出全部账户时会包含所有账户及其关联数据', () => {
    const store = useFinanceStore();

    const primaryId = store.currentAccount.id;
    store.addEvent({
      name: '工资',
      amount: 10000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });

    const secondary = store.addAccount({
      name: '基金账户',
      typeLabel: '投资',
      warningThreshold: 200,
    });
    store.addEvent({
      accountId: secondary.id,
      name: '定投',
      amount: 2000,
      category: 'expense',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 15,
      enabled: true,
    });

    store.currentAccountId = primaryId;
    const exported = JSON.parse(store.exportState('all'));

    expect(exported.state.accounts).toHaveLength(2);
    expect(exported.state.events).toHaveLength(2);
    expect(new Set(exported.state.events.map((event: { accountId: string }) => event.accountId))).toEqual(
      new Set([primaryId, secondary.id]),
    );
  });

  it('恢复全部账户时会替换整个本地状态，而不是塞进当前账户', () => {
    const store = useFinanceStore();
    const originalCurrentId = store.currentAccount.id;

    const backup = {
      version: '2.0.0',
      timestamp: '2026-03-08T00:00:00.000Z',
      state: {
        version: '2.0.0',
        account: {
          id: 'acc-a',
          name: '现金',
          typeLabel: '主账户',
          initialBalance: 3000,
          currency: '¥',
          warningThreshold: 800,
          color: '#3b82f6',
          iconKey: 'wallet',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        accounts: [
          {
            id: 'acc-a',
            name: '现金',
            typeLabel: '主账户',
            initialBalance: 3000,
            currency: '¥',
            warningThreshold: 800,
            color: '#3b82f6',
            iconKey: 'wallet',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'acc-b',
            name: '信用卡',
            typeLabel: '负债账户',
            initialBalance: -1200,
            currency: '¥',
            warningThreshold: 200,
            color: '#ef4444',
            iconKey: 'card',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        events: [
          {
            id: 'evt-a',
            accountId: 'acc-b',
            name: '信用卡还款',
            amount: 1200,
            category: 'expense',
            type: 'monthly',
            startDate: '2026-03-01',
            monthlyDay: 8,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        preferences: {
          defaultViewMonths: 24,
          chartType: 'area',
          showWeekends: false,
        },
        snapshots: [],
        reconciliations: [],
        ledgerEntries: [],
        eventOverrides: [],
      },
    };

    store.importState(JSON.stringify(backup), 'all');

    expect(store.accounts).toHaveLength(2);
    expect(store.currentAccountId).toBe('acc-a');
    expect(store.currentAccount.name).toBe('现金');
    expect(store.events).toHaveLength(1);
    expect(store.events[0].accountId).toBe('acc-b');
    expect(store.preferences.defaultViewMonths).toBe(24);
    expect(store.viewMonths).toBe(24);
    expect(store.accounts.some((account) => account.id === originalCurrentId)).toBe(false);

    const persisted = readEnvelope();
    expect(persisted.state.accounts).toHaveLength(2);
    expect(persisted.state.account.id).toBe('acc-a');
  });

  it('导入当前账户时只覆盖当前账户，不影响其他账户', () => {
    const store = useFinanceStore();
    const primaryId = store.currentAccount.id;

    store.addEvent({
      name: '旧工资',
      amount: 5000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 1,
      enabled: true,
    });

    const secondary = store.addAccount({
      name: '副账户',
      warningThreshold: 300,
    });
    store.addEvent({
      accountId: secondary.id,
      name: '副账户收入',
      amount: 800,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 5,
      enabled: true,
    });

    store.currentAccountId = primaryId;

    const singleAccountBackup = {
      version: '2.0.0',
      timestamp: '2026-03-08T00:00:00.000Z',
      state: {
        version: '2.0.0',
        account: {
          id: 'imported-acc',
          name: '导入账户',
          typeLabel: '现金',
          initialBalance: 6600,
          currency: '¥',
          warningThreshold: 999,
          color: '#10b981',
          iconKey: 'piggy',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        accounts: [
          {
            id: 'imported-acc',
            name: '导入账户',
            typeLabel: '现金',
            initialBalance: 6600,
            currency: '¥',
            warningThreshold: 999,
            color: '#10b981',
            iconKey: 'piggy',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        events: [
          {
            id: 'evt-new',
            accountId: 'imported-acc',
            name: '新工资',
            amount: 9000,
            category: 'income',
            type: 'monthly',
            startDate: '2026-02-01',
            monthlyDay: 9,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        preferences: store.preferences,
        snapshots: [],
        reconciliations: [],
        ledgerEntries: [],
        eventOverrides: [],
      },
    };

    store.importState(JSON.stringify(singleAccountBackup), 'current');

    expect(store.accounts).toHaveLength(2);
    expect(store.currentAccountId).toBe(primaryId);
    expect(store.currentAccount.name).toBe('导入账户');
    expect(store.currentAccount.warningThreshold).toBe(999);

    const primaryEvents = store.events.filter((event) => event.accountId === primaryId);
    const secondaryEvents = store.events.filter((event) => event.accountId === secondary.id);

    expect(primaryEvents).toHaveLength(1);
    expect(primaryEvents[0].name).toBe('新工资');
    expect(secondaryEvents).toHaveLength(1);
    expect(secondaryEvents[0].name).toBe('副账户收入');
  });
});
