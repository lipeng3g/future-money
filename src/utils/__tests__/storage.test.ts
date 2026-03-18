import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_VERSION } from '@/utils/defaults';
import { LocalStorageStateRepository, createDefaultState } from '@/utils/storage';
import type { PersistedStateEnvelope } from '@/types/storage';

const createMemoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  } as Storage;
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LocalStorageStateRepository', () => {
  it('缺少 accounts/reconciliations 时会自动迁移并回写', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const legacy = createDefaultState();
    legacy.snapshots = [
      {
        id: 'snap-1',
        accountId: legacy.account.id,
        date: '2025-01-15',
        balance: 8888,
        source: 'initial',
        createdAt: '2025-01-15T00:00:00.000Z',
      },
    ];

    const envelope: PersistedStateEnvelope = {
      version: '1.0.0',
      timestamp: '2025-01-15T00:00:00.000Z',
      state: {
        ...legacy,
        accounts: [] as typeof legacy.accounts,
        reconciliations: undefined as never,
        ledgerEntries: undefined as never,
        eventOverrides: undefined as never,
      },
    };

    storage.setItem('futureMoney.state', JSON.stringify(envelope));

    const saveSpy = vi.spyOn(storage, 'setItem');
    const loaded = repository.loadState();

    expect(loaded.accounts).toHaveLength(1);
    expect(loaded.account.id).toBe(loaded.accounts[0].id);
    expect(loaded.reconciliations).toHaveLength(1);
    expect(loaded.reconciliations[0].balance).toBe(8888);
    expect(loaded.version).toBe(APP_VERSION);
    expect(saveSpy).toHaveBeenCalled();
  });

  it('空数组字段会被视为已完成迁移，不会在加载时重复回写 localStorage', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const state = createDefaultState();

    const envelope: PersistedStateEnvelope = {
      version: APP_VERSION,
      timestamp: '2025-01-15T00:00:00.000Z',
      state: {
        ...state,
        accounts: [state.account],
        snapshots: [],
        reconciliations: [],
        ledgerEntries: [],
        eventOverrides: [],
      },
    };

    storage.setItem('futureMoney.state', JSON.stringify(envelope));

    const saveSpy = vi.spyOn(storage, 'setItem');
    const loaded = repository.loadState();

    expect(loaded.snapshots).toEqual([]);
    expect(loaded.reconciliations).toEqual([]);
    expect(loaded.ledgerEntries).toEqual([]);
    expect(loaded.eventOverrides).toEqual([]);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('导入旧格式数据时会补齐默认字段，但不会伪造初始快照/对账', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const base = createDefaultState();

    const imported = repository.importState(
      JSON.stringify({
        version: '1.0.0',
        timestamp: '2025-01-01T00:00:00.000Z',
        state: {
          account: base.account,
          events: [],
          preferences: base.preferences,
          snapshots: [],
        },
      }),
    );

    expect(imported.accounts).toHaveLength(1);
    expect(imported.snapshots).toEqual([]);
    expect(imported.reconciliations).toEqual([]);
    expect(imported.ledgerEntries).toEqual([]);
    expect(imported.eventOverrides).toEqual([]);
    expect(imported.version).toBe(APP_VERSION);
  });

  it('旧格式数据若缺少 snapshots 字段，也不会自动补出默认快照', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const base = createDefaultState();

    const imported = repository.importState(
      JSON.stringify({
        version: '1.0.0',
        timestamp: '2025-01-01T00:00:00.000Z',
        state: {
          account: base.account,
          events: [],
          preferences: base.preferences,
        },
      }),
    );

    expect(imported.snapshots).toEqual([]);
    expect(imported.reconciliations).toEqual([]);
  });

  it('导入时会剔除断裂引用、跨账户脏数据与重复 id，避免坏链路进入本地', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const base = createDefaultState();

    const imported = repository.importState(
      JSON.stringify({
        version: '2.0.0',
        timestamp: '2026-03-09T00:00:00.000Z',
        state: {
          ...base,
          account: {
            ...base.account,
            id: 'missing-account',
            name: '失效当前账户',
          },
          accounts: [
            {
              ...base.account,
              id: 'acc-1',
              name: '主账户',
            },
            {
              ...base.account,
              id: 'acc-1',
              name: '重复账户',
            },
          ],
          preferences: {
            showWeekends: false,
          },
          events: [
            {
              id: 'event-1',
              accountId: 'acc-1',
              name: '工资',
              amount: 5000,
              category: 'income',
              type: 'monthly',
              startDate: '2026-03-01',
              monthlyDay: 1,
              enabled: true,
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'event-1',
              accountId: 'acc-1',
              name: '工资（重复）',
              amount: 5000,
              category: 'income',
              type: 'monthly',
              startDate: '2026-03-01',
              monthlyDay: 1,
              enabled: true,
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'event-orphan',
              accountId: 'acc-missing',
              name: '脏事件',
              amount: 1,
              category: 'expense',
              type: 'once',
              startDate: '2026-03-02',
              onceDate: '2026-03-02',
              enabled: true,
              createdAt: '2026-03-02T00:00:00.000Z',
              updatedAt: '2026-03-02T00:00:00.000Z',
            },
          ],
          snapshots: [
            {
              id: 'snapshot-1',
              accountId: 'acc-1',
              date: '2026-03-01',
              balance: 5000,
              source: 'manual',
              createdAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'snapshot-orphan',
              accountId: 'acc-missing',
              date: '2026-03-02',
              balance: 10,
              source: 'manual',
              createdAt: '2026-03-02T00:00:00.000Z',
            },
          ],
          reconciliations: [
            {
              id: 'recon-1',
              accountId: 'acc-1',
              date: '2026-03-03',
              balance: 6000,
              createdAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'recon-1',
              accountId: 'acc-1',
              date: '2026-03-04',
              balance: 7000,
              createdAt: '2026-03-04T00:00:00.000Z',
            },
          ],
          ledgerEntries: [
            {
              id: 'ledger-1',
              accountId: 'acc-1',
              reconciliationId: 'recon-1',
              ruleId: 'event-1',
              name: '工资入账',
              amount: 5000,
              category: 'income',
              date: '2026-03-03',
              source: 'rule',
              createdAt: '2026-03-03T00:00:00.000Z',
              updatedAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'ledger-missing-recon',
              accountId: 'acc-1',
              reconciliationId: 'recon-missing',
              name: '断裂对账引用',
              amount: 1,
              category: 'expense',
              date: '2026-03-03',
              source: 'manual',
              createdAt: '2026-03-03T00:00:00.000Z',
              updatedAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'ledger-missing-rule',
              accountId: 'acc-1',
              reconciliationId: 'recon-1',
              ruleId: 'event-missing',
              name: '断裂规则引用',
              amount: 1,
              category: 'expense',
              date: '2026-03-03',
              source: 'rule',
              createdAt: '2026-03-03T00:00:00.000Z',
              updatedAt: '2026-03-03T00:00:00.000Z',
            },
          ],
          eventOverrides: [
            {
              id: 'override-1',
              accountId: 'acc-1',
              ruleId: 'event-1',
              period: '2026-03',
              action: 'modified',
              amount: 5200,
              createdAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'override-missing-rule',
              accountId: 'acc-1',
              ruleId: 'event-missing',
              period: '2026-03',
              action: 'skipped',
              createdAt: '2026-03-03T00:00:00.000Z',
            },
          ],
        },
      }),
    );

    expect(imported.account.id).toBe('acc-1');
    expect(imported.accounts).toHaveLength(1);
    expect(imported.accounts[0].name).toBe('主账户');
    expect(imported.preferences.defaultViewMonths).toBe(base.preferences.defaultViewMonths);
    expect(imported.preferences.chartType).toBe(base.preferences.chartType);
    expect(imported.preferences.showWeekends).toBe(false);
    expect(imported.events.map((event) => event.id)).toEqual(['event-1']);
    expect(imported.snapshots.map((snapshot) => snapshot.id)).toEqual(['snapshot-1']);
    expect(imported.reconciliations.map((reconciliation) => reconciliation.id)).toEqual(['recon-1']);
    expect(imported.ledgerEntries.map((entry) => entry.id)).toEqual(['ledger-1']);
    expect(imported.eventOverrides.map((override) => override.id)).toEqual(['override-1']);
  });

  it('导入时会过滤非法日期、NaN、异常枚举和值级脏数据', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const base = createDefaultState();

    const imported = repository.importState(
      JSON.stringify({
        version: '2.0.0',
        timestamp: '2026-03-09T00:00:00.000Z',
        state: {
          ...base,
          account: {
            ...base.account,
            id: 'acc-1',
            name: '  主账户  ',
            initialBalance: Number.NaN,
            warningThreshold: -50,
            currency: '',
          },
          accounts: [
            {
              ...base.account,
              id: 'acc-1',
              name: '  主账户  ',
              initialBalance: Number.NaN,
              warningThreshold: -50,
              currency: '',
            },
            {
              ...base.account,
              id: 'acc-blank',
              name: '   ',
              currency: 'USD',
            },
          ],
          events: [
            {
              id: 'event-valid',
              accountId: 'acc-1',
              name: '  工资  ',
              amount: 5000,
              category: 'income',
              type: 'monthly',
              startDate: '2026-03-01',
              monthlyDay: 1,
              enabled: true,
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'event-invalid-date',
              accountId: 'acc-1',
              name: '坏日期',
              amount: 1,
              category: 'income',
              type: 'once',
              startDate: '2026-02-30',
              onceDate: '2026-02-30',
              enabled: true,
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'event-invalid-amount',
              accountId: 'acc-1',
              name: '坏金额',
              amount: 'oops',
              category: 'income',
              type: 'monthly',
              startDate: '2026-03-01',
              monthlyDay: 1,
              enabled: true,
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'event-invalid-category',
              accountId: 'acc-1',
              name: '坏分类',
              amount: 100,
              category: 'transfer',
              type: 'monthly',
              startDate: '2026-03-01',
              monthlyDay: 1,
              enabled: true,
              createdAt: '2026-03-01T00:00:00.000Z',
              updatedAt: '2026-03-01T00:00:00.000Z',
            },
          ],
          snapshots: [
            {
              id: 'snapshot-valid',
              accountId: 'acc-1',
              date: '2026-03-01',
              balance: 5000,
              source: 'manual',
              createdAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'snapshot-invalid',
              accountId: 'acc-1',
              date: '2026-13-01',
              balance: 10,
              source: 'manual',
              createdAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'snapshot-invalid-source',
              accountId: 'acc-1',
              date: '2026-03-02',
              balance: 11,
              source: 'sync',
              createdAt: '2026-03-02T00:00:00.000Z',
            },
          ],
          reconciliations: [
            {
              id: 'recon-valid',
              accountId: 'acc-1',
              date: '2026-03-03',
              balance: 6000,
              note: '  对账  ',
              createdAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'recon-invalid',
              accountId: 'acc-1',
              date: 'bad-date',
              balance: 1,
              createdAt: '2026-03-03T00:00:00.000Z',
            },
          ],
          ledgerEntries: [
            {
              id: 'ledger-valid',
              accountId: 'acc-1',
              reconciliationId: 'recon-valid',
              ruleId: 'event-valid',
              name: '  工资入账  ',
              amount: 5000,
              category: 'income',
              date: '2026-03-03',
              source: 'rule',
              createdAt: '2026-03-03T00:00:00.000Z',
              updatedAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'ledger-invalid',
              accountId: 'acc-1',
              reconciliationId: 'recon-valid',
              name: '',
              amount: Number.NaN,
              category: 'weird',
              date: '2026-03-03',
              source: 'manual',
              createdAt: '2026-03-03T00:00:00.000Z',
              updatedAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'ledger-invalid-source',
              accountId: 'acc-1',
              reconciliationId: 'recon-valid',
              name: '未知来源',
              amount: 10,
              category: 'expense',
              date: '2026-03-03',
              source: 'sync',
              createdAt: '2026-03-03T00:00:00.000Z',
              updatedAt: '2026-03-03T00:00:00.000Z',
            },
          ],
          eventOverrides: [
            {
              id: 'override-valid',
              accountId: 'acc-1',
              ruleId: 'event-valid',
              period: '2026-03',
              action: 'modified',
              amount: 5200,
              name: '  手调工资  ',
              actualDate: '2026-03-05',
              createdAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'override-invalid',
              accountId: 'acc-1',
              ruleId: 'event-valid',
              period: 'not-a-period',
              action: 'modified',
              amount: 'oops',
              createdAt: '2026-03-03T00:00:00.000Z',
            },
            {
              id: 'override-invalid-action',
              accountId: 'acc-1',
              ruleId: 'event-valid',
              period: '2026-03',
              action: 'merged',
              createdAt: '2026-03-03T00:00:00.000Z',
            },
          ],
        },
      }),
    );

    expect(imported.accounts).toHaveLength(1);
    expect(imported.account.name).toBe('主账户');
    expect(imported.account.initialBalance).toBe(0);
    expect(imported.account.warningThreshold).toBe(0);
    expect(imported.account.currency).toBe(base.account.currency);
    expect(imported.events.map((event) => event.id)).toEqual(['event-valid']);
    expect(imported.events[0].name).toBe('工资');
    expect(imported.snapshots.map((snapshot) => snapshot.id)).toEqual(['snapshot-valid']);
    expect(imported.reconciliations.map((reconciliation) => reconciliation.id)).toEqual(['recon-valid']);
    expect(imported.reconciliations[0].note).toBe('对账');
    expect(imported.ledgerEntries.map((entry) => entry.id)).toEqual(['ledger-valid']);
    expect(imported.ledgerEntries[0].name).toBe('工资入账');
    expect(imported.eventOverrides.map((override) => override.id)).toEqual(['override-valid']);
    expect(imported.eventOverrides[0].name).toBe('手调工资');
  });

  it('连续 saveState 会立即保存首个状态，并在短时间内合并后续写入', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const saveSpy = vi.spyOn(storage, 'setItem');

    const first = createDefaultState();
    const second = createDefaultState();
    second.account = { ...second.account, name: '第二次保存' };
    second.accounts = [{ ...second.accounts[0], name: '第二次保存' }];

    repository.saveState(first);
    expect(saveSpy).toHaveBeenCalledTimes(1);

    repository.saveState(second);
    expect(saveSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(150);

    expect(saveSpy).toHaveBeenCalledTimes(2);
    const persisted = JSON.parse(storage.getItem('futureMoney.state') || '{}') as PersistedStateEnvelope;
    expect(persisted.state.account.name).toBe('第二次保存');
  });

  it('beforeunload 会立即 flush 尚未落盘的最新状态', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const saveSpy = vi.spyOn(storage, 'setItem');
    const first = createDefaultState();
    const second = createDefaultState();
    second.account = { ...second.account, name: '离开前落盘' };
    second.accounts = [{ ...second.accounts[0], name: '离开前落盘' }];

    repository.saveState(first);
    repository.saveState(second);
    expect(saveSpy).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('beforeunload'));

    expect(saveSpy).toHaveBeenCalledTimes(2);
    const persisted = JSON.parse(storage.getItem('futureMoney.state') || '{}') as PersistedStateEnvelope;
    expect(persisted.state.account.name).toBe('离开前落盘');
  });

  it('相同状态重复保存时不会重复写 localStorage', () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const saveSpy = vi.spyOn(storage, 'setItem');
    const state = createDefaultState();

    repository.saveState(state);
    expect(saveSpy).toHaveBeenCalledTimes(1);

    repository.saveState(state);
    vi.advanceTimersByTime(150);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('会为非法 JSON 导入提供稳定的用户可读错误', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);

    expect(() => repository.importState('{not-json')).toThrowError('导入文件不是合法的 JSON');
  });

  it('会为缺少 state 的导入提供稳定的用户可读错误', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);

    expect(() => repository.importState(JSON.stringify({ version: '2.0.0' }))).toThrowError('导入文件格式不正确：缺少 state 数据');
  });

  it('可以保存、读取并清除导入前回滚快照', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const state = createDefaultState();
    state.account.name = '回滚前账户';
    state.accounts = [{ ...state.account }];

    repository.saveRollbackSnapshot({
      state,
      mode: 'all',
      fileName: 'backup.json',
    });

    const snapshot = repository.loadRollbackSnapshot();
    expect(snapshot).toBeTruthy();
    expect(snapshot?.mode).toBe('all');
    expect(snapshot?.fileName).toBe('backup.json');
    expect(snapshot?.state.account.name).toBe('回滚前账户');

    repository.clearRollbackSnapshot();
    expect(repository.loadRollbackSnapshot()).toBeNull();
  });

  it('exportState 生成包含 version/timestamp/scope/state 的有效 JSON 信封', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);
    const state = createDefaultState();
    state.account.name = '测试账户';

    const exported = repository.exportState(state, 'current');
    const parsed = JSON.parse(exported);

    expect(parsed.version).toBe(APP_VERSION);
    expect(parsed.timestamp).toBeTruthy();
    expect(parsed.scope).toBe('current');
    expect(parsed.state).toBeDefined();
    expect(parsed.state.account.name).toBe('测试账户');
  });

  it('importState 当 state 为空对象时使用默认值补齐', () => {
    const storage = createMemoryStorage();
    const repository = new LocalStorageStateRepository(storage);

    const imported = repository.importState(JSON.stringify({
      version: APP_VERSION,
      state: {},
    }));

    // 空对象会触发默认补齐逻辑
    expect(imported.accounts).toHaveLength(1);
    expect(imported.events).toEqual([]);
    expect(imported.reconciliations).toEqual([]);
  });
});
