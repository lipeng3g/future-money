import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { TimelineGenerator } from '@/utils/timeline';
import { AnalyticsEngine } from '@/utils/analytics';
import { StorageManager, createDefaultState } from '@/utils/storage';
import { validateCashFlowEvent } from '@/utils/validators';
import { APP_VERSION, DEFAULT_PREFERENCES } from '@/utils/defaults';
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
} from '@/types';
import { createId } from '@/utils/id';
import { generateSampleEvents } from '@/utils/sample-data';

const storage = new StorageManager();
const generator = new TimelineGenerator();
const analyticsEngine = new AnalyticsEngine();

const seedState = storage.loadState();

export const useFinanceStore = defineStore('finance', () => {
  const account = ref<AccountConfig>({ ...seedState.account });
  const events = ref<CashFlowEvent[]>([...seedState.events]);
  const preferences = ref<UserPreferences>({ ...seedState.preferences });
  const viewMonths = ref(preferences.value.defaultViewMonths || 12);
  const startDate = ref(new Date().toISOString().split('T')[0]);

  const timeline = computed(() =>
    generator.generate({
      initialBalance: account.value.initialBalance,
      events: events.value,
      startDate: startDate.value,
      months: viewMonths.value,
    }),
  );

  const analytics = computed<AnalyticsSummary>(() => analyticsEngine.generate(timeline.value, account.value.warningThreshold));

  const persist = () => {
    const payload: AppState = {
      version: APP_VERSION,
      account: account.value,
      events: events.value,
      preferences: preferences.value,
    };
    storage.saveState(payload);
  };

  const sortEvents = () => {
    events.value = [...events.value].sort((a, b) => a.startDate.localeCompare(b.startDate));
  };

  const addEvent = (payload: NewCashFlowEvent) => {
    const validation = validateCashFlowEvent(payload);
    if (validation.length) {
      return { success: false as const, errors: validation };
    }
    const timestamp = new Date().toISOString();
    const record: CashFlowEvent = {
      ...payload,
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

  const updateAccount = (update: AccountUpdate) => {
    account.value = {
      ...account.value,
      ...update,
      updatedAt: new Date().toISOString(),
    };
    persist();
  };

  const setStartDate = (iso: string) => {
    startDate.value = iso;
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
    account.value = defaults.account;
    events.value = defaults.events;
    preferences.value = defaults.preferences;
    viewMonths.value = defaults.preferences.defaultViewMonths;
    startDate.value = new Date().toISOString().split('T')[0];
    persist();
  };

  const loadSampleData = () => {
    // 重置为示例配置：初始余额16000元，预警阈值1000元
    account.value = {
      initialBalance: 16000,
      currency: '¥',
      warningThreshold: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    events.value = generateSampleEvents();
    startDate.value = new Date().toISOString().split('T')[0]; // 重置起始日期为今天
    sortEvents();
    persist();
  };

  const importState = (content: string) => {
    const imported = storage.importState(content);
    account.value = imported.account;
    events.value = imported.events;
    preferences.value = imported.preferences;
    viewMonths.value = imported.preferences.defaultViewMonths;
    sortEvents();
    persist();
  };

  const exportState = () => storage.exportState({
    version: APP_VERSION,
    account: account.value,
    events: events.value,
    preferences: preferences.value,
  });

  const ensurePreferencesFilled = () => {
    if (!preferences.value) {
      preferences.value = DEFAULT_PREFERENCES();
    }
  };

  ensurePreferencesFilled();

  return {
    account,
    events,
    preferences,
    startDate,
    viewMonths,
    timeline,
    analytics,
    setStartDate,
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
  };
});
