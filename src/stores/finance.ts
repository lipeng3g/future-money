import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { TimelineGenerator } from '@/utils/timeline';
import { AnalyticsEngine } from '@/utils/analytics';
import { ReconciliationEngine } from '@/utils/reconciliation';
import { createStateRepository, createDefaultState } from '@/utils/storage';
import { validateCashFlowEvent } from '@/utils/validators';
import { APP_VERSION, DEFAULT_PREFERENCES, ACCOUNT_COLORS, ACCOUNT_ICONS } from '@/utils/defaults';
import type {
  AccountConfig,
  AccountUpdate,
  AnalyticsSummary,
  AppState,
  CashFlowEvent,
  CashFlowEventUpdate,
  NewCashFlowEvent,
  PreferencesUpdate,
  UserPreferences,
  BalanceSnapshot,
  DailySnapshot,
  Reconciliation,
  LedgerEntry,
  EventOverride,
} from '@/types';
import type { ImportExportMode, RollbackSnapshot } from '@/types/storage';
import { createId } from '@/utils/id';
import { generateSampleEvents } from '@/utils/sample-data';
import { formatLocalISODate } from '@/utils/date';
import { aggregateAccountTimelines } from '@/utils/timeline-aggregate';
import { buildEventsCsv, buildEventsJson, type EventExportFormat } from '@/utils/export-events';
import { clearChatPersistenceByAccountIds } from '@/utils/ai-storage';

const storage = createStateRepository();
const generator = new TimelineGenerator();
const analyticsEngine = new AnalyticsEngine();
const reconciliationEngine = new ReconciliationEngine();

const seedState = storage.loadState();

