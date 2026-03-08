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
