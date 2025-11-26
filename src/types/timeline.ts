import type { CashFlowEvent, TransactionCategory } from '@/types/event';
import type { BalanceSnapshot } from '@/types/account';

export interface EventOccurrence {
  id: string;
  eventId: string;
  name: string;
  category: TransactionCategory;
  amount: number;
  date: string;
  /** 可选：在多账户视图中标记事件的所属账户 */
  accountId?: string;
}

export interface DailySnapshot {
  date: string;
  balance: number;
  change: number;
  events: EventOccurrence[];
  isWeekend: boolean;
  isToday: boolean;
  /** 所属快照片段的 id（预留给多片段回放） */
  snapshotId?: string;
  /** 是否位于“今天”之前，用于图表区分历史与未来 */
  isPast?: boolean;
}

export interface TimelineInput {
  /** 所有定义的事件 */
  events: CashFlowEvent[];
  /** 参与预测的快照列表 */
  snapshots: BalanceSnapshot[];
  /** 视图预测范围（月） */
  months: number;
  /** 模式：仅使用最新快照，或生成所有片段 */
  mode?: 'latest' | 'segments';
  /** 可选：用于测试或“固定今天”，默认使用系统今天 */
  today?: string;
}
