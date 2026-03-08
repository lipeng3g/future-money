import { addDays, formatISO, isAfter, parseISO, startOfDay } from 'date-fns';
import type { CashFlowEvent } from '@/types/event';
import type { Reconciliation, LedgerEntry } from '@/types/reconciliation';
import { createId } from '@/utils/id';
import { isEventActiveOnDate, shouldEventOccurOnDate } from '@/utils/recurrence';

/** 待确认的账本条目（对账审核时使用） */
export interface PendingEntry {
  ruleId: string;
  name: string;
  amount: number;
  category: 'income' | 'expense';
  date: string;
  source: 'rule';
}

/** 计算事件规则在某个日期的周期标识，用于 Override 去重 */
export const computePeriodKey = (rule: CashFlowEvent, date: string): string => {
  switch (rule.type) {
    case 'monthly':
    case 'quarterly':
    case 'semi-annual':
      return date.slice(0, 7); // "YYYY-MM"
    case 'yearly':
      return date.slice(0, 4); // "YYYY"
    case 'once':
      return date; // "YYYY-MM-DD"
    default:
      return date;
  }
};

export class ReconciliationEngine {
  /**
   * 从上次对账日到目标日期，按规则生成所有应发生的事件实例
   */
  generatePendingEntries(
    rules: CashFlowEvent[],
    lastReconciliation: Reconciliation | null,
    targetDate: string,
  ): PendingEntry[] {
    const entries: PendingEntry[] = [];
    const startDate = lastReconciliation
      ? addDays(startOfDay(parseISO(lastReconciliation.date)), 1)
      : startOfDay(parseISO(targetDate));
    const endDate = startOfDay(parseISO(targetDate));

    if (isAfter(startDate, endDate)) return entries;

    const enabledRules = rules.filter((r) => r.enabled !== false);
    let cursor = new Date(startDate);

    while (!isAfter(cursor, endDate)) {
      for (const rule of enabledRules) {
        if (isEventActiveOnDate(rule, cursor) && shouldEventOccurOnDate(rule, cursor)) {
          entries.push({
            ruleId: rule.id,
            name: rule.name,
            amount: rule.amount,
            category: rule.category,
            date: formatISO(cursor, { representation: 'date' }),
            source: 'rule',
          });
        }
      }
      cursor = addDays(cursor, 1);
    }

    return entries;
  }

  /**
   * 创建对账记录：计算差额，必要时生成 adjustment 条目
   */
  createReconciliation(
    accountId: string,
    date: string,
    balance: number,
    entries: Array<{ ruleId?: string; name: string; amount: number; category: 'income' | 'expense'; date: string; source: 'rule' | 'manual' }>,
    lastReconciliation: Reconciliation | null,
    note?: string,
  ): { reconciliation: Reconciliation; ledgerEntries: LedgerEntry[] } {
    const nowIso = new Date().toISOString();
    const reconciliation: Reconciliation = {
      id: createId(),
      accountId,
      date,
      balance,
      note,
      createdAt: nowIso,
    };

    const ledgerEntries: LedgerEntry[] = entries.map((entry) => ({
      id: createId(),
      accountId,
      reconciliationId: reconciliation.id,
      ruleId: entry.ruleId,
      name: entry.name,
      amount: entry.amount,
      category: entry.category,
      date: entry.date,
      source: entry.source,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    // 计算预期余额
    const previousBalance = lastReconciliation?.balance ?? 0;
    const netAmount = ledgerEntries.reduce((sum, e) => {
      return sum + (e.category === 'income' ? e.amount : -e.amount);
    }, 0);
    const expectedBalance = Number((previousBalance + netAmount).toFixed(2));
    const diff = Number((balance - expectedBalance).toFixed(2));

    // 如果差额不为 0，生成调整条目
    if (Math.abs(diff) > 0.001) {
      ledgerEntries.push({
        id: createId(),
        accountId,
        reconciliationId: reconciliation.id,
        name: '差额调整',
        amount: Math.abs(diff),
        category: diff > 0 ? 'income' : 'expense',
        date,
        source: 'adjustment',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    return { reconciliation, ledgerEntries };
  }

  /**
   * 重新计算某个对账期的调整条目（在编辑账本条目后调用）
   */
  recalculateAdjustment(
    reconciliation: Reconciliation,
    ledgerEntries: LedgerEntry[],
    previousBalance: number,
  ): LedgerEntry[] {
    // 过滤掉旧的 adjustment 条目
    const nonAdjustmentEntries = ledgerEntries.filter((e) => e.source !== 'adjustment');

    const netAmount = nonAdjustmentEntries.reduce((sum, e) => {
      return sum + (e.category === 'income' ? e.amount : -e.amount);
    }, 0);
    const expectedBalance = Number((previousBalance + netAmount).toFixed(2));
    const diff = Number((reconciliation.balance - expectedBalance).toFixed(2));

    const result = [...nonAdjustmentEntries];

    if (Math.abs(diff) > 0.001) {
      const nowIso = new Date().toISOString();
      result.push({
        id: createId(),
        accountId: reconciliation.accountId,
        reconciliationId: reconciliation.id,
        name: '差额调整',
        amount: Math.abs(diff),
        category: diff > 0 ? 'income' : 'expense',
        date: reconciliation.date,
        source: 'adjustment',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    return result;
  }

}
