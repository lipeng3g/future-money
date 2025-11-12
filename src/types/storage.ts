import type { AccountConfig, UserPreferences } from '@/types/account';
import type { CashFlowEvent } from '@/types/event';

export interface AppState {
  version: string;
  account: AccountConfig;
  events: CashFlowEvent[];
  preferences: UserPreferences;
}

export interface PersistedStateEnvelope {
  version: string;
  timestamp: string;
  state: AppState;
}
