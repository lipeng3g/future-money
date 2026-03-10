import type { AppState, PersistedStateEnvelope, RollbackSnapshot } from '@/types/storage';
import type { AccountConfig, BalanceSnapshot, UserPreferences } from '@/types/account';
import type { CashFlowEvent } from '@/types/event';
import type { EventOverride, LedgerEntry, Reconciliation } from '@/types/reconciliation';
import { APP_VERSION, DEFAULT_ACCOUNT_CONFIG, DEFAULT_PREFERENCES } from '@/utils/defaults';
import { createId } from '@/utils/id';
import { isValidISODate, validateCashFlowEvent } from '@/utils/validators';

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

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNonNegativeNumber = (value: unknown): value is number => isFiniteNumber(value) && value >= 0;
const isTransactionCategory = (value: unknown): value is 'income' | 'expense' => value === 'income' || value === 'expense';

const sanitizeAccount = (account: AccountConfig): AccountConfig | null => {
  if (!account?.id || !account.name?.trim()) {
    return null;
  }

  return {
    ...account,
    name: account.name.trim(),
    typeLabel: account.typeLabel?.trim() || undefined,
    initialBalance: isFiniteNumber(account.initialBalance) ? account.initialBalance : 0,
    currency: account.currency?.trim() || DEFAULT_ACCOUNT_CONFIG().currency,
    warningThreshold: isNonNegativeNumber(account.warningThreshold) ? account.warningThreshold : 0,
  };
};

const sanitizeEvent = (event: CashFlowEvent): CashFlowEvent | null => {
  if (!event?.id || !event.accountId) {
    return null;
  }

  const normalized: CashFlowEvent = {
    ...event,
    name: event.name?.trim() ?? '',
    amount: isFiniteNumber(event.amount) ? event.amount : Number.NaN,
    enabled: typeof event.enabled === 'boolean' ? event.enabled : true,
    notes: event.notes?.trim() || undefined,
    color: event.color?.trim() || undefined,
  };

  return validateCashFlowEvent(normalized).length === 0 ? normalized : null;
};

const sanitizeSnapshot = (snapshot: BalanceSnapshot): BalanceSnapshot | null => {
  if (!snapshot?.id || !snapshot.accountId || !isValidISODate(snapshot.date) || !isFiniteNumber(snapshot.balance)) {
    return null;
  }
  if (!['initial', 'manual', 'import'].includes(snapshot.source)) {
    return null;
  }

  return {
    ...snapshot,
    note: snapshot.note?.trim() || undefined,
  };
};

const sanitizeReconciliation = (reconciliation: Reconciliation): Reconciliation | null => {
  if (!reconciliation?.id || !reconciliation.accountId || !isValidISODate(reconciliation.date) || !isFiniteNumber(reconciliation.balance)) {
    return null;
  }

  return {
    ...reconciliation,
    note: reconciliation.note?.trim() || undefined,
  };
};

const sanitizeLedgerEntry = (entry: LedgerEntry): LedgerEntry | null => {
  if (
    !entry?.id
    || !entry.accountId
    || !entry.reconciliationId
    || !entry.name?.trim()
    || !isFiniteNumber(entry.amount)
    || !isTransactionCategory(entry.category)
    || !isValidISODate(entry.date)
    || !['rule', 'manual', 'adjustment'].includes(entry.source)
  ) {
    return null;
  }

  return {
    ...entry,
    name: entry.name.trim(),
    ruleId: entry.ruleId || undefined,
  };
};

const isValidOverridePeriod = (period: string): boolean => (
  /^\d{4}-\d{2}$/.test(period)
  || isValidISODate(period)
  || /^\d{4}$/.test(period)
);

