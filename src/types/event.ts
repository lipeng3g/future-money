export type RecurrenceType = 'once' | 'monthly' | 'yearly';
export type TransactionCategory = 'income' | 'expense';

export interface CashFlowEvent {
  id: string;
  /** 归属账户 id，用于多账户分类 */
  accountId: string;
  name: string;
  amount: number;
  category: TransactionCategory;
  type: RecurrenceType;
  startDate: string;
  endDate?: string;
  onceDate?: string;
  monthlyDay?: number;
  yearlyMonth?: number;
  yearlyDay?: number;
  color?: string;
  notes?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// accountId 允许省略，由 store 在添加事件时根据当前账户补全
export type NewCashFlowEvent = Omit<CashFlowEvent, 'id' | 'accountId' | 'createdAt' | 'updatedAt'> & {
  accountId?: string;
};
export type CashFlowEventUpdate = Partial<Omit<CashFlowEvent, 'id' | 'createdAt' | 'updatedAt'>>;

export interface EventFormValues {
  id?: string;
  name: string;
  amount: number;
  category: TransactionCategory;
  type: RecurrenceType;
  startDate: string;
  endDate?: string;
  onceDate?: string;
  monthlyDay?: number;
  yearlyMonth?: number;
  yearlyDay?: number;
  notes?: string;
  color?: string;
  enabled: boolean;
}
