import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/store/useStore';

const store = () => useStore.getState();

beforeEach(() => {
  store().resetAll();
});

describe('accounts slice', () => {
  it('新增账户并自动分配字段', () => {
    const id = store().addAccount({ name: '现金', openingBalance: 200000, openingDate: '2026-06-01' });
    const account = store().accounts.find((a) => a.id === id);
    expect(account?.name).toBe('现金');
    expect(account?.archived).toBe(false);
    expect(account?.color).toBeTruthy();
  });

  it('更新与归档账户', () => {
    const id = store().addAccount({ name: '现金', openingBalance: 0, openingDate: '2026-06-01' });
    store().updateAccount(id, { name: '招行' });
    store().archiveAccount(id, true);
    const account = store().accounts.find((a) => a.id === id);
    expect(account?.name).toBe('招行');
    expect(account?.archived).toBe(true);
  });

  it('删除账户同时清除其变动与系列', () => {
    const id = store().addAccount({ name: '现金', openingBalance: 0, openingDate: '2026-06-01' });
    store().addTransaction({ accountId: id, date: '2026-06-10', amount: 100 });
    store().addRecurring({
      accountId: id,
      frequency: 'monthly',
      interval: 1,
      baseAmount: 100,
      startDate: '2026-06-10',
      end: { kind: 'count', count: 3 },
    });
    store().removeAccount(id);
    expect(store().accounts).toHaveLength(0);
    expect(store().transactions).toHaveLength(0);
    expect(store().series).toHaveLength(0);
  });
});

describe('transactions slice', () => {
  it('addRecurring 生成系列与对应数量记录', () => {
    const id = store().addRecurring({
      accountId: 'a1',
      frequency: 'monthly',
      interval: 1,
      baseAmount: 100,
      startDate: '2026-06-10',
      end: { kind: 'count', count: 3 },
    });
    expect(store().series).toHaveLength(1);
    expect(store().series[0].id).toBe(id);
    expect(store().transactions).toHaveLength(3);
  });

  it('批量修改与批量删除', () => {
    store().addRecurring({
      accountId: 'a1',
      frequency: 'monthly',
      interval: 1,
      baseAmount: 100,
      startDate: '2026-06-10',
      end: { kind: 'count', count: 3 },
    });
    const ids = store().transactions.map((t) => t.id);
    store().batchUpdateTransactions(ids.slice(0, 2), { amount: 999 });
    expect(store().transactions.filter((t) => t.amount === 999)).toHaveLength(2);
    store().batchDeleteTransactions(ids.slice(0, 2));
    expect(store().transactions).toHaveLength(1);
  });

  it('删空一组周期记录后自动清理 series', () => {
    store().addRecurring({
      accountId: 'a1',
      frequency: 'monthly',
      interval: 1,
      baseAmount: 100,
      startDate: '2026-06-10',
      end: { kind: 'count', count: 3 },
    });
    const ids = store().transactions.map((t) => t.id);
    store().batchDeleteTransactions(ids.slice(0, 2));
    expect(store().series).toHaveLength(1);
    store().removeTransaction(ids[2]);
    expect(store().transactions).toHaveLength(0);
    expect(store().series).toHaveLength(0);
  });
});

describe('categories slice', () => {
  it('删除分类时清除引用', () => {
    const cid = store().addCategory({ name: '工资' });
    const aid = store().addAccount({
      name: '现金',
      openingBalance: 0,
      openingDate: '2026-06-01',
      categoryId: cid,
    });
    store().addTransaction({ accountId: aid, date: '2026-06-10', amount: 100, categoryId: cid });
    store().removeCategory(cid);
    expect(store().categories).toHaveLength(0);
    expect(store().accounts[0].categoryId).toBeUndefined();
    expect(store().transactions[0].categoryId).toBeUndefined();
  });
});

describe('settings slice', () => {
  it('主题、粒度与显隐切换', () => {
    store().setTheme('dark');
    store().setGranularity('week');
    store().toggleTotal();
    store().setVisibleAccountIds(['a1']);
    expect(store().theme).toBe('dark');
    expect(store().granularity).toBe('week');
    expect(store().showTotal).toBe(false);
    expect(store().visibleAccountIds).toEqual(['a1']);
  });
});

describe('data import/export', () => {
  it('导出再导入数据一致', () => {
    store().addAccount({ name: '现金', openingBalance: 200000, openingDate: '2026-06-01' });
    const exported = store().exportData();
    store().resetAll();
    store().importData(exported);
    expect(store().accounts).toHaveLength(1);
    expect(store().exportData()).toEqual(exported);
  });
});
