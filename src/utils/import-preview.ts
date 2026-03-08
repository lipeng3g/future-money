import type { AppState, PersistedStateEnvelope, RollbackSnapshot } from '@/types';
import type { ImportExportMode } from '@/types/storage';
import { APP_VERSION } from '@/utils/defaults';

export interface ImportPreviewSummary {
  envelopeVersion: string;
  stateVersion: string;
  timestamp: string | null;
  scope: ImportExportMode | 'legacy-unknown';
  accountsCount: number;
  eventsCount: number;
  reconciliationsCount: number;
  ledgerEntriesCount: number;
  eventOverridesCount: number;
  accountNames: string[];
}

export interface RollbackPreviewSummary extends ImportPreviewSummary {
  mode: ImportExportMode;
  fileName: string | null;
}

export interface ImportRiskSummary {
  level: 'medium' | 'high';
  title: string;
  consequence: string;
  replacementScope: string;
}

export interface ImportAccountDiffSummary {
  addedNames: string[];
  removedNames: string[];
  keptNames: string[];
}

export interface ImportDataDeltaItem {
  label: string;
  currentCount: number;
  incomingCount: number;
  delta: number;
}

export interface ImportAccountDataDeltaItem {
  accountName: string;
  eventsDelta: number;
  reconciliationsDelta: number;
  ledgerEntriesDelta: number;
  eventOverridesDelta: number;
}

export interface ImportDateRangeSummary {
  currentRangeLabel: string;
  incomingRangeLabel: string;
  hasCurrentData: boolean;
  hasIncomingData: boolean;
}

export interface ImportFreshnessSummary {
  level: 'info' | 'warning';
  title: string;
  detail: string;
  currentLatestDate: string | null;
  incomingLatestDate: string | null;
  lagDays: number | null;
}

const ensureState = (parsed: unknown): AppState => {
  if (!parsed || typeof parsed !== 'object' || !(parsed as PersistedStateEnvelope).state) {
    throw new Error('导入文件格式不正确');
  }

  return (parsed as PersistedStateEnvelope).state;
};

const detectImportScope = (
  envelope: PersistedStateEnvelope,
  state: AppState,
): ImportPreviewSummary['scope'] => {
  if (envelope.scope === 'current' || envelope.scope === 'all') {
    return envelope.scope;
  }

  const accounts = Array.isArray(state.accounts)
    ? state.accounts
    : state.account
      ? [state.account]
      : [];

  if (accounts.length > 1) {
    return 'all';
  }

  return 'legacy-unknown';
};

export const parseImportPreview = (content: string): ImportPreviewSummary => {
  let parsed: PersistedStateEnvelope;
  try {
    parsed = JSON.parse(content) as PersistedStateEnvelope;
  } catch {
    throw new Error('导入文件不是合法的 JSON');
  }

  const state = ensureState(parsed);
  const accounts = Array.isArray(state.accounts)
    ? state.accounts
    : state.account
      ? [state.account]
      : [];

  return {
    envelopeVersion: parsed.version || APP_VERSION,
    stateVersion: state.version || parsed.version || APP_VERSION,
    timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : null,
    scope: detectImportScope(parsed, state),
    accountsCount: accounts.length,
    eventsCount: Array.isArray(state.events) ? state.events.length : 0,
    reconciliationsCount: Array.isArray(state.reconciliations) ? state.reconciliations.length : 0,
    ledgerEntriesCount: Array.isArray(state.ledgerEntries) ? state.ledgerEntries.length : 0,
    eventOverridesCount: Array.isArray(state.eventOverrides) ? state.eventOverrides.length : 0,
    accountNames: accounts
      .map((account) => account?.name?.trim())
      .filter((name): name is string => !!name),
  };
};

export const buildRollbackPreview = (snapshot: RollbackSnapshot): RollbackPreviewSummary => {
  const state = snapshot.state;
  const accounts = Array.isArray(state.accounts)
    ? state.accounts
    : state.account
      ? [state.account]
      : [];

  return {
    envelopeVersion: APP_VERSION,
    stateVersion: state.version || APP_VERSION,
    timestamp: snapshot.createdAt,
    scope: snapshot.mode,
    mode: snapshot.mode,
    fileName: snapshot.fileName ?? null,
    accountsCount: accounts.length,
    eventsCount: Array.isArray(state.events) ? state.events.length : 0,
    reconciliationsCount: Array.isArray(state.reconciliations) ? state.reconciliations.length : 0,
    ledgerEntriesCount: Array.isArray(state.ledgerEntries) ? state.ledgerEntries.length : 0,
    eventOverridesCount: Array.isArray(state.eventOverrides) ? state.eventOverrides.length : 0,
    accountNames: accounts
      .map((account) => account?.name?.trim())
      .filter((name): name is string => !!name),
  };
};

