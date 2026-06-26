import type { Account, Money, Transaction } from '@/types';
import { eachDay, isBeforeDate, isSameOrBeforeDate } from './date';

export interface BalancePoint {
  date: string;
  value: Money;
}

/**
 * 计算单账户在 [from, to] 区间内的逐日余额。
 * 账户起始日之前不计入（视为账户尚未存在）。
 */
export function dailyBalances(
  account: Account,
  txs: Transaction[],
  from: string,
  to: string,
): BalancePoint[] {
  const accountTxs = txs
    .filter((t) => t.accountId === account.id)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // 区间起点之前的累计（含初始余额）
  let running = account.openingBalance;
  let idx = 0;
  while (idx < accountTxs.length && isBeforeDate(accountTxs[idx].date, from)) {
    running += accountTxs[idx].amount;
    idx++;
  }

  const points: BalancePoint[] = [];
  for (const day of eachDay(from, to)) {
    while (idx < accountTxs.length && isSameOrBeforeDate(accountTxs[idx].date, day)) {
      running += accountTxs[idx].amount;
      idx++;
    }
    const active = isSameOrBeforeDate(account.openingDate, day);
    points.push({ date: day, value: active ? running : 0 });
  }
  return points;
}

/** 计算所有账户的逐日总资产（账户起始日之前按 0 计） */
export function totalDailyBalances(
  accounts: Account[],
  txs: Transaction[],
  from: string,
  to: string,
): BalancePoint[] {
  const days = eachDay(from, to);
  const totals = new Map<string, Money>(days.map((d) => [d, 0]));

  for (const account of accounts) {
    for (const point of dailyBalances(account, txs, from, to)) {
      totals.set(point.date, (totals.get(point.date) ?? 0) + point.value);
    }
  }
  return days.map((date) => ({ date, value: totals.get(date) ?? 0 }));
}

/** 账户在指定日期的余额（用于卡片展示） */
export function balanceAt(account: Account, txs: Transaction[], date: string): Money {
  if (isBeforeDate(date, account.openingDate)) return 0;
  let sum = account.openingBalance;
  for (const t of txs) {
    if (t.accountId === account.id && isSameOrBeforeDate(t.date, date)) {
      sum += t.amount;
    }
  }
  return sum;
}
