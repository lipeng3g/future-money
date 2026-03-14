import type { AppState, PersistedStateEnvelope, RollbackSnapshot } from '@/types';
import type { ImportExportMode } from '@/types/storage';
import { APP_VERSION } from '@/utils/defaults';
import { isValidISODate as isValidISODateStrict } from '@/utils/validators';

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
  level: 'low' | 'medium' | 'high';
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

export interface ImportAccountEventDiffItem {
  accountName: string;
  addedEventNames: string[];
  removedEventNames: string[];
}

export interface ImportSingleAccountEventDiffSummary {
  addedEventNames: string[];
  removedEventNames: string[];
  keptEventNames: string[];
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

export interface ImportCoverageLossSummary {
  level: 'warning';
  title: string;
  detail: string;
  currentRangeLabel: string;
  incomingRangeLabel: string;
  missingStartDays: number | null;
  missingEndDays: number | null;
}

export interface ImportSanitizeDiscardItem {
  label: string;
  rawCount: number;
  sanitizedCount: number;
  discardedCount: number;
  reason: string;
}

export type ImportPreviewResult =
  | { ok: true; summary: ImportPreviewSummary }
  | { ok: false; error: string };

const ensureState = (parsed: unknown): AppState => {
  if (!parsed || typeof parsed !== 'object' || !('state' in (parsed as Record<string, unknown>))) {
    throw new Error('导入文件格式不正确：缺少 state 数据');
  }

  const state = (parsed as PersistedStateEnvelope).state;
  if (!state || typeof state !== 'object') {
    throw new Error('导入文件格式不正确：state 内容无效');
  }

  return state;
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
  const result = safeParseImportPreview(content);
  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.summary;
};

export const safeParseImportPreview = (content: string): ImportPreviewResult => {
  let parsed: PersistedStateEnvelope;
  try {
    parsed = JSON.parse(content) as PersistedStateEnvelope;
  } catch {
    return { ok: false, error: '导入文件不是合法的 JSON' };
  }

  try {
    const state = ensureState(parsed);
    const accounts = Array.isArray(state.accounts)
      ? state.accounts
      : state.account
        ? [state.account]
        : [];

    return {
      ok: true,
      summary: {
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
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '导入文件格式不正确',
    };
  }
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

  if (summary.scope === 'current') {
    return {
      level: 'low',
      title: '低风险：这是单账户备份',
      consequence: '这份备份只覆盖一个账户的数据，更适合用于单账户迁移、局部恢复或替换当前账户。',
      replacementScope: '替换范围通常只应落在单个账户；若你正在执行整库恢复，请先确认这正是你想要的来源文件。',
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

const buildAccountEventNameMap = (
  accounts: AppState['accounts'] | undefined,
  events: Pick<AppState, 'events'>['events'] | undefined,
) => {
  const accountNames = buildAccountNameMap(accounts);
  const map = new Map<string, Set<string>>();

  (events ?? []).forEach((event) => {
    const accountName = accountNames.get(event.accountId) ?? '';
    const eventName = event.name?.trim() ?? '';
    if (!accountName || !eventName) return;
    const existing = map.get(accountName) ?? new Set<string>();
    existing.add(eventName);
    map.set(accountName, existing);
  });

  return map;
};

export const buildImportAccountEventDiffSummary = (
  incomingState: Pick<AppState, 'accounts' | 'events'>,
  currentState?: Pick<AppState, 'accounts' | 'events'>,
): ImportAccountEventDiffItem[] => {
  const currentMap = buildAccountEventNameMap(currentState?.accounts, currentState?.events);
  const incomingMap = buildAccountEventNameMap(incomingState.accounts, incomingState.events);
  const allAccountNames = Array.from(new Set([
    ...currentMap.keys(),
    ...incomingMap.keys(),
  ])).filter(Boolean);

  return allAccountNames
    .map((accountName) => {
      const currentNames = currentMap.get(accountName) ?? new Set<string>();
      const incomingNames = incomingMap.get(accountName) ?? new Set<string>();
      const addedEventNames = Array.from(incomingNames)
        .filter((name) => !currentNames.has(name))
        .sort((a, b) => a.localeCompare(b, 'zh-CN'));
      const removedEventNames = Array.from(currentNames)
        .filter((name) => !incomingNames.has(name))
        .sort((a, b) => a.localeCompare(b, 'zh-CN'));

      return {
        accountName,
        addedEventNames,
        removedEventNames,
      };
    })
    .filter((item) => item.addedEventNames.length || item.removedEventNames.length)
    .sort((a, b) => a.accountName.localeCompare(b.accountName, 'zh-CN'));
};

export const buildImportSingleAccountEventDiffSummary = (
  incomingEvents: Array<{ name?: string | null }> | undefined,
  currentEvents: Array<{ name?: string | null }> | undefined,
): ImportSingleAccountEventDiffSummary => {
  const normalizeNames = (items: Array<{ name?: string | null }> | undefined) => Array.from(new Set((items ?? [])
    .map((item) => item.name?.trim() ?? '')
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));

  const incomingNames = normalizeNames(incomingEvents);
  const currentNames = normalizeNames(currentEvents);
  const currentSet = new Set(currentNames);
  const incomingSet = new Set(incomingNames);

  return {
    addedEventNames: incomingNames.filter((name) => !currentSet.has(name)),
    removedEventNames: currentNames.filter((name) => !incomingSet.has(name)),
    keptEventNames: incomingNames.filter((name) => currentSet.has(name)),
  };
};

export const buildImportSanitizeDiscardSummary = (
  rawState: Partial<Pick<AppState, 'accounts' | 'events' | 'reconciliations' | 'ledgerEntries' | 'eventOverrides'>> | undefined,
  sanitizedState: Pick<AppState, 'accounts' | 'events' | 'reconciliations' | 'ledgerEntries' | 'eventOverrides'>,
): ImportSanitizeDiscardItem[] => {
  const rawAccounts = Array.isArray(rawState?.accounts) ? rawState.accounts.length : 0;
  const rawEvents = Array.isArray(rawState?.events) ? rawState.events.length : 0;
  const rawReconciliations = Array.isArray(rawState?.reconciliations) ? rawState.reconciliations.length : 0;
  const rawLedgerEntries = Array.isArray(rawState?.ledgerEntries) ? rawState.ledgerEntries.length : 0;
  const rawOverrides = Array.isArray(rawState?.eventOverrides) ? rawState.eventOverrides.length : 0;

  const genericReason = {
    account: '空白账户名、缺少 id 的账户，或重复账户会被过滤。',
    event: '非法日期、金额/分类异常，或找不到所属账户的事件会被过滤。',
    reconciliation: '非法日期/余额，或找不到所属账户的对账记录会被过滤。',
    ledger: '断裂的 ruleId / reconciliationId、非法分类/来源/日期，或缺少所属账户的记录会被过滤。',
    override: '非法 period / action、缺少 ruleId，或找不到所属账户/事件的覆盖记录会被过滤。',
  };

  const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);
  const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

  const bump = (map: Record<string, number>, key: string) => {
    map[key] = (map[key] ?? 0) + 1;
  };

  const joinBreakdown = (map: Record<string, number>, total: number) => {
    const entries = Object.entries(map).filter(([, count]) => count > 0);
    const sum = entries.reduce((acc, [, count]) => acc + count, 0);
    if (total > sum) {
      entries.push(['其他', total - sum]);
    }

    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => `${key} ${count}`)
      .join('；');
  };

  const buildReason = (breakdown: Record<string, number>, total: number, fallback: string) => {
    const detail = joinBreakdown(breakdown, total);
    if (!detail) return fallback;
    return `主要原因：${detail}。规则：${fallback}`;
  };

  // --- 账户 ---
  const accountBreakdown: Record<string, number> = {};
  const accountIds = new Set<string>();
  toArray<Record<string, unknown>>(rawState?.accounts).forEach((raw) => {
    const id = typeof raw?.id === 'string' ? raw.id : '';
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';

    if (!id) {
      bump(accountBreakdown, '缺少 id');
      return;
    }

    if (!name) {
      bump(accountBreakdown, '账户名为空');
      return;
    }

    if (accountIds.has(id)) {
      bump(accountBreakdown, '重复 id');
      return;
    }

    accountIds.add(id);
  });

  // --- 事件 ---
  const eventBreakdown: Record<string, number> = {};
  const eventIds = new Set<string>();
  const validEventIds = new Set<string>();
  const isValidCategory = (value: unknown) => value === 'income' || value === 'expense';
  const isValidRecurrence = (value: unknown) => (
    value === 'once'
    || value === 'monthly'
    || value === 'quarterly'
    || value === 'semi-annual'
    || value === 'yearly'
  );

  const validateEvent = (raw: Record<string, unknown>) => {
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) return '事件名称为空';
    if (!isFiniteNumber(raw.amount) || raw.amount <= 0) return '金额无效';
    if (!isValidCategory(raw.category)) return '分类无效';
    if (!isValidRecurrence(raw.type)) return '重复类型无效';
    if (!isValidISODateStrict(typeof raw.startDate === 'string' ? raw.startDate : null)) return '日期无效';
    if (raw.endDate != null && raw.endDate !== '' && !isValidISODateStrict(typeof raw.endDate === 'string' ? raw.endDate : null)) return '日期无效';
    if (isNonEmptyString(raw.endDate) && isNonEmptyString(raw.startDate) && String(raw.endDate) < String(raw.startDate)) return '日期无效';

    if (raw.type === 'once') {
      if (!isValidISODateStrict(typeof raw.onceDate === 'string' ? raw.onceDate : null)) return '日期无效';
      if (isNonEmptyString(raw.onceDate) && isNonEmptyString(raw.startDate) && String(raw.onceDate) < String(raw.startDate)) return '日期无效';
      if (isNonEmptyString(raw.onceDate) && isNonEmptyString(raw.endDate) && String(raw.onceDate) > String(raw.endDate)) return '日期无效';
    }

    const isIntegerInRange = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

    if (raw.type === 'monthly' || raw.type === 'quarterly' || raw.type === 'semi-annual') {
      if (!isIntegerInRange(raw.monthlyDay, 1, 31)) return '日期无效';
    }

    if (raw.type === 'yearly') {
      if (!isIntegerInRange(raw.yearlyMonth, 1, 12) || !isIntegerInRange(raw.yearlyDay, 1, 31)) return '日期无效';
    }

    return null;
  };

  toArray<Record<string, unknown>>(rawState?.events).forEach((raw) => {
    const id = typeof raw?.id === 'string' ? raw.id : '';
    const accountId = typeof raw?.accountId === 'string' ? raw.accountId : '';

    if (!id) {
      bump(eventBreakdown, '缺少 id');
      return;
    }

    if (!accountId) {
      bump(eventBreakdown, '缺少 accountId');
      return;
    }

    if (eventIds.has(id)) {
      bump(eventBreakdown, '重复 id');
      return;
    }

    eventIds.add(id);

    if (!accountIds.has(accountId)) {
      bump(eventBreakdown, '所属账户不存在');
      return;
    }

    const issue = validateEvent(raw);
    if (issue) {
      bump(eventBreakdown, issue);
      return;
    }

    validEventIds.add(id);
  });

  // --- 对账 ---
  const reconciliationBreakdown: Record<string, number> = {};
  const reconciliationIds = new Set<string>();
  const validReconciliationIds = new Set<string>();

  toArray<Record<string, unknown>>(rawState?.reconciliations).forEach((raw) => {
    const id = typeof raw?.id === 'string' ? raw.id : '';
    const accountId = typeof raw?.accountId === 'string' ? raw.accountId : '';

    if (!id) {
      bump(reconciliationBreakdown, '缺少 id');
      return;
    }

    if (!accountId) {
      bump(reconciliationBreakdown, '缺少 accountId');
      return;
    }

    if (reconciliationIds.has(id)) {
      bump(reconciliationBreakdown, '重复 id');
      return;
    }

    reconciliationIds.add(id);

    if (!accountIds.has(accountId)) {
      bump(reconciliationBreakdown, '所属账户不存在');
      return;
    }

    if (!isValidISODateStrict(typeof raw.date === 'string' ? raw.date : null)) {
      bump(reconciliationBreakdown, '日期无效');
      return;
    }

    if (!isFiniteNumber(raw.balance)) {
      bump(reconciliationBreakdown, '余额无效');
      return;
    }

    validReconciliationIds.add(id);
  });

  // --- 账本记录 ---
  const ledgerBreakdown: Record<string, number> = {};
  const ledgerIds = new Set<string>();
  const validLedgerIds = new Set<string>();
  const isValidLedgerSource = (value: unknown) => value === 'rule' || value === 'manual' || value === 'adjustment';

  toArray<Record<string, unknown>>(rawState?.ledgerEntries).forEach((raw) => {
    const id = typeof raw?.id === 'string' ? raw.id : '';
    const accountId = typeof raw?.accountId === 'string' ? raw.accountId : '';
    const reconciliationId = typeof raw?.reconciliationId === 'string' ? raw.reconciliationId : '';
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    const ruleId = typeof raw?.ruleId === 'string' ? raw.ruleId.trim() : '';

    if (!id) {
      bump(ledgerBreakdown, '缺少 id');
      return;
    }

    if (!accountId) {
      bump(ledgerBreakdown, '缺少 accountId');
      return;
    }

    if (!reconciliationId) {
      bump(ledgerBreakdown, '缺少 reconciliationId');
      return;
    }

    if (ledgerIds.has(id)) {
      bump(ledgerBreakdown, '重复 id');
      return;
    }

    ledgerIds.add(id);

    if (!accountIds.has(accountId)) {
      bump(ledgerBreakdown, '所属账户不存在');
      return;
    }

    if (!validReconciliationIds.has(reconciliationId)) {
      bump(ledgerBreakdown, 'reconciliationId 断裂');
      return;
    }

    if (!name) {
      bump(ledgerBreakdown, '名称为空');
      return;
    }

    if (!isFiniteNumber(raw.amount)) {
      bump(ledgerBreakdown, '金额无效');
      return;
    }

    if (!isValidCategory(raw.category)) {
      bump(ledgerBreakdown, '分类无效');
      return;
    }

    if (!isValidISODateStrict(typeof raw.date === 'string' ? raw.date : null)) {
      bump(ledgerBreakdown, '日期无效');
      return;
    }

    if (!isValidLedgerSource(raw.source)) {
      bump(ledgerBreakdown, '来源无效');
      return;
    }

    if (ruleId && !validEventIds.has(ruleId)) {
      bump(ledgerBreakdown, 'ruleId 断裂');
      return;
    }

    validLedgerIds.add(id);
  });

  // --- 覆盖记录 ---
  const overrideBreakdown: Record<string, number> = {};
  const overrideIds = new Set<string>();
  const validOverrideIds = new Set<string>();

  const isValidOverridePeriod = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    const period = value.trim();
    return /^\d{4}-\d{2}$/.test(period) || /^\d{4}$/.test(period) || isValidISODateStrict(period);
  };

  const isValidOverrideAction = (value: unknown) => value === 'confirmed' || value === 'skipped' || value === 'modified';

  toArray<Record<string, unknown>>(rawState?.eventOverrides).forEach((raw) => {
    const id = typeof raw?.id === 'string' ? raw.id : '';
    const accountId = typeof raw?.accountId === 'string' ? raw.accountId : '';
    const ruleId = typeof raw?.ruleId === 'string' ? raw.ruleId : '';

    if (!id) {
      bump(overrideBreakdown, '缺少 id');
      return;
    }

    if (!accountId) {
      bump(overrideBreakdown, '缺少 accountId');
      return;
    }

    if (!ruleId) {
      bump(overrideBreakdown, '缺少 ruleId');
      return;
    }

    if (overrideIds.has(id)) {
      bump(overrideBreakdown, '重复 id');
      return;
    }

    overrideIds.add(id);

    if (!accountIds.has(accountId)) {
      bump(overrideBreakdown, '所属账户不存在');
      return;
    }

    if (!validEventIds.has(ruleId)) {
      bump(overrideBreakdown, 'ruleId 断裂');
      return;
    }

    if (!isValidOverridePeriod(raw.period)) {
      bump(overrideBreakdown, 'period 无效');
      return;
    }

    if (!isValidOverrideAction(raw.action)) {
      bump(overrideBreakdown, 'action 无效');
      return;
    }

    if (raw.action === 'modified' && !isFiniteNumber(raw.amount)) {
      bump(overrideBreakdown, 'amount 无效');
      return;
    }

    if (raw.actualDate && !isValidISODateStrict(typeof raw.actualDate === 'string' ? raw.actualDate : null)) {
      bump(overrideBreakdown, 'actualDate 无效');
      return;
    }

    validOverrideIds.add(id);
  });

  const items: ImportSanitizeDiscardItem[] = [
    {
      label: '账户',
      rawCount: rawAccounts,
      sanitizedCount: sanitizedState.accounts.length,
      discardedCount: Math.max(0, rawAccounts - sanitizedState.accounts.length),
      reason: buildReason(accountBreakdown, Math.max(0, rawAccounts - sanitizedState.accounts.length), genericReason.account),
    },
    {
      label: '事件',
      rawCount: rawEvents,
      sanitizedCount: sanitizedState.events.length,
      discardedCount: Math.max(0, rawEvents - sanitizedState.events.length),
      reason: buildReason(eventBreakdown, Math.max(0, rawEvents - sanitizedState.events.length), genericReason.event),
    },
    {
      label: '对账',
      rawCount: rawReconciliations,
      sanitizedCount: sanitizedState.reconciliations.length,
      discardedCount: Math.max(0, rawReconciliations - sanitizedState.reconciliations.length),
      reason: buildReason(reconciliationBreakdown, Math.max(0, rawReconciliations - sanitizedState.reconciliations.length), genericReason.reconciliation),
    },
    {
      label: '账本记录',
      rawCount: rawLedgerEntries,
      sanitizedCount: sanitizedState.ledgerEntries.length,
      discardedCount: Math.max(0, rawLedgerEntries - sanitizedState.ledgerEntries.length),
      reason: buildReason(ledgerBreakdown, Math.max(0, rawLedgerEntries - sanitizedState.ledgerEntries.length), genericReason.ledger),
    },
    {
      label: '覆盖记录',
      rawCount: rawOverrides,
      sanitizedCount: sanitizedState.eventOverrides.length,
      discardedCount: Math.max(0, rawOverrides - sanitizedState.eventOverrides.length),
      reason: buildReason(overrideBreakdown, Math.max(0, rawOverrides - sanitizedState.eventOverrides.length), genericReason.override),
    },
  ];

  return items.filter((item) => item.discardedCount > 0);
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

const formatYearMonth = (value: string) => value.slice(0, 7);

const formatYearMonthList = (months: string[]) => {
  if (!months.length) return '';
  const maxItems = 6;
  if (months.length <= maxItems) return months.join('、');
  return `${months.slice(0, maxItems).join('、')} 等 ${months.length} 个月`;
};

const addDaysToIsoDate = (value: string, deltaDays: number) => {
  const ms = parseDateToMs(value);
  if (ms == null) return null;
  const next = ms + deltaDays * 86400000;
  return new Date(next).toISOString().slice(0, 10);
};

const collectMonthBuckets = (startDate: string, endDate: string) => {
  const startMs = parseDateToMs(startDate);
  const endMs = parseDateToMs(endDate);
  if (startMs == null || endMs == null || startMs > endMs) return [];

  const start = new Date(startMs);
  const end = new Date(endMs);
  const startMonthIndex = start.getUTCFullYear() * 12 + start.getUTCMonth();
  const endMonthIndex = end.getUTCFullYear() * 12 + end.getUTCMonth();

  const months: string[] = [];
  for (let idx = startMonthIndex; idx <= endMonthIndex; idx += 1) {
    const year = Math.floor(idx / 12);
    const month = (idx % 12) + 1;
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }

  return months;
};

export const buildImportCoverageLossSummary = (
  incomingState: Pick<AppState, 'events' | 'reconciliations' | 'ledgerEntries'>,
  currentState?: Pick<AppState, 'events' | 'reconciliations' | 'ledgerEntries'>,
): ImportCoverageLossSummary | null => {
  const currentRange = collectDateRange(currentState);
  const incomingRange = collectDateRange(incomingState);

  if (!currentRange || !incomingRange) {
    return null;
  }

  const currentStartMs = parseDateToMs(currentRange.start);
  const incomingStartMs = parseDateToMs(incomingRange.start);
  const currentEndMs = parseDateToMs(currentRange.end);
  const incomingEndMs = parseDateToMs(incomingRange.end);

  if (currentStartMs == null || incomingStartMs == null || currentEndMs == null || incomingEndMs == null) {
    return null;
  }

  const missingStartDays = Math.max(0, Math.round((incomingStartMs - currentStartMs) / 86400000));
  const missingEndDays = Math.max(0, Math.round((currentEndMs - incomingEndMs) / 86400000));

  if (missingStartDays <= 0 && missingEndDays <= 0) {
    return null;
  }

  const missingStartEndDate = missingStartDays > 0 ? addDaysToIsoDate(incomingRange.start, -1) : null;
  const missingEndStartDate = missingEndDays > 0 ? addDaysToIsoDate(incomingRange.end, 1) : null;

  const missingStartMonths = missingStartDays > 0 && missingStartEndDate
    ? collectMonthBuckets(currentRange.start, missingStartEndDate)
    : [];
  const missingEndMonths = missingEndDays > 0 && missingEndStartDate
    ? collectMonthBuckets(missingEndStartDate, currentRange.end)
    : [];

  const parts = [
    missingStartDays > 0
      ? `备份文件的最早日期晚于本地约 ${missingStartDays} 天` + (missingStartMonths.length
        ? `（主要涉及：${formatYearMonthList(missingStartMonths)}）`
        : '')
      : null,
    missingEndDays > 0
      ? `备份文件的最新日期早于本地约 ${missingEndDays} 天` + (missingEndMonths.length
        ? `（主要涉及：${formatYearMonthList(missingEndMonths)}）`
        : '')
      : null,
  ].filter((part): part is string => !!part);

  return {
    level: 'warning',
    title: '注意：备份的日期覆盖范围可能更窄',
    detail: `${parts.join('；')}，恢复后可能丢失本地在这些区间内的记录。`,
    currentRangeLabel: currentRange.start === currentRange.end ? currentRange.start : `${currentRange.start} → ${currentRange.end}`,
    incomingRangeLabel: incomingRange.start === incomingRange.end ? incomingRange.start : `${incomingRange.start} → ${incomingRange.end}`,
    missingStartDays,
    missingEndDays,
  };
};