export const buildImportRiskSummary = (
  summary: ImportPreviewSummary,
  currentState?: Pick<
    AppState,
    'accounts' | 'events' | 'reconciliations' | 'ledgerEntries' | 'eventOverrides'
  >,
): ImportRiskSummary => {
  const currentAccounts = currentState?.accounts?.length ?? 0;
  const currentEvents = currentState?.events?.length ?? 0;
  const currentReconciliations = currentState?.reconciliations?.length ?? 0;
  const currentLedgerEntries = currentState?.ledgerEntries?.length ?? 0;
  const currentOverrides = currentState?.eventOverrides?.length ?? 0;

  if (summary.scope === 'all') {
    return {
      level: 'high',
      title: '高风险：将整体替换当前浏览器内的整套本地数据',
      consequence: `当前本地的 ${currentAccounts} 个账户、${currentEvents} 条事件、${currentReconciliations} 次对账、${currentLedgerEntries} 条账本记录和 ${currentOverrides} 条覆盖记录都会被备份内容替换。`,
      replacementScope: '替换范围：全部账户、事件、对账、账本、覆盖记录与偏好设置。',
    };
  }

  return {
    level: 'medium',
    title: '中风险：备份来源未标记为单账户或整库',
    consequence: '这是旧版或未标记作用域的备份文件。系统会按“恢复全部账户”处理，因此仍可能整体替换当前本地数据。',
    replacementScope: '建议先核对账户数量、账户名和备份时间，再决定是否继续恢复。',
  };
};

export const buildImportAccountDiffSummary = (
  summary: Pick<ImportPreviewSummary, 'accountNames'>,
  currentAccounts?: Pick<AppState, 'accounts'>['accounts'],
): ImportAccountDiffSummary => {
  const normalize = (name: string) => name.trim();
  const currentNames = Array.from(new Set((currentAccounts ?? [])
    .map((account) => account?.name?.trim())
    .filter((name): name is string => !!name)
    .map(normalize)));
  const incomingNames = Array.from(new Set(summary.accountNames.map(normalize).filter(Boolean)));

  const currentSet = new Set(currentNames);
  const incomingSet = new Set(incomingNames);

  return {
    addedNames: incomingNames.filter((name) => !currentSet.has(name)),
    removedNames: currentNames.filter((name) => !incomingSet.has(name)),
    keptNames: incomingNames.filter((name) => currentSet.has(name)),
  };
};

export const buildImportDataDeltaSummary = (
  summary: Pick<
    ImportPreviewSummary,
    'accountsCount' | 'eventsCount' | 'reconciliationsCount' | 'ledgerEntriesCount' | 'eventOverridesCount'
  >,
  currentState?: Pick<AppState, 'accounts' | 'events' | 'reconciliations' | 'ledgerEntries' | 'eventOverrides'>,
): ImportDataDeltaItem[] => {
  const items: Array<ImportDataDeltaItem> = [
    {
      label: '账户',
      currentCount: currentState?.accounts?.length ?? 0,
      incomingCount: summary.accountsCount,
      delta: summary.accountsCount - (currentState?.accounts?.length ?? 0),
    },
    {
      label: '事件',
      currentCount: currentState?.events?.length ?? 0,
      incomingCount: summary.eventsCount,
      delta: summary.eventsCount - (currentState?.events?.length ?? 0),
    },
    {
      label: '对账',
      currentCount: currentState?.reconciliations?.length ?? 0,
      incomingCount: summary.reconciliationsCount,
      delta: summary.reconciliationsCount - (currentState?.reconciliations?.length ?? 0),
    },
    {
      label: '账本记录',
      currentCount: currentState?.ledgerEntries?.length ?? 0,
      incomingCount: summary.ledgerEntriesCount,
      delta: summary.ledgerEntriesCount - (currentState?.ledgerEntries?.length ?? 0),
    },
    {
      label: '覆盖记录',
      currentCount: currentState?.eventOverrides?.length ?? 0,
      incomingCount: summary.eventOverridesCount,
      delta: summary.eventOverridesCount - (currentState?.eventOverrides?.length ?? 0),
    },
  ];

  return items;
};

const normalizeAccountName = (name?: string | null) => name?.trim() ?? '';

const buildAccountNameMap = (accounts?: AppState['accounts']) => new Map(
  (accounts ?? [])
    .map((account) => [account.id, normalizeAccountName(account.name)] as const)
    .filter((entry) => !!entry[1]),
);

const incrementCounter = (counter: Map<string, number>, key: string) => {
  if (!key) return;
  counter.set(key, (counter.get(key) ?? 0) + 1);
};

