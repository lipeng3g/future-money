import { AnalyticsEngine } from '../analytics';
import type { DailySnapshot } from '@/types/timeline';

describe('AnalyticsEngine', () => {
  let engine: AnalyticsEngine;

  beforeEach(() => {
    engine = new AnalyticsEngine();
  });

  describe('generate', () => {
    it('should return empty summary for empty timeline', () => {
      const result = engine.generate([], 1000);

      expect(result.months).toEqual([]);
      expect(result.extremes.minBalance).toBe(0);
      expect(result.extremes.maxBalance).toBe(0);
      expect(result.totalIncome).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.endingBalance).toBe(0);
      expect(result.warningDates).toEqual([]);
    });

    it('should handle single day timeline', () => {
      const timeline: DailySnapshot[] = [
        {
          date: '2025-01-01',
          balance: 5000,
          change: 0,
          events: [],
          isWeekend: false,
          isToday: false,
          zone: 'frozen',
        },
      ];

      const result = engine.generate(timeline, 1000);

      expect(result.months).toHaveLength(1);
      expect(result.months[0].monthLabel).toBe('2025 Jan');
      expect(result.endingBalance).toBe(5000);
      expect(result.warningDates).toEqual([]);
    });

    it('should aggregate income and expense by month', () => {
      const timeline: DailySnapshot[] = [
        {
          date: '2025-01-15',
          balance: 5000,
          change: 5000,
          events: [
            { id: '1', eventId: 'e1', name: 'Salary', category: 'income', amount: 10000, date: '2025-01-15' },
            { id: '2', eventId: 'e2', name: 'Rent', category: 'expense', amount: 3000, date: '2025-01-15' },
          ],
          isWeekend: false,
          isToday: false,
          zone: 'frozen',
        },
        {
          date: '2025-02-15',
          balance: 8000,
          change: 3000,
          events: [
            { id: '3', eventId: 'e3', name: 'Salary', category: 'income', amount: 10000, date: '2025-02-15' },
            { id: '4', eventId: 'e4', name: 'Rent', category: 'expense', amount: 3000, date: '2025-02-15' },
            { id: '5', eventId: 'e5', name: 'Food', category: 'expense', amount: 1000, date: '2025-02-15' },
          ],
          isWeekend: false,
          isToday: false,
          zone: 'frozen',
        },
      ];

      const result = engine.generate(timeline, 1000);

      expect(result.months).toHaveLength(2);

      // January
      expect(result.months[0].monthLabel).toBe('2025 Jan');
      expect(result.months[0].income).toBe(10000);
      expect(result.months[0].expense).toBe(3000);
      expect(result.months[0].net).toBe(7000);

      // February
      expect(result.months[1].monthLabel).toBe('2025 Feb');
      expect(result.months[1].income).toBe(10000);
      expect(result.months[1].expense).toBe(4000);
      expect(result.months[1].net).toBe(6000);

      // Totals
      expect(result.totalIncome).toBe(20000);
      expect(result.totalExpense).toBe(7000);
    });

    it('should track min and max balance with dates', () => {
      const timeline: DailySnapshot[] = [
        { date: '2025-01-01', balance: 8000, change: 0, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
        { date: '2025-01-02', balance: 5000, change: -3000, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
        { date: '2025-01-03', balance: 12000, change: 7000, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
        { date: '2025-01-04', balance: 9000, change: -3000, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
      ];

      const result = engine.generate(timeline, 1000);

      expect(result.extremes.minBalance).toBe(5000);
      expect(result.extremes.minDate).toBe('2025-01-02');
      expect(result.extremes.maxBalance).toBe(12000);
      expect(result.extremes.maxDate).toBe('2025-01-03');
    });

    it('should track ending balance correctly', () => {
      const timeline: DailySnapshot[] = [
        { date: '2025-01-01', balance: 1000, change: 0, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
        { date: '2025-01-02', balance: 2000, change: 1000, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
        { date: '2025-01-03', balance: 1500, change: -500, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
      ];

      const result = engine.generate(timeline, 1000);

      expect(result.endingBalance).toBe(1500);
    });

    it('should collect warning dates when balance below threshold', () => {
      const timeline: DailySnapshot[] = [
        { date: '2025-01-01', balance: 5000, change: 0, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
        { date: '2025-01-02', balance: 800, change: -4200, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
        { date: '2025-01-03', balance: 600, change: -200, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
        { date: '2025-01-04', balance: 3000, change: 2400, events: [], isWeekend: false, isToday: false, zone: 'frozen' },
      ];

      const result = engine.generate(timeline, 1000);

      expect(result.warningDates).toEqual(['2025-01-02', '2025-01-03']);
    });

    it('should return ending balance when timeline is empty (fallback)', () => {
      const timeline: DailySnapshot[] = [];
      const result = engine.generate(timeline, 1000);

      expect(result.extremes.minBalance).toBe(0);
      expect(result.extremes.maxBalance).toBe(0);
    });

    it('should handle negative net correctly', () => {
      const timeline: DailySnapshot[] = [
        {
          date: '2025-01-15',
          balance: -1000,
          change: -1000,
          events: [
            { id: '1', eventId: 'e1', name: 'Expense', category: 'expense', amount: 5000, date: '2025-01-15' },
          ],
          isWeekend: false,
          isToday: false,
          zone: 'frozen',
        },
      ];

      const result = engine.generate(timeline, 1000);

      expect(result.months[0].net).toBe(-5000);
      expect(result.endingBalance).toBe(-1000);
      expect(result.warningDates).toContain('2025-01-15');
    });
  });
});