export const useFinanceStore = defineStore('finance', () => {
  const account = ref<AccountConfig>({ ...seedState.account });
  const accounts = ref<AccountConfig[]>([...(seedState.accounts ?? [seedState.account])]);
  const currentAccountId = ref<string>(account.value.id || accounts.value[0]?.id || '');
  const events = ref<CashFlowEvent[]>([...seedState.events]);
  const preferences = ref<UserPreferences>({ ...seedState.preferences });
  const viewMonths = ref(preferences.value.defaultViewMonths || 12);
  const snapshots = ref<BalanceSnapshot[]>([...(seedState.snapshots ?? [])]);

  // 新增：对账系统状态
  const reconciliations = ref<Reconciliation[]>([...(seedState.reconciliations ?? [])]);
  const ledgerEntries = ref<LedgerEntry[]>([...(seedState.ledgerEntries ?? [])]);
  const eventOverrides = ref<EventOverride[]>([...(seedState.eventOverrides ?? [])]);

  // 模拟日期（用于测试），null 表示使用系统真实日期
  const simulatedToday = ref<string | null>(null);

  /** 当前逻辑日期字符串 (YYYY-MM-DD) */
  const todayStr = computed<string>(() => {
    return simulatedToday.value ?? formatLocalISODate();
  });

  type ViewMode = 'single' | 'multi';
  const viewMode = ref<ViewMode>('single');
  const multiAccountSelection = ref<string[]>([]);

  const isMultiAccountView = computed(() => viewMode.value === 'multi');

  const currentAccount = computed<AccountConfig>(() => {
    const found = accounts.value.find((a) => a.id === currentAccountId.value);
    return found ?? accounts.value[0] ?? account.value;
  });

  // 保持 account 与 accounts 列表中的当前账户同步，兼容旧代码使用 account
  watch(
    currentAccount,
    (val) => {
      if (!val) return;
      account.value = { ...val };
    },
    { immediate: true },
  );

  const selectedAccountIds = computed<string[]>(() => {
    if (!isMultiAccountView.value) {
      return [currentAccount.value.id];
    }
    if (multiAccountSelection.value.length) {
      return [...multiAccountSelection.value];
    }
    return accounts.value.map((a) => a.id);
  });

  // --- 对账相关 Computed ---

  /** 当前账户的对账记录（按日期排序） */
  const sortedReconciliations = computed<Reconciliation[]>(() => {
    return reconciliations.value
      .filter((r) => r.accountId === currentAccount.value.id)
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  /** 最新对账记录 */
  const latestReconciliation = computed<Reconciliation | null>(() => {
    return sortedReconciliations.value.at(-1) ?? null;
  });

  /** 是否需要对账（最新对账日 < 今天） */
  const needsReconciliation = computed<boolean>(() => {
    if (!latestReconciliation.value) return true;
    return latestReconciliation.value.date < todayStr.value;
  });

  /** 当前账户的账本条目 */
  const accountLedgerEntries = computed<LedgerEntry[]>(() => {
    return ledgerEntries.value.filter((e) => e.accountId === currentAccount.value.id);
  });

  /** 当前账户的事件覆盖 */
  const accountOverrides = computed<EventOverride[]>(() => {
    return eventOverrides.value.filter((o) => o.accountId === currentAccount.value.id);
  });

  // --- 旧版兼容 Computed (snapshots) ---
  const snapshotsByAccount = computed<Record<string, BalanceSnapshot[]>>(() => {
    const map: Record<string, BalanceSnapshot[]> = {};
    snapshots.value.forEach((snap) => {
      if (!map[snap.accountId]) map[snap.accountId] = [];
      map[snap.accountId].push(snap);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.date.localeCompare(b.date)),
    );
    return map;
  });

  const sortedSnapshots = computed<BalanceSnapshot[]>(() => snapshotsByAccount.value[currentAccount.value.id] ?? []);
  const latestSnapshot = computed<BalanceSnapshot | null>(() => sortedSnapshots.value.at(-1) ?? null);

  // 当前视图使用的快照 id（null 表示使用最新快照 — 保留兼容）
  const viewSnapshotId = ref<string | null>(null);

  const activeSnapshot = computed<BalanceSnapshot | null>(() => {
    if (!sortedSnapshots.value.length) return null;
    if (!viewSnapshotId.value) return latestSnapshot.value;
    return sortedSnapshots.value.find((snap) => snap.id === viewSnapshotId.value) ?? latestSnapshot.value;
  });

  const isHistoricalView = computed(() => {
    if (isMultiAccountView.value) return false;
    if (!activeSnapshot.value || !latestSnapshot.value) return false;
    return activeSnapshot.value.id !== latestSnapshot.value.id;
  });

  // 单账户视图下的时间线（基于对账系统）
  const singleTimeline = computed<DailySnapshot[]>(() => {
    const accountRecons = sortedReconciliations.value;
    if (!accountRecons.length) return [];

    const accountEvents = events.value.filter((e) => e.accountId === currentAccount.value.id);

    return generator.generate({
      events: accountEvents,
      reconciliations: accountRecons,
      ledgerEntries: accountLedgerEntries.value,
      eventOverrides: accountOverrides.value,
      months: viewMonths.value,
      today: todayStr.value,
    });
  });

  // 多账户视图下：先为每个账户生成独立时间线，再汇总
  const timelinesByAccount = computed<Record<string, DailySnapshot[]>>(() => {
    const map: Record<string, DailySnapshot[]> = {};

    selectedAccountIds.value.forEach((accId) => {
      const evts = events.value.filter((e) => e.accountId === accId);
      const recons = reconciliations.value
        .filter((r) => r.accountId === accId)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (!recons.length) return;
      const entries = ledgerEntries.value.filter((e) => e.accountId === accId);
      const overrides = eventOverrides.value.filter((o) => o.accountId === accId);

      map[accId] = generator.generate({
        events: evts,
        reconciliations: recons,
        ledgerEntries: entries,
        eventOverrides: overrides,
        months: viewMonths.value,
        today: todayStr.value,
      });
    });

    return map;
  });

  const aggregatedTimeline = computed<DailySnapshot[]>(() =>
    aggregateAccountTimelines(timelinesByAccount.value, selectedAccountIds.value),
  );

  const timeline = computed<DailySnapshot[]>(() =>
    isMultiAccountView.value ? aggregatedTimeline.value : singleTimeline.value,
  );

  const warningThreshold = computed(() => {
    if (!isMultiAccountView.value) {
      return currentAccount.value.warningThreshold;
    }
    return accounts.value
      .filter((a) => selectedAccountIds.value.includes(a.id))
      .reduce((sum, a) => sum + (a.warningThreshold ?? 0), 0);
  });

  const analytics = computed<AnalyticsSummary>(() =>
    analyticsEngine.generate(timeline.value, warningThreshold.value),
  );

  const syncCurrentAccountToList = () => {
    const idx = accounts.value.findIndex((a) => a.id === account.value.id);
    const next = { ...account.value };
    if (idx >= 0) {
      accounts.value.splice(idx, 1, next);
    } else {
      accounts.value.push(next);
    }
  };

  const buildAppState = (mode: ImportExportMode = 'all'): AppState => {
    if (mode === 'current') {
      return {
        version: APP_VERSION,
        account: currentAccount.value,
        accounts: [currentAccount.value],
        events: events.value.filter((e) => e.accountId === currentAccount.value.id),
        preferences: preferences.value,
        snapshots: snapshots.value.filter((s) => s.accountId === currentAccount.value.id),
        reconciliations: reconciliations.value.filter((r) => r.accountId === currentAccount.value.id),
        ledgerEntries: ledgerEntries.value.filter((e) => e.accountId === currentAccount.value.id),
        eventOverrides: eventOverrides.value.filter((o) => o.accountId === currentAccount.value.id),
      };
    }

    return {
      version: APP_VERSION,
      account: currentAccount.value,
      accounts: accounts.value,
      events: events.value,
      preferences: preferences.value,
      snapshots: snapshots.value,
      reconciliations: reconciliations.value,
      ledgerEntries: ledgerEntries.value,
      eventOverrides: eventOverrides.value,
    };
  };

  const persist = (options?: { flush?: boolean }) => {
    storage.saveState(buildAppState('all'));
    if (options?.flush) {
      storage.flushPendingSave();
    }
  };

  const exportVisibleEvents = (format: EventExportFormat = 'csv') => {
    const selectedEvents = visibleEvents.value;
    const defaultFileName = `future-money-events-${new Date().toISOString().slice(0, 10)}.${format}`;

    if (format === 'json') {
      return {
        success: true as const,
        fileName: defaultFileName,
        contentType: 'application/json;charset=utf-8',
        content: buildEventsJson(selectedEvents),
      };
    }

    return {
      success: true as const,
      fileName: defaultFileName,
      contentType: 'text/csv;charset=utf-8',
      content: buildEventsCsv(selectedEvents, accounts.value),
    };
  };

  const createRollbackSnapshot = (mode: ImportExportMode, fileName?: string) => {
    storage.saveRollbackSnapshot({
      state: buildAppState('all'),
      mode,
      fileName,
    });
  };

  const rollbackSnapshot = ref<RollbackSnapshot | null>(storage.loadRollbackSnapshot());

  const refreshRollbackSnapshot = () => {
    rollbackSnapshot.value = storage.loadRollbackSnapshot();
  };

  const applyState = (nextState: AppState, options?: { preferredAccountId?: string }) => {
    accounts.value = [...nextState.accounts];
    const preferredId = options?.preferredAccountId;
    const nextCurrentId = preferredId && nextState.accounts.some((acc) => acc.id === preferredId)
      ? preferredId
      : nextState.account.id;

    currentAccountId.value = nextCurrentId;
    account.value = { ...(nextState.accounts.find((acc) => acc.id === nextCurrentId) ?? nextState.account) };
    events.value = [...nextState.events];
    preferences.value = { ...nextState.preferences };
    viewMonths.value = nextState.preferences.defaultViewMonths || 12;
    snapshots.value = [...nextState.snapshots];
    reconciliations.value = [...nextState.reconciliations];
    ledgerEntries.value = [...nextState.ledgerEntries];
    eventOverrides.value = [...nextState.eventOverrides];
    viewMode.value = 'single';
    multiAccountSelection.value = [];
    viewSnapshotId.value = null;
  };

  const sortEvents = () => {
    events.value = [...events.value].sort((a, b) => a.startDate.localeCompare(b.startDate));
  };

  const addEvent = (payload: NewCashFlowEvent):
    | { success: true; event: CashFlowEvent }
    | { success: false; errors?: string[]; message?: string } => {
    const withAccount: NewCashFlowEvent = {
      ...payload,
      accountId: payload.accountId ?? account.value.id,
    };
    const validation = validateCashFlowEvent(withAccount);
    if (validation.length) {
      return { success: false as const, errors: validation };
    }
    const timestamp = new Date().toISOString();
    const record: CashFlowEvent = {
      ...(withAccount as CashFlowEvent),
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    events.value = [...events.value, record];
    sortEvents();
    persist();
    return { success: true as const, event: record };
  };

  const updateEvent = (id: string, updates: CashFlowEventUpdate) => {
    const index = events.value.findIndex((event) => event.id === id);
    if (index === -1) return { success: false as const, message: '事件不存在' };
    const merged = { ...events.value[index], ...updates } as CashFlowEvent;
    const validation = validateCashFlowEvent(merged);
    if (validation.length) {
      return { success: false as const, errors: validation };
    }
    merged.updatedAt = new Date().toISOString();
    events.value.splice(index, 1, merged);
    sortEvents();
    persist();
    return { success: true as const };
  };

  const deleteEvent = (id: string) => {
    const exists = events.value.some((event) => event.id === id);
    if (!exists) {
      return { success: false as const, message: '事件不存在' };
    }
    events.value = events.value.filter((event) => event.id !== id);
    persist();
    return { success: true as const };
  };

  const toggleEvent = (id: string, enabled: boolean) => updateEvent(id, { enabled });

  const visibleEvents = computed(() => {
    const base = isMultiAccountView.value
      ? events.value.filter((e) => selectedAccountIds.value.includes(e.accountId))
      : events.value.filter((e) => e.accountId === currentAccount.value.id);
    return [...base].sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  // --- 对账 Actions ---

  /** 执行对账 */
  const reconcile = (
    date: string,
    balance: number,
    entries: Array<{ ruleId?: string; name: string; amount: number; category: 'income' | 'expense'; date: string; source: 'rule' | 'manual' }>,
    note?: string,
  ) => {
    const accId = currentAccount.value.id;
    const lastRecon = latestReconciliation.value;

    const { reconciliation, ledgerEntries: newEntries } = reconciliationEngine.createReconciliation(
      accId,
      date,
      balance,
      entries,
      lastRecon,
      note,
    );

    reconciliations.value = [...reconciliations.value, reconciliation];
    ledgerEntries.value = [...ledgerEntries.value, ...newEntries];

    // 清理已冻结期间的 confirmed 覆盖（不再需要）
    if (lastRecon) {
      const confirmedOverrideIds = new Set(
        eventOverrides.value
          .filter((o) => o.accountId === accId && o.action === 'confirmed')
          .map((o) => o.id),
      );
      if (confirmedOverrideIds.size > 0) {
        eventOverrides.value = eventOverrides.value.filter((o) => !confirmedOverrideIds.has(o.id));
      }
    }

    // 同步 account 的 initialBalance
    account.value = {
      ...account.value,
      initialBalance: balance,
      updatedAt: new Date().toISOString(),
    };
    syncCurrentAccountToList();

    // 同步添加一条快照（向后兼容）
    const nowIso = new Date().toISOString();
    const existingSnapIdx = snapshots.value.findIndex(
      (s) => s.date === date && s.accountId === accId,
    );
    if (existingSnapIdx >= 0) {
      snapshots.value.splice(existingSnapIdx, 1, {
        ...snapshots.value[existingSnapIdx],
        balance,
        createdAt: nowIso,
      });
    } else {
      snapshots.value.push({
        id: createId(),
        accountId: accId,
        date,
        balance,
        source: 'manual',
        createdAt: nowIso,
      });
      snapshots.value.sort((a, b) => a.date.localeCompare(b.date));
    }

    persist();
    return reconciliation;
  };

  /** 编辑冻结区账本条目 */
  const updateLedgerEntry = (id: string, updates: Partial<Pick<LedgerEntry, 'name' | 'amount' | 'category' | 'date'>>) => {
    const idx = ledgerEntries.value.findIndex((e) => e.id === id);
    if (idx === -1) return;

    const entry = { ...ledgerEntries.value[idx], ...updates, updatedAt: new Date().toISOString() };
    ledgerEntries.value.splice(idx, 1, entry);

    // 重算该对账期的 adjustment
    recalculateAdjustmentForReconciliation(entry.reconciliationId);
    persist();
  };

  /** 删除冻结区账本条目 */
  const deleteLedgerEntry = (id: string) => {
    const entry = ledgerEntries.value.find((e) => e.id === id);
    if (!entry) return;
    const reconId = entry.reconciliationId;
    ledgerEntries.value = ledgerEntries.value.filter((e) => e.id !== id);
    recalculateAdjustmentForReconciliation(reconId);
    persist();
  };

  /** 手动添加账本条目到某个对账期 */
  const addManualLedgerEntry = (
    reconciliationId: string,
    entry: { name: string; amount: number; category: 'income' | 'expense'; date: string },
  ) => {
    const recon = reconciliations.value.find((r) => r.id === reconciliationId);
    if (!recon) return;
    const nowIso = new Date().toISOString();
    const newEntry: LedgerEntry = {
      id: createId(),
      accountId: recon.accountId,
      reconciliationId,
      name: entry.name,
      amount: entry.amount,
      category: entry.category,
      date: entry.date,
      source: 'manual',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    ledgerEntries.value = [...ledgerEntries.value, newEntry];
    recalculateAdjustmentForReconciliation(reconciliationId);
    persist();
  };

  /** 重算某个对账期的调整条目 */
  const recalculateAdjustmentForReconciliation = (reconciliationId: string) => {
    const recon = reconciliations.value.find((r) => r.id === reconciliationId);
    if (!recon) return;

    // 获取前一个对账点的余额
    const sorted = [...reconciliations.value]
      .filter((r) => r.accountId === recon.accountId)
      .sort((a, b) => a.date.localeCompare(b.date));
    const reconIdx = sorted.findIndex((r) => r.id === reconciliationId);
    const previousBalance = reconIdx > 0 ? sorted[reconIdx - 1].balance : 0;

    const periodEntries = ledgerEntries.value.filter((e) => e.reconciliationId === reconciliationId);
    const newEntries = reconciliationEngine.recalculateAdjustment(recon, periodEntries, previousBalance);

    // 替换该对账期的所有条目
    ledgerEntries.value = [
      ...ledgerEntries.value.filter((e) => e.reconciliationId !== reconciliationId),
      ...newEntries,
    ];
  };

  // --- 事件覆盖 Actions ---

  /** 添加或更新事件覆盖（ruleId + period 唯一） */
  const addEventOverride = (
    ruleId: string,
    period: string,
    action: EventOverride['action'],
    options?: { amount?: number; name?: string; actualDate?: string },
  ) => {
    const accId = currentAccount.value.id;
    const existing = eventOverrides.value.findIndex(
      (o) => o.accountId === accId && o.ruleId === ruleId && o.period === period,
    );

    const nowIso = new Date().toISOString();

    if (existing >= 0) {
      eventOverrides.value.splice(existing, 1, {
        ...eventOverrides.value[existing],
        action,
        amount: options?.amount,
        name: options?.name,
        actualDate: options?.actualDate,
        createdAt: nowIso,
      });
    } else {
      eventOverrides.value = [
        ...eventOverrides.value,
        {
          id: createId(),
          accountId: accId,
          ruleId,
          period,
          action,
          amount: options?.amount,
          name: options?.name,
          actualDate: options?.actualDate,
          createdAt: nowIso,
        },
      ];
    }

    persist();
  };

  /** 删除事件覆盖 */
  const removeEventOverride = (id: string) => {
    eventOverrides.value = eventOverrides.value.filter((o) => o.id !== id);
    persist();
  };

  /** 设置模拟日期（null 表示使用真实日期） */
  const setSimulatedToday = (date: string | null) => {
    simulatedToday.value = date;
  };

  // --- 旧版兼容 Actions ---

  /** 向后兼容：addSnapshot 内部改为调用 reconcile */
  const addSnapshot = (balance: number, date: string, note?: string) => {
    const accId = currentAccount.value.id;
    const lastRecon = latestReconciliation.value;
    const accountEvents = events.value.filter((e) => e.accountId === accId);

    // 自动生成对账期间的事件
    const pendingEntries = reconciliationEngine.generatePendingEntries(
      accountEvents,
      lastRecon,
      date,
    );

    const entries = pendingEntries.map((pe) => ({
      ruleId: pe.ruleId,
      name: pe.name,
      amount: pe.amount,
      category: pe.category,
      date: pe.date,
      source: pe.source as 'rule' | 'manual',
    }));

    return reconcile(date, balance, entries, note);
  };

  const addAccount = (payload: { name: string; typeLabel?: string; initialBalance?: number; warningThreshold?: number }) => {
    const nowIso = new Date().toISOString();
    const index = accounts.value.length;
    const color = ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
    const iconKey = ACCOUNT_ICONS[index % ACCOUNT_ICONS.length];
    const name = payload.name.trim() || `账户 ${index + 1}`;
    const typeLabel = payload.typeLabel?.trim() || undefined;

    const accountConfig: AccountConfig = {
      id: createId(),
      name,
      typeLabel,
      initialBalance: payload.initialBalance ?? 0,
      currency: currentAccount.value.currency,
      warningThreshold: payload.warningThreshold ?? currentAccount.value.warningThreshold ?? 0,
      color,
      iconKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    accounts.value.push(accountConfig);
    currentAccountId.value = accountConfig.id;
    account.value = { ...accountConfig };

    // 不创建初始对账记录，等待用户首次对账来设定真实余额

    viewMode.value = 'single';
    viewSnapshotId.value = null;
    multiAccountSelection.value = [];

    persist();
    return accountConfig;
  };

  const setViewSnapshot = (id: string | null) => {
    if (!id) {
      viewSnapshotId.value = null;
      return;
    }
    if (latestSnapshot.value && id === latestSnapshot.value.id) {
      viewSnapshotId.value = null;
    } else {
      viewSnapshotId.value = id;
    }
  };

  const updateAccount = (update: AccountUpdate) => {
    account.value = {
      ...account.value,
      ...update,
      updatedAt: new Date().toISOString(),
    };
    syncCurrentAccountToList();
    persist();
  };

  const setViewMonths = (months: number) => {
    const normalizedMonths = Number.isFinite(months) && months > 0
      ? Math.round(months)
      : DEFAULT_PREFERENCES().defaultViewMonths;
    viewMonths.value = normalizedMonths;
    preferences.value = {
      ...preferences.value,
      defaultViewMonths: normalizedMonths,
    };
    persist();
  };

  const updateUserPreferences = (update: PreferencesUpdate) => {
    preferences.value = {
      ...preferences.value,
      ...update,
    };
    if (typeof update.defaultViewMonths === 'number') {
      viewMonths.value = update.defaultViewMonths;
    }
    persist();
  };

  const resetState = () => {
    const defaults = createDefaultState();
    applyState(defaults, { preferredAccountId: defaults.account.id });
    persist();
  };

  const loadSampleData = () => {
    const now = new Date();
    const today = todayStr.value;
    const updated: AccountConfig = {
      ...currentAccount.value,
      initialBalance: 16000,
      warningThreshold: 1000,
      updatedAt: now.toISOString(),
    };
    account.value = updated;
    const idx = accounts.value.findIndex((a) => a.id === updated.id);
    if (idx >= 0) accounts.value.splice(idx, 1, updated);

    snapshots.value = snapshots.value.filter((s) => s.accountId !== updated.id);
    snapshots.value.push({
      id: createId(),
      accountId: updated.id,
      date: today,
      balance: 16000,
      source: 'initial',
      createdAt: now.toISOString(),
    });

    // 重建对账记录
    reconciliations.value = reconciliations.value.filter((r) => r.accountId !== updated.id);
    reconciliations.value.push({
      id: createId(),
      accountId: updated.id,
      date: today,
      balance: 16000,
      note: '示例数据初始对账',
      createdAt: now.toISOString(),
    });

    // 清理该账户的账本条目和覆盖
    ledgerEntries.value = ledgerEntries.value.filter((e) => e.accountId !== updated.id);
    eventOverrides.value = eventOverrides.value.filter((o) => o.accountId !== updated.id);

    events.value = [
      ...events.value.filter((e) => e.accountId !== updated.id),
      ...generateSampleEvents(updated.id),
    ];
    sortEvents();
    persist();
  };

  const importCurrentAccountState = (content: string, fileName?: string) => {
    const imported = storage.importState(content);
    createRollbackSnapshot('current', fileName);
    refreshRollbackSnapshot();
    const sourceId = imported.account.id;
    const targetId = currentAccount.value.id;

    const importedEvents = imported.events.filter((e) => e.accountId === sourceId);
    const importedSnapshots = imported.snapshots.filter((s) => s.accountId === sourceId);
    const importedReconciliations = imported.reconciliations.filter((r) => r.accountId === sourceId);
    const importedLedgerEntries = imported.ledgerEntries.filter((e) => e.accountId === sourceId);
    const importedOverrides = imported.eventOverrides.filter((o) => o.accountId === sourceId);

    const eventIdMap = new Map(importedEvents.map((event) => [event.id, createId()]));
    const reconciliationIdMap = new Map(importedReconciliations.map((recon) => [recon.id, createId()]));

    const mergedAccount: AccountConfig = { ...imported.account, id: targetId };
    const idx = accounts.value.findIndex((a) => a.id === targetId);
    if (idx >= 0) {
      accounts.value.splice(idx, 1, mergedAccount);
    }
    account.value = mergedAccount;

    events.value = [
      ...events.value.filter((e) => e.accountId !== targetId),
      ...importedEvents.map((event) => ({
        ...event,
        id: eventIdMap.get(event.id) ?? createId(),
        accountId: targetId,
      })),
    ];
    snapshots.value = [
      ...snapshots.value.filter((s) => s.accountId !== targetId),
      ...importedSnapshots.map((snapshot) => ({
        ...snapshot,
        id: createId(),
        accountId: targetId,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    reconciliations.value = [
      ...reconciliations.value.filter((r) => r.accountId !== targetId),
      ...importedReconciliations.map((reconciliation) => ({
        ...reconciliation,
        id: reconciliationIdMap.get(reconciliation.id) ?? createId(),
        accountId: targetId,
      })),
    ];
    ledgerEntries.value = [
      ...ledgerEntries.value.filter((e) => e.accountId !== targetId),
      ...importedLedgerEntries.map((entry) => ({
        ...entry,
        id: createId(),
        accountId: targetId,
        reconciliationId: reconciliationIdMap.get(entry.reconciliationId) ?? entry.reconciliationId,
        ruleId: entry.ruleId ? (eventIdMap.get(entry.ruleId) ?? entry.ruleId) : undefined,
      })),
    ];
    eventOverrides.value = [
      ...eventOverrides.value.filter((o) => o.accountId !== targetId),
      ...importedOverrides.map((override) => ({
        ...override,
        id: createId(),
        accountId: targetId,
        ruleId: eventIdMap.get(override.ruleId) ?? override.ruleId,
      })),
    ];

    viewMode.value = 'single';
    multiAccountSelection.value = [];
    viewSnapshotId.value = null;
    sortEvents();
    persist({ flush: true });
  };

  const importAllState = (content: string, fileName?: string) => {
    const imported = storage.importState(content);
    createRollbackSnapshot('all', fileName);
    refreshRollbackSnapshot();
    applyState(imported, { preferredAccountId: imported.account.id });
    sortEvents();
    persist({ flush: true });
  };

  const importState = (content: string, mode: ImportExportMode = 'current', fileName?: string) => {
    if (mode === 'all') {
      importAllState(content, fileName);
      return;
    }
    importCurrentAccountState(content, fileName);
  };

  const undoLastImport = () => {
    const snapshot = storage.loadRollbackSnapshot();
    if (!snapshot) {
      return { success: false as const, message: '没有可撤销的导入/恢复记录' };
    }

    applyState(snapshot.state, { preferredAccountId: snapshot.state.account.id });
    sortEvents();
    persist({ flush: true });
    storage.clearRollbackSnapshot();
    refreshRollbackSnapshot();

    return { success: true as const, snapshot };
  };

  const exportState = (mode: ImportExportMode = 'current') =>
    storage.exportState(buildAppState(mode), mode);

  const clearCurrentAccount = () => {
    const targetId = currentAccount.value.id;
    events.value = events.value.filter((e) => e.accountId !== targetId);
    snapshots.value = snapshots.value.filter((s) => s.accountId !== targetId);
    reconciliations.value = reconciliations.value.filter((r) => r.accountId !== targetId);
    ledgerEntries.value = ledgerEntries.value.filter((e) => e.accountId !== targetId);
    eventOverrides.value = eventOverrides.value.filter((o) => o.accountId !== targetId);
    clearChatPersistenceByAccountIds([targetId]);

    const nowIso = new Date().toISOString();
    const updated: AccountConfig = {
      ...currentAccount.value,
      initialBalance: 0,
      updatedAt: nowIso,
    };
    account.value = updated;
    const idx = accounts.value.findIndex((a) => a.id === updated.id);
    if (idx >= 0) accounts.value.splice(idx, 1, updated);

    // 不创建初始对账记录，等待用户重新首次对账

    viewMode.value = 'single';
    viewSnapshotId.value = null;
    multiAccountSelection.value = [];

    persist();
  };

  const deleteAccount = (accountId: string) => {
    if (accounts.value.length <= 1) {
      return { success: false as const, message: '至少保留一个账户' };
    }
    events.value = events.value.filter((e) => e.accountId !== accountId);
    snapshots.value = snapshots.value.filter((s) => s.accountId !== accountId);
    reconciliations.value = reconciliations.value.filter((r) => r.accountId !== accountId);
    ledgerEntries.value = ledgerEntries.value.filter((e) => e.accountId !== accountId);
    eventOverrides.value = eventOverrides.value.filter((o) => o.accountId !== accountId);

    accounts.value = accounts.value.filter((a) => a.id !== accountId);
    if (currentAccountId.value === accountId) {
      currentAccountId.value = accounts.value[0].id;
      account.value = { ...accounts.value[0] };
    }

    viewMode.value = 'single';
    viewSnapshotId.value = null;
    multiAccountSelection.value = [];
    persist();
    return { success: true as const };
  };

  const ensurePreferencesFilled = () => {
    if (!preferences.value) {
      preferences.value = DEFAULT_PREFERENCES();
    }
  };

  ensurePreferencesFilled();

  const isReadOnly = computed(() => isHistoricalView.value || isMultiAccountView.value);

  return {
    account,
    accounts,
    currentAccount,
    currentAccountId,
    events,
    preferences,
    viewMonths,
    timeline,
    analytics,
    warningThreshold,
    snapshots,
    latestSnapshot,
    activeSnapshot,
    isHistoricalView,
    viewMode,
    multiAccountSelection,
    isMultiAccountView,
    selectedAccountIds,
    visibleEvents,
    isReadOnly,
    // 对账系统
    reconciliations,
    ledgerEntries,
    eventOverrides,
    sortedReconciliations,
    latestReconciliation,
    needsReconciliation,
    accountLedgerEntries,
    accountOverrides,
    // Actions
    addAccount,
    addSnapshot,
    setViewSnapshot,
    setViewMonths,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEvent,
    updateAccount,
    updateUserPreferences,
    resetState,
    loadSampleData,
    importState,
    importCurrentAccountState,
    importAllState,
    exportState,
    rollbackSnapshot,
    undoLastImport,
    clearCurrentAccount,
    deleteAccount,
    // 对账 Actions
    reconcile,
    updateLedgerEntry,
    deleteLedgerEntry,
    addManualLedgerEntry,
    addEventOverride,
    removeEventOverride,
    // 模拟日期
    simulatedToday,
    todayStr,
    setSimulatedToday,
    // Export
    exportVisibleEvents,
  };
});