export const buildImportAccountDataDeltaSummary = (
  incomingState: Pick<AppState, 'accounts' | 'events' | 'reconciliations' | 'ledgerEntries' | 'eventOverrides'>,
  currentState?: Pick<AppState, 'accounts' | 'events' | 'reconciliations' | 'ledgerEntries' | 'eventOverrides'>,
): ImportAccountDataDeltaItem[] => {
  const currentAccountNames = buildAccountNameMap(currentState?.accounts);
  const incomingAccountNames = buildAccountNameMap(incomingState.accounts);
  const allAccountNames = Array.from(new Set([
    ...currentAccountNames.values(),
    ...incomingAccountNames.values(),
  ])).filter(Boolean);

  const buildEventCounter = (items: Array<{ accountId: string }> | undefined, nameMap: Map<string, string>) => {
    const counter = new Map<string, number>();
    (items ?? []).forEach((item) => {
      const accountName = nameMap.get(item.accountId) ?? '';
      incrementCounter(counter, accountName);
    });
    return counter;
  };

  const currentEvents = buildEventCounter(currentState?.events, currentAccountNames);
  const incomingEvents = buildEventCounter(incomingState.events, incomingAccountNames);
  const currentReconciliations = buildEventCounter(currentState?.reconciliations, currentAccountNames);
  const incomingReconciliations = buildEventCounter(incomingState.reconciliations, incomingAccountNames);
  const currentLedgerEntries = buildEventCounter(currentState?.ledgerEntries, currentAccountNames);
  const incomingLedgerEntries = buildEventCounter(incomingState.ledgerEntries, incomingAccountNames);
  const currentOverrides = buildEventCounter(currentState?.eventOverrides, currentAccountNames);
  const incomingOverrides = buildEventCounter(incomingState.eventOverrides, incomingAccountNames);

  return allAccountNames
    .map((accountName) => ({
      accountName,
      eventsDelta: (incomingEvents.get(accountName) ?? 0) - (currentEvents.get(accountName) ?? 0),
      reconciliationsDelta: (incomingReconciliations.get(accountName) ?? 0) - (currentReconciliations.get(accountName) ?? 0),
      ledgerEntriesDelta: (incomingLedgerEntries.get(accountName) ?? 0) - (currentLedgerEntries.get(accountName) ?? 0),
      eventOverridesDelta: (incomingOverrides.get(accountName) ?? 0) - (currentOverrides.get(accountName) ?? 0),
    }))
    .filter((item) => item.eventsDelta !== 0 || item.reconciliationsDelta !== 0 || item.ledgerEntriesDelta !== 0 || item.eventOverridesDelta !== 0)
    .sort((a, b) => a.accountName.localeCompare(b.accountName, 'zh-CN'));
};

const formatRangeBoundary = (value?: string | null) => value?.trim() || '';

const collectDateRange = (state?: Pick<AppState, 'events' | 'reconciliations' | 'ledgerEntries'>) => {
  const dates = [
    ...(state?.events ?? []).flatMap((event) => [event.startDate, event.endDate, event.onceDate]),
    ...(state?.reconciliations ?? []).map((item) => item.date),
    ...(state?.ledgerEntries ?? []).map((item) => item.date),
  ]
    .map((value) => formatRangeBoundary(value))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return dates.length
    ? { start: dates[0], end: dates[dates.length - 1] }
    : null;
};

const parseDateToMs = (value: string) => {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const buildImportDateRangeSummary = (
  incomingState: Pick<AppState, 'events' | 'reconciliations' | 'ledgerEntries'>,
  currentState?: Pick<AppState, 'events' | 'reconciliations' | 'ledgerEntries'>,
): ImportDateRangeSummary => {
  const currentRange = collectDateRange(currentState);
  const incomingRange = collectDateRange(incomingState);
  const formatLabel = (range: { start: string; end: string } | null) => {
    if (!range) return '无日期数据';
    if (range.start === range.end) return range.start;
    return `${range.start} → ${range.end}`;
  };

  return {
    currentRangeLabel: formatLabel(currentRange),
    incomingRangeLabel: formatLabel(incomingRange),
    hasCurrentData: !!currentRange,
    hasIncomingData: !!incomingRange,
  };
};

export const buildImportFreshnessSummary = (
  incomingState: Pick<AppState, 'events' | 'reconciliations' | 'ledgerEntries'>,
  currentState?: Pick<AppState, 'events' | 'reconciliations' | 'ledgerEntries'>,
): ImportFreshnessSummary | null => {
  const currentRange = collectDateRange(currentState);
  const incomingRange = collectDateRange(incomingState);

  if (!currentRange || !incomingRange) {
    return null;
  }

  const currentLatestMs = parseDateToMs(currentRange.end);
  const incomingLatestMs = parseDateToMs(incomingRange.end);

  if (currentLatestMs == null || incomingLatestMs == null) {
    return null;
  }

  const lagDays = Math.round((currentLatestMs - incomingLatestMs) / 86400000);

  if (lagDays <= 0) {
    return {
      level: 'info',
      title: '备份时间新旧正常',
      detail: incomingLatestMs === currentLatestMs
        ? '备份文件覆盖到了与你当前本地相同的最新日期。'
        : '备份文件覆盖到了不早于当前本地的最新日期，可继续结合账户差异确认是否恢复。',
      currentLatestDate: currentRange.end,
      incomingLatestDate: incomingRange.end,
      lagDays: lagDays < 0 ? 0 : lagDays,
    };
  }

  const detail = lagDays >= 30
    ? `备份文件的最新日期比当前本地早约 ${lagDays} 天，像是一份明显偏旧的备份，恢复后可能回退最近一段时间的数据。`
    : `备份文件的最新日期比当前本地早约 ${lagDays} 天，建议确认这是否就是你想恢复的时间点。`;

  return {
    level: 'warning',
    title: '注意：这份备份可能比当前本地更旧',
    detail,
    currentLatestDate: currentRange.end,
    incomingLatestDate: incomingRange.end,
    lagDays,
  };
};
