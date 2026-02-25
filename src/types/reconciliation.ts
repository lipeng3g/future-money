/** 对账记录 — 时间锚点 */
export interface Reconciliation {
  id: string;
  accountId: string;
  /** 对账日期 (YYYY-MM-DD) */
  date: string;
  /** 该日真实余额 */
  balance: number;
  note?: string;
  createdAt: string;
}

/** 账本条目 — 对账期间内的具体事件实例 */
export interface LedgerEntry {
  id: string;
  accountId: string;
  /** 属于哪次对账 */
  reconciliationId: string;
  /** 来源规则ID（手动添加的为空） */
  ruleId?: string;
  name: string;
  amount: number;
  category: 'income' | 'expense';
  /** 实际发生日期 */
  date: string;
  source: 'rule' | 'manual' | 'adjustment';
  createdAt: string;
  updatedAt: string;
}

/** 事件覆盖 — 对未来预测事件的单次修改 */
export interface EventOverride {
  id: string;
  accountId: string;
  ruleId: string;
  /** 月度="2025-02", 年度="2025", 一次性="2025-02-08" */
  period: string;
  action: 'confirmed' | 'skipped' | 'modified';
  /** action=modified 时用 */
  amount?: number;
  /** action=confirmed 时可记录实际日期 */
  actualDate?: string;
  name?: string;
  createdAt: string;
}
