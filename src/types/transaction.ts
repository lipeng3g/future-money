import type { Money } from './common';

export interface Transaction {
  id: string;
  accountId: string;
  /** 发生日期 YYYY-MM-DD */
  date: string;
  /** 有符号金额（分）：存入 > 0，取出 < 0 */
  amount: Money;
  categoryId?: string;
  note?: string;
  /** 属于某周期组则关联，一次性为空 */
  seriesId?: string;
  createdAt: number;
  updatedAt: number;
}
