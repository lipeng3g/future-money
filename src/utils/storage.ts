import type { AppState, PersistedStateEnvelope } from '@/types/storage';
import type { Reconciliation } from '@/types/reconciliation';
import { APP_VERSION, DEFAULT_ACCOUNT_CONFIG, DEFAULT_PREFERENCES } from '@/utils/defaults';
import { createId } from '@/utils/id';

const STORAGE_KEY = 'futureMoney.state';

const isStorageAvailable = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export interface StateRepository {
  loadState(): AppState;
  saveState(state: AppState): void;
  flushPendingSave(): void;
  clear(): void;
  exportState(state: AppState, mode?: 'current' | 'all'): string;
  importState(content: string): AppState;
}

const SAVE_DEBOUNCE_MS = 120;

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

  if (!state.snapshots) {
    state.snapshots = [];
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

const createEnvelope = (state: AppState, scope: 'current' | 'all' = 'all'): PersistedStateEnvelope => ({
  version: APP_VERSION,
  timestamp: new Date().toISOString(),
  scope,
  state,
});

export class LocalStorageStateRepository implements StateRepository {
  private storage: Storage | null;

  private pendingSaveTimer: ReturnType<typeof setTimeout> | null = null;

  private pendingState: AppState | null = null;

  private lastSavedSnapshot: string | null = null;

  private readonly beforeUnloadHandler = () => {
    this.flushPendingSave();
  };

  constructor(storage: Storage | null = isStorageAvailable() ? window.localStorage : null) {
    this.storage = storage;

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
      window.addEventListener('pagehide', this.beforeUnloadHandler);
    }
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
        this.writeState(state);
      }

      return state;
    } catch (error) {
      console.warn('无法解析本地数据，回退默认值', error);
      return createDefaultState();
    }
  }

  private writeState(state: AppState): void {
    if (!this.storage) return;

    const serializedState = JSON.stringify(state);
    if (serializedState === this.lastSavedSnapshot) {
      return;
    }

    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(createEnvelope(state, 'all')));
      this.lastSavedSnapshot = serializedState;
    } catch (error) {
      console.warn('存储数据失败', error);
    }
  }

  flushPendingSave(): void {
    if (this.pendingSaveTimer) {
      clearTimeout(this.pendingSaveTimer);
      this.pendingSaveTimer = null;
    }

    if (!this.pendingState) {
      return;
    }

    const state = this.pendingState;
    this.pendingState = null;
    this.writeState(state);
  }

  saveState(state: AppState): void {
    if (!this.storage) return;

    if (!this.pendingSaveTimer) {
      this.writeState(state);
    }

    this.pendingState = state;
    if (this.pendingSaveTimer) {
      clearTimeout(this.pendingSaveTimer);
    }

    this.pendingSaveTimer = setTimeout(() => {
      this.flushPendingSave();
    }, SAVE_DEBOUNCE_MS);
  }

  clear(): void {
    if (!this.storage) return;
    this.pendingState = null;
    if (this.pendingSaveTimer) {
      clearTimeout(this.pendingSaveTimer);
      this.pendingSaveTimer = null;
    }
    this.lastSavedSnapshot = null;
    this.storage.removeItem(STORAGE_KEY);
  }

  exportState(state: AppState, mode: 'current' | 'all' = 'all'): string {
    return JSON.stringify(createEnvelope(state, mode), null, 2);
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
