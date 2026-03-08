import type { AppState, PersistedStateEnvelope } from '@/types';
import { APP_VERSION } from '@/utils/defaults';

export interface ImportPreviewSummary {
  envelopeVersion: string;
  stateVersion: string;
  timestamp: string | null;
  accountsCount: number;
  eventsCount: number;
  reconciliationsCount: number;
  ledgerEntriesCount: number;
  eventOverridesCount: number;
  accountNames: string[];
}

const ensureState = (parsed: unknown): AppState => {
  if (!parsed || typeof parsed !== 'object' || !(parsed as PersistedStateEnvelope).state) {
    throw new Error('导入文件格式不正确');
  }

  return (parsed as PersistedStateEnvelope).state;
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
