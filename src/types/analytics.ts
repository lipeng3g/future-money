export interface MonthlySnapshot {
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
}

export interface BalanceExtremes {
  minBalance: number;
  minDate: string;
  maxBalance: number;
  maxDate: string;
}

export interface AnalyticsSummary {
  months: MonthlySnapshot[];
  extremes: BalanceExtremes;
  totalIncome: number;
  totalExpense: number;
  endingBalance: number;
  warningDates: string[];
}
