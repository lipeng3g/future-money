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
});
