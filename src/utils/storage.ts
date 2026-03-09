import type { AppState, PersistedStateEnvelope, RollbackSnapshot } from '@/types/storage';
import type { AccountConfig, BalanceSnapshot, UserPreferences } from '@/types/account';
import type { CashFlowEvent } from '@/types/event';
import type { EventOverride, LedgerEntry, Reconciliation } from '@/types/reconciliation';
import { APP_VERSION, DEFAULT_ACCOUNT_CONFIG, DEFAULT_PREFERENCES } from '@/utils/defaults';
import { createId } from '@/utils/id';

const STORAGE_KEY = 'futureMoney.state';
const ROLLBACK_STORAGE_KEY = 'futureMoney.rollback';

const isStorageAvailable = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export interface StateRepository {
  loadState(): AppState;
  saveState(state: AppState): void;
  flushPendingSave(): void;
  clear(): void;
  exportState(state: AppState, mode?: 'current' | 'all'): string;
  importState(content: string): AppState;
  saveRollbackSnapshot(snapshot: { state: AppState; mode: 'current' | 'all'; fileName?: string }): void;
  loadRollbackSnapshot(): { state: AppState; mode: 'current' | 'all'; createdAt: string; fileName?: string } | null;
  clearRollbackSnapshot(): void;
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

const normalizeUserPreferences = (preferences: Partial<UserPreferences> | undefined): UserPreferences => ({
  ...DEFAULT_PREFERENCES(),
  ...(preferences ?? {}),
});

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const sanitizeStateReferences = (state: AppState): AppState => {
  const accounts = dedupeById(
    state.accounts.filter((account): account is AccountConfig => !!account?.id),
  );
  const accountIds = new Set(accounts.map((account) => account.id));

  const events = dedupeById(
    state.events.filter((event): event is CashFlowEvent => !!event?.id && accountIds.has(event.accountId)),
  );
  const eventIds = new Set(events.map((event) => event.id));

  const snapshots = dedupeById(
    state.snapshots.filter((snapshot): snapshot is BalanceSnapshot => !!snapshot?.id && accountIds.has(snapshot.accountId)),
  );

  const reconciliations = dedupeById(
    state.reconciliations.filter((reconciliation): reconciliation is Reconciliation => (
      !!reconciliation?.id && accountIds.has(reconciliation.accountId)
    )),
  ).sort((a, b) => a.date.localeCompare(b.date));
  const reconciliationIds = new Set(reconciliations.map((reconciliation) => reconciliation.id));

  const ledgerEntries = dedupeById(
    state.ledgerEntries.filter((entry): entry is LedgerEntry => {
      if (!entry?.id || !accountIds.has(entry.accountId) || !reconciliationIds.has(entry.reconciliationId)) {
        return false;
      }
      if (entry.ruleId && !eventIds.has(entry.ruleId)) {
        return false;
      }
      return true;
    }),
  );

  const eventOverrides = dedupeById(
    state.eventOverrides.filter((override): override is EventOverride => (
      !!override?.id && accountIds.has(override.accountId) && eventIds.has(override.ruleId)
    )),
  );

  const fallbackAccount = accounts[0] ?? createDefaultState().account;
  const currentAccount = accountIds.has(state.account?.id) ? state.account : fallbackAccount;

  return {
    ...state,
    account: currentAccount,
    accounts: accounts.length ? accounts : [fallbackAccount],
    events,
    preferences: normalizeUserPreferences(state.preferences),
    snapshots,
    reconciliations,
    ledgerEntries,
    eventOverrides,
  };
};

const normalizeState = (rawState: Partial<AppState>): AppState => {
  const base = createDefaultState();
  const state: AppState = {
    ...base,
    ...rawState,
    version: APP_VERSION,
    preferences: normalizeUserPreferences(rawState.preferences),
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

  return sanitizeStateReferences(state);
};

const createEnvelope = (state: AppState, scope: 'current' | 'all' = 'all'): PersistedStateEnvelope => ({
  version: APP_VERSION,
  timestamp: new Date().toISOString(),
  scope,
  state,
});

const createRollbackSnapshot = (
  state: AppState,
  mode: 'current' | 'all',
  fileName?: string,
): RollbackSnapshot => ({
  mode,
  createdAt: new Date().toISOString(),
  fileName,
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
        || !Array.isArray(parsed.state.reconciliations)
        || !Array.isArray(parsed.state.ledgerEntries)
        || !Array.isArray(parsed.state.eventOverrides)
        || !Array.isArray(parsed.state.accounts)
        || !Array.isArray(parsed.state.snapshots);

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

  saveRollbackSnapshot(snapshot: { state: AppState; mode: 'current' | 'all'; fileName?: string }): void {
    if (!this.storage) return;

    try {
      this.storage.setItem(
        ROLLBACK_STORAGE_KEY,
        JSON.stringify(createRollbackSnapshot(snapshot.state, snapshot.mode, snapshot.fileName)),
      );
    } catch (error) {
      console.warn('保存回滚快照失败', error);
    }
  }

  loadRollbackSnapshot(): RollbackSnapshot | null {
    if (!this.storage) return null;

    try {
      const raw = this.storage.getItem(ROLLBACK_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as RollbackSnapshot;
      if (!parsed?.state || (parsed.mode !== 'current' && parsed.mode !== 'all')) {
        return null;
      }

      return {
        ...parsed,
        state: normalizeState(parsed.state),
      };
    } catch (error) {
      console.warn('读取回滚快照失败', error);
      return null;
    }
  }

  clearRollbackSnapshot(): void {
    if (!this.storage) return;
    this.storage.removeItem(ROLLBACK_STORAGE_KEY);
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
