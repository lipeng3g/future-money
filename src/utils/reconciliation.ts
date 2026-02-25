import { addDays, differenceInCalendarMonths, formatISO, isAfter, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { CashFlowEvent } from '@/types/event';
import type { Reconciliation, LedgerEntry } from '@/types/reconciliation';
import { createId } from '@/utils/id';

/** 待确认的账本条目（对账审核时使用） */
export interface PendingEntry {
  ruleId: string;
  name: string;
  amount: number;
  category: 'income' | 'expense';
  date: string;
  source: 'rule';
}

const clampMonthlyExecutionDate = (target: Date, day: number): number => {
  const endOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return Math.min(day, endOfMonth);
};

const normalizeYearlyDay = (date: Date, month: number, day: number): { month: number; day: number } => {
  const year = date.getFullYear();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (month === 2 && day === 29 && !isLeap) {
    return { month, day: 28 };
  }
  return { month, day };
};

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
        if (this.isEventActiveOnDate(rule, cursor) && this.shouldEventOccur(rule, cursor)) {
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

  private isEventActiveOnDate(event: CashFlowEvent, date: Date): boolean {
    const start = startOfDay(parseISO(event.startDate));
    if (isBefore(date, start)) return false;
    if (event.endDate) {
      const end = startOfDay(parseISO(event.endDate));
      if (isAfter(date, end)) return false;
    }
    return true;
  }

  private shouldEventOccur(event: CashFlowEvent, date: Date): boolean {
    switch (event.type) {
      case 'once': {
        const target = event.onceDate ? startOfDay(parseISO(event.onceDate)) : startOfDay(parseISO(event.startDate));
        return isSameDay(date, target);
      }
      case 'monthly': {
        if (!event.monthlyDay) return false;
        if (differenceInCalendarMonths(date, startOfDay(parseISO(event.startDate))) < 0) return false;
        const targetDay = clampMonthlyExecutionDate(date, event.monthlyDay);
        return date.getDate() === targetDay;
      }
      case 'quarterly': {
        if (!event.monthlyDay) return false;
        const qDiff = differenceInCalendarMonths(date, startOfDay(parseISO(event.startDate)));
        if (qDiff < 0 || qDiff % 3 !== 0) return false;
        const qDay = clampMonthlyExecutionDate(date, event.monthlyDay);
        return date.getDate() === qDay;
      }
      case 'semi-annual': {
        if (!event.monthlyDay) return false;
        const sDiff = differenceInCalendarMonths(date, startOfDay(parseISO(event.startDate)));
        if (sDiff < 0 || sDiff % 6 !== 0) return false;
        const sDay = clampMonthlyExecutionDate(date, event.monthlyDay);
        return date.getDate() === sDay;
      }
      case 'yearly': {
        if (!event.yearlyMonth || !event.yearlyDay) return false;
        const normalized = normalizeYearlyDay(date, event.yearlyMonth, event.yearlyDay);
        return date.getMonth() + 1 === normalized.month && date.getDate() === normalized.day;
      }
      default:
        return false;
    }
  }
}