const sanitizeEventOverride = (override: EventOverride): EventOverride | null => {
  if (
    !override?.id
    || !override.accountId
    || !override.ruleId
    || !override.period
    || !isValidOverridePeriod(override.period)
    || !['confirmed', 'skipped', 'modified'].includes(override.action)
  ) {
    return null;
  }

  if (override.action === 'modified' && !isFiniteNumber(override.amount)) {
    return null;
  }

  if (override.actualDate && !isValidISODate(override.actualDate)) {
    return null;
  }

  return {
    ...override,
    amount: override.action === 'modified' ? override.amount : undefined,
    actualDate: override.actualDate || undefined,
    name: override.name?.trim() || undefined,
  };
};

const sanitizeStateReferences = (state: AppState): AppState => {
  const accounts = dedupeById(
    state.accounts
      .map((account) => sanitizeAccount(account as AccountConfig))
      .filter((account): account is AccountConfig => !!account),
  );
  const accountIds = new Set(accounts.map((account) => account.id));

  const events = dedupeById(
    state.events
      .map((event) => sanitizeEvent(event as CashFlowEvent))
      .filter((event): event is CashFlowEvent => !!event && accountIds.has(event.accountId)),
  );
  const eventIds = new Set(events.map((event) => event.id));

  const snapshots = dedupeById(
    state.snapshots
      .map((snapshot) => sanitizeSnapshot(snapshot as BalanceSnapshot))
      .filter((snapshot): snapshot is BalanceSnapshot => !!snapshot && accountIds.has(snapshot.accountId)),
  );

  const reconciliations = dedupeById(
    state.reconciliations
      .map((reconciliation) => sanitizeReconciliation(reconciliation as Reconciliation))
      .filter((reconciliation): reconciliation is Reconciliation => (
        !!reconciliation && accountIds.has(reconciliation.accountId)
      )),
  ).sort((a, b) => a.date.localeCompare(b.date));
  const reconciliationIds = new Set(reconciliations.map((reconciliation) => reconciliation.id));

  const ledgerEntries = dedupeById(
    state.ledgerEntries
      .map((entry) => sanitizeLedgerEntry(entry as LedgerEntry))
      .filter((entry): entry is LedgerEntry => {
        if (!entry || !accountIds.has(entry.accountId) || !reconciliationIds.has(entry.reconciliationId)) {
          return false;
        }
        if (entry.ruleId && !eventIds.has(entry.ruleId)) {
          return false;
        }
        return true;
      }),
  );

  const eventOverrides = dedupeById(
    state.eventOverrides
      .map((override) => sanitizeEventOverride(override as EventOverride))
      .filter((override): override is EventOverride => (
        !!override && accountIds.has(override.accountId) && eventIds.has(override.ruleId)
      )),
  );

  const fallbackAccount = accounts[0] ?? createDefaultState().account;
  const sanitizedCurrentAccount = sanitizeAccount(state.account as AccountConfig);
  const currentAccount = sanitizedCurrentAccount && accountIds.has(sanitizedCurrentAccount.id)
    ? sanitizedCurrentAccount
    : fallbackAccount;

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

  // 兼容旧版：accounts 缺失时用 account 补齐。
  if (!state.accounts || state.accounts.length === 0) {
    state.accounts = [state.account];
  }

  // 避免误把 accounts[0] 覆盖为当前账户：优先保留 rawState.account
  // (导入/恢复时 account 代表用户上次选中的账户，而 accounts[0] 只是列表首项)
  if (rawState.account && typeof rawState.account === 'object') {
    state.account = rawState.account as AppState['account'];
  } else if (state.accounts[0]) {
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

const parseImportedEnvelope = (content: string): PersistedStateEnvelope => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('导入文件不是合法的 JSON');
  }

  if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) {
    throw new Error('导入文件格式不正确：缺少 state 数据');
  }

  const envelope = parsed as PersistedStateEnvelope;
  if (!envelope.state || typeof envelope.state !== 'object') {
    throw new Error('导入文件格式不正确：state 内容无效');
  }

  return envelope;
};

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
    const parsed = parseImportedEnvelope(content);
    return normalizeState(parsed.state);
  }
}

export const createStateRepository = (): StateRepository => new LocalStorageStateRepository();
