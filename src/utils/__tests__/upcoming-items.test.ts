import { describe, it, expect } from 'vitest';
import { buildUpcomingItems, DEFAULT_UPCOMING_ITEM_LIMIT, type UpcomingItem } from '@/utils/upcoming-items';
import type { DailySnapshot } from '@/types/timeline';

describe('upcoming-items', () => {
  const createMockSnapshot = (date: string, events: Array<{
    id: string;
    eventId: string;
    name: string;
    amount: number;
    category: 'income' | 'expense';
    period?: string;
    overrideId?: string;
    overrideAction?: string;
    accountId?: string;
  }>): DailySnapshot => ({
    date,
    balance: 0,
    income: 0,
    expense: 0,
    net: 0,
    events,
  });

  describe('buildUpcomingItems', () => {
    it('returns empty array when timeline is empty', () => {
      const result = buildUpcomingItems([], '2025-01-01');
      expect(result).toEqual([]);
    });

    it('returns empty array when no events in the upcoming range', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-01', [{ id: 'e1', eventId: 'ev1', name: 'Rent', amount: 1000, category: 'expense' }]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-15');
      expect(result).toEqual([]);
    });

    it('filters events within the default 60-day window', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-01', [{ id: 'e1', eventId: 'ev1', name: 'Rent', amount: 1000, category: 'expense' }]),
        createMockSnapshot('2025-02-01', [{ id: 'e2', eventId: 'ev2', name: 'Salary', amount: 5000, category: 'income' }]),
        createMockSnapshot('2025-04-01', [{ id: 'e3', eventId: 'ev3', name: 'Bonus', amount: 2000, category: 'income' }]), // > 60 days
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['Rent', 'Salary']);
    });

    it('respects custom daysAhead option', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-01', [{ id: 'e1', eventId: 'ev1', name: 'Rent', amount: 1000, category: 'expense' }]),
        createMockSnapshot('2025-01-20', [{ id: 'e2', eventId: 'ev2', name: 'Salary', amount: 5000, category: 'income' }]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01', { daysAhead: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Rent');
    });

    it('respects custom limit option', () => {
      const timeline: DailySnapshot[] = Array.from({ length: 30 }, (_, i) =>
        createMockSnapshot(`2025-01-${String(i + 1).padStart(2, '0')}`, [
          { id: `e${i}`, eventId: `ev${i}`, name: `Event ${i}`, amount: 100, category: 'expense' },
        ])
      );
      const result = buildUpcomingItems(timeline, '2025-01-01', { limit: 5 });
      expect(result).toHaveLength(5);
    });

    it('defaults to DEFAULT_UPCOMING_ITEM_LIMIT when no limit specified', () => {
      const timeline: DailySnapshot[] = Array.from({ length: 50 }, (_, i) =>
        createMockSnapshot(`2025-01-${String(i + 1).padStart(2, '0')}`, [
          { id: `e${i}`, eventId: `ev${i}`, name: `Event ${i}`, amount: 100, category: 'expense' },
        ])
      );
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result).toHaveLength(DEFAULT_UPCOMING_ITEM_LIMIT);
    });

    it('sorts expenses before income within same day', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-05', [
          { id: 'e1', eventId: 'ev1', name: 'Salary', amount: 3000, category: 'income' },
          { id: 'e2', eventId: 'ev2', name: 'Rent', amount: 1500, category: 'expense' },
        ]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result[0].name).toBe('Rent');
      expect(result[1].name).toBe('Salary');
    });

    it('sorts by amount descending within same category', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-05', [
          { id: 'e1', eventId: 'ev1', name: 'Small', amount: 100, category: 'expense' },
          { id: 'e2', eventId: 'ev2', name: 'Large', amount: 500, category: 'expense' },
        ]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result[0].name).toBe('Large');
      expect(result[1].name).toBe('Small');
    });

    it('sorts by name alphabetically within same category and amount', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-05', [
          { id: 'e1', eventId: 'ev1', name: 'Zebra', amount: 100, category: 'expense' },
          { id: 'e2', eventId: 'ev2', name: 'Apple', amount: 100, category: 'expense' },
        ]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result[0].name).toBe('Apple');
      expect(result[1].name).toBe('Zebra');
    });

    it('generates unique id combining event id and date', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-05', [{ id: 'e1', eventId: 'ev1', name: 'Rent', amount: 1000, category: 'expense' }]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result[0].id).toBe('e1-2025-01-05');
    });

    it('preserves period, overrideId, overrideAction, accountId from event', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-05', [{
          id: 'e1',
          eventId: 'ev1',
          name: 'Rent',
          amount: 1000,
          category: 'expense',
          period: 'monthly',
          overrideId: 'ov1',
          overrideAction: 'skip',
          accountId: 'acc1',
        }]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result[0]).toMatchObject({
        period: 'monthly',
        overrideId: 'ov1',
        overrideAction: 'skip',
        accountId: 'acc1',
      });
    });

    it('sorts by date ascending across multiple days', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-10', [{ id: 'e1', eventId: 'ev1', name: 'Later', amount: 100, category: 'expense' }]),
        createMockSnapshot('2025-01-05', [{ id: 'e2', eventId: 'ev2', name: 'Earlier', amount: 100, category: 'expense' }]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result[0].date).toBe('2025-01-05');
      expect(result[1].date).toBe('2025-01-10');
    });

    it('includes events on today when today is the reference date', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-01', [{ id: 'e1', eventId: 'ev1', name: 'TodayEvent', amount: 100, category: 'expense' }]),
        createMockSnapshot('2025-01-02', [{ id: 'e2', eventId: 'ev2', name: 'TomorrowEvent', amount: 100, category: 'expense' }]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('TodayEvent');
      expect(result[1].name).toBe('TomorrowEvent');
    });

    it('handles events with zero amount', () => {
      const timeline: DailySnapshot[] = [
        createMockSnapshot('2025-01-05', [{ id: 'e1', eventId: 'ev1', name: 'Zero', amount: 0, category: 'expense' }]),
      ];
      const result = buildUpcomingItems(timeline, '2025-01-01');
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(0);
    });
  });

  describe('DEFAULT_UPCOMING_ITEM_LIMIT', () => {
    it('is a positive number', () => {
      expect(DEFAULT_UPCOMING_ITEM_LIMIT).toBeGreaterThan(0);
    });

    it('equals 18', () => {
      expect(DEFAULT_UPCOMING_ITEM_LIMIT).toBe(18);
    });
  });
});