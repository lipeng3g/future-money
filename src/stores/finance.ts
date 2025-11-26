import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { TimelineGenerator } from '@/utils/timeline';
import { AnalyticsEngine } from '@/utils/analytics';
import { StorageManager, createDefaultState } from '@/utils/storage';
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
  EventOccurrence,
} from '@/types';
import { createId } from '@/utils/id';
import { generateSampleEvents } from '@/utils/sample-data';

const storage = new StorageManager();
const generator = new TimelineGenerator();
const analyticsEngine = new AnalyticsEngine();

const seedState = storage.loadState();

export const useFinanceStore = defineStore('finance', () => {
  const account = ref<AccountConfig>({ ...seedState.account });
  const accounts = ref<AccountConfig[]>([...(seedState.accounts ?? [seedState.account])]);
  const currentAccountId = ref<string>(account.value.id || accounts.value[0]?.id || '');
  const events = ref<CashFlowEvent[]>([...seedState.events]);
  const preferences = ref<UserPreferences>({ ...seedState.preferences });
  const viewMonths = ref(preferences.value.defaultViewMonths || 12);
  const snapshots = ref<BalanceSnapshot[]>([...(seedState.snapshots ?? [])]);

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
    // 多账户视图但尚未选择时，默认全选
    return accounts.value.map((a) => a.id);
  });

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

  // 当前视图使用的快照 id（null 表示使用最新快照）
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

  // 单账户视图下的时间线（基于当前账户 + 当前/历史快照）
  const singleTimeline = computed<DailySnapshot[]>(() => {
    const snaps = sortedSnapshots.value;
    if (!snaps.length || !latestSnapshot.value) return [];
    const active = activeSnapshot.value ?? latestSnapshot.value;
    const snapsForView =
      viewSnapshotId.value == null
        ? snaps
        : snaps.filter((snap) => snap.date <= active.date);

    const accountEvents = events.value.filter((e) => e.accountId === currentAccount.value.id);

    return generator.generate({
      events: accountEvents,
      snapshots: snapsForView,
      months: viewMonths.value,
      mode: 'latest',
    });
  });

  // 多账户视图下：先为每个账户生成独立时间线，再汇总
  const timelinesByAccount = computed<Record<string, DailySnapshot[]>>(() => {
    const map: Record<string, DailySnapshot[]> = {};
    const todayIso = new Date().toISOString().split('T')[0];

    selectedAccountIds.value.forEach((accId) => {
      const evts = events.value.filter((e) => e.accountId === accId);
      const snaps = snapshotsByAccount.value[accId] ?? [];
      if (!snaps.length) return;
      map[accId] = generator.generate({
        events: evts,
        snapshots: snaps,
        months: viewMonths.value,
        mode: 'latest',
        today: todayIso,
      });
    });

    return map;
  });

  const aggregatedTimeline = computed<DailySnapshot[]>(() => {
    const map = timelinesByAccount.value;
    const allDates = new Set<string>();
    Object.values(map).forEach((tl) => tl.forEach((d) => allDates.add(d.date)));
    const dates = Array.from(allDates).sort();

    return dates.map((date) => {
      let balance = 0;
      let change = 0;
      const eventsAgg: EventOccurrence[] = [];
      let isWeekend = false;
      let isToday = false;

      selectedAccountIds.value.forEach((accId) => {
        const tl = map[accId];
        if (!tl) return;
        const day = tl.find((d) => d.date === date);
        if (!day) return;
        balance += day.balance;
        change += day.change;
        eventsAgg.push(
          ...day.events.map(
            (e) =>
              ({
                ...e,
                // 在聚合视图中带上账户信息，方便前端打 tag
                accountId: (e as any).accountId ?? accId,
              } as any),
          ),
        );
        isWeekend ||= day.isWeekend;
        isToday ||= day.isToday;
      });

      return {
        date,
        balance,
        change,
        events: eventsAgg,
        isWeekend,
        isToday,
      };
    });
  });

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

  const persist = () => {
    const payload: AppState = {
      version: APP_VERSION,
      account: account.value,
      accounts: accounts.value,
      events: events.value,
      preferences: preferences.value,
      snapshots: snapshots.value,
    };
    storage.saveState(payload);
  };

  const sortEvents = () => {
    events.value = [...events.value].sort((a, b) => a.startDate.localeCompare(b.startDate));
  };

  const addEvent = (payload: NewCashFlowEvent) => {
    // 确保事件绑定到当前账户
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
    events.value = events.value.filter((event) => event.id !== id);
    persist();
  };

  const toggleEvent = (id: string, enabled: boolean) => updateEvent(id, { enabled });
  const visibleEvents = computed(() => {
    const base = isMultiAccountView.value
      ? events.value.filter((e) => selectedAccountIds.value.includes(e.accountId))
      : events.value.filter((e) => e.accountId === currentAccount.value.id);
    return [...base].sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  const addSnapshot = (balance: number, date: string, note?: string) => {
    const nowIso = new Date().toISOString();
    const existingIndex = snapshots.value.findIndex(
      (snap) => snap.date === date && snap.accountId === account.value.id,
    );
    let snapshot: BalanceSnapshot;

    if (existingIndex >= 0) {
      // 同一天只保留一条快照：用最新的覆盖该日期的快照
      const base = snapshots.value[existingIndex];
      snapshot = {
        ...base,
        balance,
        note,
        createdAt: nowIso,
        source: base.source ?? 'manual',
      };
      snapshots.value.splice(existingIndex, 1, snapshot);
    } else {
      snapshot = {
        id: createId(),
        accountId: account.value.id,
        date,
        balance,
        note,
        source: snapshots.value.length === 0 ? 'initial' : 'manual',
        createdAt: nowIso,
      };
      snapshots.value = [...snapshots.value, snapshot];
    }

    snapshots.value = snapshots.value.sort((a, b) => a.date.localeCompare(b.date));
    account.value = {
      ...account.value,
      initialBalance: balance,
      updatedAt: snapshot.createdAt,
    };
    syncCurrentAccountToList();
    persist();
    return snapshot;
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

    const today = new Date().toISOString().split('T')[0];
    snapshots.value.push({
      id: createId(),
      accountId: accountConfig.id,
      date: today,
      balance: accountConfig.initialBalance,
      source: 'initial',
      createdAt: nowIso,
    });
    snapshots.value.sort((a, b) => a.date.localeCompare(b.date));

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
    // 点击最新快照等价于退出历史模式
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
    viewMonths.value = months;
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
    accounts.value = [...defaults.accounts];
    currentAccountId.value = defaults.account.id;
    account.value = defaults.account;
    events.value = defaults.events;
    preferences.value = defaults.preferences;
    viewMonths.value = defaults.preferences.defaultViewMonths;
    snapshots.value = defaults.snapshots;
    viewMode.value = 'single';
    multiAccountSelection.value = [];
    viewSnapshotId.value = null;
    persist();
  };

  const loadSampleData = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    // 仅重置当前账户为示例数据：初始余额16000元，预警阈值1000元，并生成对应快照
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
    events.value = [
      ...events.value.filter((e) => e.accountId !== updated.id),
      ...generateSampleEvents(updated.id),
    ];
    sortEvents();
    persist();
  };

  const importState = (content: string) => {
    const imported = storage.importState(content);
    const importedAccount = imported.account;
    const importedEvents = imported.events.filter((e) => e.accountId === importedAccount.id);
    const importedSnapshots = imported.snapshots.filter((s) => s.accountId === importedAccount.id);

    const idx = accounts.value.findIndex((a) => a.id === importedAccount.id);
    if (idx >= 0) {
      accounts.value.splice(idx, 1, importedAccount);
    } else {
      accounts.value.push(importedAccount);
    }

    currentAccountId.value = importedAccount.id;
    account.value = importedAccount;

    events.value = [
      ...events.value.filter((e) => e.accountId !== importedAccount.id),
      ...importedEvents,
    ];
    snapshots.value = [
      ...snapshots.value.filter((s) => s.accountId !== importedAccount.id),
      ...importedSnapshots,
    ].sort((a, b) => a.date.localeCompare(b.date));

    viewMode.value = 'single';
    multiAccountSelection.value = [];
    viewSnapshotId.value = null;
    sortEvents();
    persist();
  };

  const exportState = () =>
    storage.exportState({
      version: APP_VERSION,
      account: currentAccount.value,
      accounts: [currentAccount.value],
      events: events.value.filter((e) => e.accountId === currentAccount.value.id),
      preferences: preferences.value,
      snapshots: snapshots.value.filter((s) => s.accountId === currentAccount.value.id),
    });

  const clearCurrentAccount = () => {
    const targetId = currentAccount.value.id;
    events.value = events.value.filter((e) => e.accountId !== targetId);
    snapshots.value = snapshots.value.filter((s) => s.accountId !== targetId);

    const nowIso = new Date().toISOString();
    const updated: AccountConfig = {
      ...currentAccount.value,
      initialBalance: 0,
      updatedAt: nowIso,
    };
    account.value = updated;
    const idx = accounts.value.findIndex((a) => a.id === updated.id);
    if (idx >= 0) accounts.value.splice(idx, 1, updated);

    const today = nowIso.split('T')[0];
    snapshots.value.push({
      id: createId(),
      accountId: updated.id,
      date: today,
      balance: 0,
      source: 'manual',
      createdAt: nowIso,
    });
    snapshots.value.sort((a, b) => a.date.localeCompare(b.date));

    viewMode.value = 'single';
    viewSnapshotId.value = null;
    multiAccountSelection.value = [];

    persist();
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
    exportState,
    clearCurrentAccount,
  };
});
