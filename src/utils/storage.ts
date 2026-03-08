import type { AppState, PersistedStateEnvelope } from '@/types/storage';
import type { Reconciliation } from '@/types/reconciliation';
import { APP_VERSION, DEFAULT_ACCOUNT_CONFIG, DEFAULT_PREFERENCES, DEFAULT_SNAPSHOT } from '@/utils/defaults';
import { createId } from '@/utils/id';

const STORAGE_KEY = 'futureMoney.state';

const isStorageAvailable = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export interface StateRepository {
  loadState(): AppState;
  saveState(state: AppState): void;
  clear(): void;
  exportState(state: AppState): string;
  importState(content: string): AppState;
}

export const createDefaultState = (): AppState => {
  const account = DEFAULT_ACCOUNT_CONFIG();
  return {
    version: APP_VERSION,
    account,
    accounts: [account],
    events: [],
    preferences: DEFAULT_PREFERENCES(),
    snapshots: [],
    reconciliations: [],
    ledgerEntries: [],
    eventOverrides: [],
  };
};

/** 将 v1 快照迁移为 v2 对账记录 */
const migrateV1ToV2 = (state: AppState): AppState => {
  const reconciliations: Reconciliation[] = [];

  if (state.snapshots && state.snapshots.length > 0) {
    for (const snap of state.snapshots) {
      reconciliations.push({
        id: createId(),
        accountId: snap.accountId,
        date: snap.date,
        balance: snap.balance,
        note: snap.note ?? (snap.source === 'initial' ? '初始对账（从快照迁移）' : '从快照迁移'),
        createdAt: snap.createdAt,
      });
    }
  }
  // 没有快照时不自动创建对账记录，等待用户首次对账

  return {
    ...state,
    version: APP_VERSION,
    reconciliations,
    ledgerEntries: [],
    eventOverrides: [],
  };
};

const normalizeState = (rawState: Partial<AppState>): AppState => {
  const base = createDefaultState();
  const state: AppState = {
    ...base,
    ...rawState,
    version: APP_VERSION,
  };

  if (!state.accounts || state.accounts.length === 0) {
    state.accounts = [state.account];
  }

  if (state.accounts[0]) {
    state.account = state.accounts[0];
  }

  if (!state.snapshots || state.snapshots.length === 0) {
    state.snapshots = [DEFAULT_SNAPSHOT(state.account)];
  }

  if (!state.reconciliations || state.reconciliations.length === 0) {
    const migrated = migrateV1ToV2(state);
    state.reconciliations = migrated.reconciliations;
    state.ledgerEntries = migrated.ledgerEntries;
    state.eventOverrides = migrated.eventOverrides;
  }

  if (!state.ledgerEntries) state.ledgerEntries = [];
  if (!state.eventOverrides) state.eventOverrides = [];

  return state;
};

const createEnvelope = (state: AppState): PersistedStateEnvelope => ({
  version: APP_VERSION,
  timestamp: new Date().toISOString(),
  state,
});

export class LocalStorageStateRepository implements StateRepository {
  private storage: Storage | null;

  constructor(storage: Storage | null = isStorageAvailable() ? window.localStorage : null) {
    this.storage = storage;
  }

  loadState(): AppState {
    if (!this.storage) return createDefaultState();
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw) as PersistedStateEnvelope;
      if (!parsed.state) throw new Error('invalid state payload');
      const state = normalizeState(parsed.state);

      const shouldPersistMigration = parsed.version !== APP_VERSION
        || !parsed.state.reconciliations
        || !parsed.state.ledgerEntries
        || !parsed.state.eventOverrides
        || !parsed.state.accounts?.length
        || !parsed.state.snapshots?.length;

      if (shouldPersistMigration) {
        this.saveState(state);
      }

      return state;
    } catch (error) {
      console.warn('无法解析本地数据，回退默认值', error);
      return createDefaultState();
    }
  }

  saveState(state: AppState): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(createEnvelope(state)));
    } catch (error) {
      console.warn('存储数据失败', error);
    }
  }

  clear(): void {
    if (!this.storage) return;
    this.storage.removeItem(STORAGE_KEY);
  }

  exportState(state: AppState): string {
    return JSON.stringify(createEnvelope(state), null, 2);
  }

  importState(content: string): AppState {
    const parsed = JSON.parse(content) as PersistedStateEnvelope;
    if (!parsed || !parsed.state) {
      throw new Error('导入文件格式不正确');
    }
    return normalizeState(parsed.state);
  }
}

export const createStateRepository = (): StateRepository => new LocalStorageStateRepository();
