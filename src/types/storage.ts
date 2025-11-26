import type { AccountConfig, BalanceSnapshot, UserPreferences } from '@/types/account';
import type { CashFlowEvent } from '@/types/event';

export interface AppState {
  version: string;
  /** 兼容字段：主账户 / 当前账户镜像 */
  account: AccountConfig;
  /** 多账户列表（至少包含一个主账户） */
  accounts: AccountConfig[];
  events: CashFlowEvent[];
  preferences: UserPreferences;
  snapshots: BalanceSnapshot[];
}

export interface PersistedStateEnvelope {
  version: string;
  timestamp: string;
  state: AppState;
}
