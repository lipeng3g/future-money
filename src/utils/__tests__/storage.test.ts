import { describe, expect, it, vi } from 'vitest';
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

  it('导入旧格式数据时会补齐默认字段', () => {
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
    expect(imported.snapshots).toHaveLength(1);
    expect(imported.ledgerEntries).toEqual([]);
    expect(imported.eventOverrides).toEqual([]);
    expect(imported.version).toBe(APP_VERSION);
  });
});
