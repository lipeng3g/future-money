import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFinanceStore } from '@/stores/finance';
import { loadChatDraft, loadChatHistory, saveChatDraft, saveChatHistory } from '@/utils/ai';

const readEnvelope = () => {
  const raw = window.localStorage.getItem('futureMoney.state');
  return raw ? JSON.parse(raw) : null;
};

const readRollback = () => {
  const raw = window.localStorage.getItem('futureMoney.rollback');
  return raw ? JSON.parse(raw) : null;
};

describe('finance store smoke', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
  });

  it('清空当前账户后会同步清空该账户 AI 会话持久化，刷新后仍为空且不影响其他账户', () => {
    const store = useFinanceStore();
    const mainAccountId = store.currentAccount.id;

    const travel = store.addAccount({
      name: '旅行基金',
      warningThreshold: 500,
      typeLabel: '储蓄',
    });

    saveChatHistory([{ role: 'user', content: '主账户对话' }], { accountIds: [mainAccountId] });
    saveChatDraft('主账户草稿', { accountIds: [mainAccountId] });
    saveChatHistory([{ role: 'user', content: '旅行账户对话' }], { accountIds: [travel.id] });
    saveChatDraft('旅行账户草稿', { accountIds: [travel.id] });
    saveChatHistory([{ role: 'user', content: '跨账户对话' }], { accountIds: [mainAccountId, travel.id] });
    saveChatDraft('跨账户草稿', { accountIds: [mainAccountId, travel.id] });

    store.currentAccountId = mainAccountId;
    store.clearCurrentAccount();

    expect(loadChatHistory({ accountIds: [mainAccountId] })).toEqual([]);
    expect(loadChatDraft({ accountIds: [mainAccountId] })).toBe('');
    expect(loadChatHistory({ accountIds: [mainAccountId, travel.id] })).toEqual([]);
    expect(loadChatDraft({ accountIds: [mainAccountId, travel.id] })).toBe('');
    expect(loadChatHistory({ accountIds: [travel.id] })).toEqual([
      expect.objectContaining({ role: 'user', content: '旅行账户对话' }),
    ]);
    expect(loadChatDraft({ accountIds: [travel.id] })).toBe('旅行账户草稿');

    setActivePinia(createPinia());
    const reloadedStore = useFinanceStore();
    reloadedStore.currentAccountId = mainAccountId;

    expect(reloadedStore.events.filter((event) => event.accountId === mainAccountId)).toHaveLength(0);
    expect(loadChatHistory({ accountIds: [mainAccountId] })).toEqual([]);
    expect(loadChatDraft({ accountIds: [mainAccountId] })).toBe('');
    expect(loadChatHistory({ accountIds: [travel.id] })).toEqual([
      expect.objectContaining({ role: 'user', content: '旅行账户对话' }),
    ]);
    expect(loadChatDraft({ accountIds: [travel.id] })).toBe('旅行账户草稿');
  });

  it('删除账户后会同步清空该账户 AI 会话持久化，刷新后不会回流到剩余账户', () => {
    const store = useFinanceStore();
    const mainAccountId = store.currentAccount.id;

    const travel = store.addAccount({
      name: '旅行基金',
      warningThreshold: 500,
      typeLabel: '储蓄',
    });

    saveChatHistory([{ role: 'user', content: '主账户对话' }], { accountIds: [mainAccountId] });
    saveChatDraft('主账户草稿', { accountIds: [mainAccountId] });
    saveChatHistory([{ role: 'user', content: '旅行账户对话' }], { accountIds: [travel.id] });
    saveChatDraft('旅行账户草稿', { accountIds: [travel.id] });
    saveChatHistory([{ role: 'user', content: '跨账户对话' }], { accountIds: [mainAccountId, travel.id] });
    saveChatDraft('跨账户草稿', { accountIds: [mainAccountId, travel.id] });

    const result = store.deleteAccount(travel.id);
    expect(result.success).toBe(true);

    expect(loadChatHistory({ accountIds: [travel.id] })).toEqual([]);
    expect(loadChatDraft({ accountIds: [travel.id] })).toBe('');
    expect(loadChatHistory({ accountIds: [mainAccountId, travel.id] })).toEqual([]);
    expect(loadChatDraft({ accountIds: [mainAccountId, travel.id] })).toBe('');
    expect(loadChatHistory({ accountIds: [mainAccountId] })).toEqual([
      expect.objectContaining({ role: 'user', content: '主账户对话' }),
    ]);
    expect(loadChatDraft({ accountIds: [mainAccountId] })).toBe('主账户草稿');

    setActivePinia(createPinia());
    const reloadedStore = useFinanceStore();

    expect(reloadedStore.accounts.some((account) => account.id === travel.id)).toBe(false);
    expect(loadChatHistory({ accountIds: [travel.id] })).toEqual([]);
    expect(loadChatDraft({ accountIds: [travel.id] })).toBe('');
    expect(loadChatHistory({ accountIds: [mainAccountId] })).toEqual([
      expect.objectContaining({ role: 'user', content: '主账户对话' }),
    ]);
    expect(loadChatDraft({ accountIds: [mainAccountId] })).toBe('主账户草稿');
  });

  it('可以完成导出全部账户 → 清空当前账户 → 恢复全部账户 → 撤销恢复的本地闭环', () => {
    const store = useFinanceStore();
    const originalAccountId = store.currentAccount.id;
    const originalAccountName = store.currentAccount.name;

    store.addEvent({
      name: '主账户工资',
      amount: 12000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });

    const travel = store.addAccount({
      name: '旅行基金',
      warningThreshold: 500,
      typeLabel: '储蓄',
    });
    store.addEvent({
      accountId: travel.id,
      name: '旅行储蓄',
      amount: 3000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 15,
      enabled: true,
    });

    const exported = store.exportState('all');
    const exportEnvelope = JSON.parse(exported);
    expect(exportEnvelope.scope).toBe('all');
    expect(exportEnvelope.state.accounts).toHaveLength(2);
    expect(exportEnvelope.state.events).toHaveLength(2);

    store.currentAccountId = originalAccountId;
    store.clearCurrentAccount();
    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.currentAccount.initialBalance).toBe(0);
    expect(store.events.filter((event) => event.accountId === originalAccountId)).toHaveLength(0);
    expect(store.events.filter((event) => event.accountId === travel.id)).toHaveLength(1);

    store.importState(exported, 'all', 'smoke-all.json');

    expect(store.accounts).toHaveLength(2);
    // 整库恢复会一并恢复备份里记录的“当前账户”选择。
    expect(store.currentAccountId).toBe(travel.id);
    expect(store.currentAccount.name).toBe('旅行基金');
    expect(store.events).toHaveLength(2);
    expect(store.events.some((event) => event.accountId === originalAccountId && event.name === '主账户工资')).toBe(true);
    expect(store.events.some((event) => event.accountId === travel.id && event.name === '旅行储蓄')).toBe(true);

    const rollbackSnapshot = readRollback();
    expect(rollbackSnapshot?.mode).toBe('all');
    expect(rollbackSnapshot?.fileName).toBe('smoke-all.json');

    const persistedAfterImport = readEnvelope();
    expect(persistedAfterImport?.state.accounts).toHaveLength(2);
    expect(persistedAfterImport?.state.events).toHaveLength(2);

    const undoResult = store.undoLastImport();
    expect(undoResult.success).toBe(true);
    // 撤销后恢复到清空后的状态：当前账户仍是主账户。
    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.currentAccount.initialBalance).toBe(0);
    expect(store.events.filter((event) => event.accountId === originalAccountId)).toHaveLength(0);
    expect(store.events.filter((event) => event.accountId === travel.id)).toHaveLength(1);
    expect(readRollback()).toBeNull();

    const persistedAfterUndo = readEnvelope();
    expect(persistedAfterUndo?.state.account.id).toBe(originalAccountId);
    expect(persistedAfterUndo?.state.events).toHaveLength(1);
    expect(persistedAfterUndo?.state.events[0].accountId).toBe(travel.id);
  });
});
