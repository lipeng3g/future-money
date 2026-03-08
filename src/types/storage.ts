import type { AccountConfig, BalanceSnapshot, UserPreferences } from '@/types/account';
import type { CashFlowEvent } from '@/types/event';
import type { Reconciliation, LedgerEntry, EventOverride } from '@/types/reconciliation';

export interface AppState {
  version: string;
  /** 兼容字段：主账户 / 当前账户镜像 */
  account: AccountConfig;
  /** 多账户列表（至少包含一个主账户） */
  accounts: AccountConfig[];
  /** 事件规则 */
  events: CashFlowEvent[];
  preferences: UserPreferences;
  /** 保留用于数据迁移，新逻辑不再使用 */
  snapshots: BalanceSnapshot[];
  /** 对账记录 */
  reconciliations: Reconciliation[];
  /** 账本条目 */
  ledgerEntries: LedgerEntry[];
  /** 事件覆盖 */
  eventOverrides: EventOverride[];
}

export type ImportExportMode = 'current' | 'all';

export interface RollbackSnapshot {
  mode: ImportExportMode;
  createdAt: string;
  fileName?: string;
  state: AppState;
}

export interface PersistedStateEnvelope {
  version: string;
  timestamp: string;
  scope?: ImportExportMode;
  state: AppState;
}
