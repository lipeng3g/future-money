import { parseISO, format } from 'date-fns';
import type { AnalyticsSummary, MonthlySnapshot } from '@/types/analytics';
import type { DailySnapshot } from '@/types/timeline';

export class AnalyticsEngine {
  generate(timeline: DailySnapshot[], warningThreshold: number): AnalyticsSummary {
    const monthlyMap = new Map<string, MonthlySnapshot>();
    let minBalance = Number.POSITIVE_INFINITY;
    let maxBalance = Number.NEGATIVE_INFINITY;
    let minDate = timeline[0]?.date ?? '';
    let maxDate = timeline[0]?.date ?? '';
    let totalIncome = 0;
    let totalExpense = 0;

    const warningDates: string[] = [];

    timeline.forEach((snapshot) => {
      const currentDate = parseISO(snapshot.date);
      const key = format(currentDate, 'yyyy-MM');
      const label = format(currentDate, 'yyyy MMM');
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          monthLabel: label,
          income: 0,
          expense: 0,
          net: 0,
        });
      }
      const bucket = monthlyMap.get(key)!;

      snapshot.events.forEach((event) => {
        if (event.category === 'income') {
          bucket.income += event.amount;
          totalIncome += event.amount;
        } else {
          bucket.expense += event.amount;
          totalExpense += event.amount;
        }
      });
      bucket.net = bucket.income - bucket.expense;

      if (snapshot.balance < minBalance) {
        minBalance = snapshot.balance;
        minDate = snapshot.date;
      }
      if (snapshot.balance > maxBalance) {
        maxBalance = snapshot.balance;
        maxDate = snapshot.date;
      }

      if (snapshot.balance < warningThreshold) {
        warningDates.push(snapshot.date);
      }
    });

    const months = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([, bucket]) => bucket);

    const endingBalance = timeline.at(-1)?.balance ?? 0;

    return {
      months,
      extremes: {
        minBalance: Number.isFinite(minBalance) ? minBalance : endingBalance,
        minDate,
        maxBalance: Number.isFinite(maxBalance) ? maxBalance : endingBalance,
        maxDate,
      },
      totalIncome,
      totalExpense,
      endingBalance,
      warningDates,
    };
  }
}
