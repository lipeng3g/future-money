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

    expect(exported.scope).toBe('all');
    expect(exported.state.accounts).toHaveLength(2);
    expect(exported.state.events).toHaveLength(2);
    expect(new Set(exported.state.events.map((event: { accountId: string }) => event.accountId))).toEqual(
      new Set([primaryId, secondary.id]),
    );
  });

  it('导出当前账户时会写入 current scope，供导入阶段防误操作识别', () => {
    const store = useFinanceStore();

    const exported = JSON.parse(store.exportState('current'));

    expect(exported.scope).toBe('current');
    expect(exported.state.accounts).toHaveLength(1);
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

  it('导入当前账户时会保存回滚快照，并允许一键撤销', () => {
    const store = useFinanceStore();
    const originalAccountId = store.currentAccount.id;
    const originalAccountName = store.currentAccount.name;

    store.addEvent({
      name: '原始工资',
      amount: 5000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 1,
      enabled: true,
    });

    const backup = {
      version: '2.0.0',
      timestamp: '2026-03-08T00:00:00.000Z',
      scope: 'current',
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

    store.importState(JSON.stringify(backup), 'current', 'import-current.json');

    expect(store.rollbackSnapshot).toBeTruthy();
    expect(store.rollbackSnapshot?.mode).toBe('current');
    expect(store.rollbackSnapshot?.fileName).toBe('import-current.json');
    expect(store.rollbackSnapshot?.state.account.id).toBe(originalAccountId);

    const undoResult = store.undoLastImport();
    expect(undoResult.success).toBe(true);
    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.currentAccount.name).toBe(originalAccountName);
    expect(store.events).toHaveLength(1);
    expect(store.events[0].name).toBe('原始工资');
    expect(store.rollbackSnapshot).toBeNull();
  });

  it('切换预测范围时会同步持久化 defaultViewMonths，并能通过持久化状态恢复', () => {
    const store = useFinanceStore();

    store.setViewMonths(24);

    expect(store.viewMonths).toBe(24);
    expect(store.preferences.defaultViewMonths).toBe(24);

    const persisted = readEnvelope();
    expect(persisted.state.preferences.defaultViewMonths).toBe(24);

    window.localStorage.clear();
    setActivePinia(createPinia());
    const restoredStore = useFinanceStore();

    restoredStore.importState(JSON.stringify(persisted), 'all');

    expect(restoredStore.viewMonths).toBe(24);
    expect(restoredStore.preferences.defaultViewMonths).toBe(24);
  });

  it('导入当前账户时会为事件与对账链路重建内部 ID 和引用关系', () => {
    const store = useFinanceStore();
    const targetId = store.currentAccount.id;

    store.addEvent({
      name: '旧事件',
      amount: 1200,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 3,
      enabled: true,
    });
    store.reconcile('2026-03-01', 5000, [], '旧对账');

    const backup = {
      version: '2.0.0',
      timestamp: '2026-03-08T00:00:00.000Z',
      state: {
        version: '2.0.0',
        account: {
          id: 'imported-acc',
          name: '导入账户',
          typeLabel: '现金',
          initialBalance: 8000,
          currency: '¥',
          warningThreshold: 1500,
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
            initialBalance: 8000,
            currency: '¥',
            warningThreshold: 1500,
            color: '#10b981',
            iconKey: 'piggy',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        events: [
          {
            id: 'evt-salary',
            accountId: 'imported-acc',
            name: '工资',
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
        snapshots: [
          {
            id: 'snap-1',
            accountId: 'imported-acc',
            date: '2026-03-10',
            balance: 8000,
            source: 'manual',
            createdAt: '2026-03-10T00:00:00.000Z',
          },
        ],
        reconciliations: [
          {
            id: 'recon-1',
            accountId: 'imported-acc',
            date: '2026-03-10',
            balance: 8000,
            note: '导入对账',
            createdAt: '2026-03-10T00:00:00.000Z',
          },
        ],
        ledgerEntries: [
          {
            id: 'ledger-1',
            accountId: 'imported-acc',
            reconciliationId: 'recon-1',
            ruleId: 'evt-salary',
            name: '工资',
            amount: 9000,
            category: 'income',
            date: '2026-03-09',
            source: 'rule',
            createdAt: '2026-03-10T00:00:00.000Z',
            updatedAt: '2026-03-10T00:00:00.000Z',
          },
        ],
        eventOverrides: [
          {
            id: 'override-1',
            accountId: 'imported-acc',
            ruleId: 'evt-salary',
            period: '2026-03',
            action: 'modified',
            amount: 9500,
            createdAt: '2026-03-10T00:00:00.000Z',
          },
        ],
      },
    };

    store.importState(JSON.stringify(backup), 'current');

    const importedEvent = store.events.find((event) => event.accountId === targetId && event.name === '工资');
    const importedReconciliation = store.reconciliations.find((recon) => recon.accountId === targetId && recon.note === '导入对账');
    const importedLedgerEntry = store.ledgerEntries.find((entry) => entry.accountId === targetId && entry.name === '工资');
    const importedOverride = store.eventOverrides.find((override) => override.accountId === targetId && override.period === '2026-03');
    const importedSnapshot = store.snapshots.find((snapshot) => snapshot.accountId === targetId && snapshot.date === '2026-03-10');

    expect(importedEvent).toBeTruthy();
    expect(importedReconciliation).toBeTruthy();
    expect(importedLedgerEntry).toBeTruthy();
    expect(importedOverride).toBeTruthy();
    expect(importedSnapshot).toBeTruthy();

    expect(importedEvent?.id).not.toBe('evt-salary');
    expect(importedReconciliation?.id).not.toBe('recon-1');
    expect(importedLedgerEntry?.id).not.toBe('ledger-1');
    expect(importedOverride?.id).not.toBe('override-1');
    expect(importedSnapshot?.id).not.toBe('snap-1');

    expect(importedLedgerEntry?.ruleId).toBe(importedEvent?.id);
    expect(importedLedgerEntry?.reconciliationId).toBe(importedReconciliation?.id);
    expect(importedOverride?.ruleId).toBe(importedEvent?.id);
  });
});
