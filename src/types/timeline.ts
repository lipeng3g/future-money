import type { CashFlowEvent, TransactionCategory } from '@/types/event';

export interface EventOccurrence {
  id: string;
  eventId: string;
  name: string;
  category: TransactionCategory;
  amount: number;
  date: string;
}

export interface DailySnapshot {
  date: string;
  balance: number;
  change: number;
  events: EventOccurrence[];
  isWeekend: boolean;
  isToday: boolean;
}

export interface TimelineInput {
  initialBalance: number;
  events: CashFlowEvent[];
  startDate: string;
  months: number;
}
