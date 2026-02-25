import type { CashFlowEvent, TransactionCategory } from '@/types/event';
import type { Reconciliation, LedgerEntry, EventOverride } from '@/types/reconciliation';

export interface EventOccurrence {
  id: string;
  eventId: string;
  name: string;
  category: TransactionCategory;
  amount: number;
  date: string;
  /** 可选：在多账户视图中标记事件的所属账户 */
  accountId?: string;
  /** 如果有覆盖记录 */
  overrideId?: string;
  /** 覆盖动作 */
  overrideAction?: string;
  /** 所属周期标识 */
  period?: string;
}

export interface DailySnapshot {
  date: string;
  balance: number;
  change: number;
  events: EventOccurrence[];
  isWeekend: boolean;
  isToday: boolean;
  /** 冻结区 or 预测区 */
  zone: 'frozen' | 'projected';
  /** 属于哪次对账（冻结区用） */
  reconciliationId?: string;
  /** 所属快照片段的 id（旧版兼容） */
  snapshotId?: string;
}

export interface TimelineInput {
  /** 所有定义的事件规则 */
  events: CashFlowEvent[];
  /** 对账记录 */
  reconciliations: Reconciliation[];
  /** 账本条目 */
  ledgerEntries: LedgerEntry[];
  /** 事件覆盖 */
  eventOverrides: EventOverride[];
  /** 视图预测范围（月） */
  months: number;
  /** 可选：用于测试或"固定今天"，默认使用系统今天 */
  today?: string;
}
