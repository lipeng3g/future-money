export type RecurrenceType = 'once' | 'monthly' | 'yearly';
export type TransactionCategory = 'income' | 'expense';

export interface CashFlowEvent {
  id: string;
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

export type NewCashFlowEvent = Omit<CashFlowEvent, 'id' | 'createdAt' | 'updatedAt'>;
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
