import { describe, it, expect } from 'vitest';
import { isEventActiveOnDate, shouldEventOccurOnDate } from '../recurrence';
import { parseISO } from 'date-fns';

const createEvent = (overrides: Partial<import('@/types/event').CashFlowEvent> = {}): import('@/types/event').CashFlowEvent => ({
  id: 'test-id',
  accountId: 'account-1',
  name: 'Test Event',
  amount: 1000,
  category: 'income',
  type: 'once',
  startDate: '2025-01-15',
  enabled: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('recurrence.ts', () => {
  describe('isEventActiveOnDate', () => {
    it('should return true when date is after start date', () => {
      const event = createEvent({ startDate: '2025-01-01', endDate: undefined });
      const date = parseISO('2025-06-15');
      expect(isEventActiveOnDate(event, date)).toBe(true);
    });

    it('should return false when date is before start date', () => {
      const event = createEvent({ startDate: '2025-06-01', endDate: undefined });
      const date = parseISO('2025-01-15');
      expect(isEventActiveOnDate(event, date)).toBe(false);
    });

    it('should return false when date is after end date', () => {
      const event = createEvent({ startDate: '2025-01-01', endDate: '2025-03-31' });
      const date = parseISO('2025-06-15');
      expect(isEventActiveOnDate(event, date)).toBe(false);
    });

    it('should return true when date is within start and end range', () => {
      const event = createEvent({ startDate: '2025-01-01', endDate: '2025-12-31' });
      const date = parseISO('2025-06-15');
      expect(isEventActiveOnDate(event, date)).toBe(true);
    });

    it('should return true on start date boundary', () => {
      const event = createEvent({ startDate: '2025-01-15', endDate: '2025-12-31' });
      const date = parseISO('2025-01-15');
      expect(isEventActiveOnDate(event, date)).toBe(true);
    });

    it('should return false on day after end date', () => {
      const event = createEvent({ startDate: '2025-01-01', endDate: '2025-03-31' });
      const date = parseISO('2025-04-01');
      expect(isEventActiveOnDate(event, date)).toBe(false);
    });
  });

  describe('shouldEventOccurOnDate - once', () => {
    it('should return true when onceDate matches', () => {
      const event = createEvent({ type: 'once', onceDate: '2025-03-15', startDate: '2025-01-01' });
      const date = parseISO('2025-03-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(true);
    });

    it('should return false when onceDate does not match', () => {
      const event = createEvent({ type: 'once', onceDate: '2025-03-15', startDate: '2025-01-01' });
      const date = parseISO('2025-03-16');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);
    });

    it('should fallback to startDate when onceDate is not set', () => {
      const event = createEvent({ type: 'once', onceDate: undefined, startDate: '2025-03-20' });
      const date = parseISO('2025-03-20');
      expect(shouldEventOccurOnDate(event, date)).toBe(true);
    });
  });

  describe('shouldEventOccurOnDate - monthly', () => {
    it('should return true when monthlyDay matches', () => {
      const event = createEvent({ type: 'monthly', monthlyDay: 15, startDate: '2025-01-01' });
      const date = parseISO('2025-03-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(true);
    });

    it('should return false when monthlyDay does not match', () => {
      const event = createEvent({ type: 'monthly', monthlyDay: 15, startDate: '2025-01-01' });
      const date = parseISO('2025-03-20');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);
    });

    it('should return false when monthlyDay is not set', () => {
      const event = createEvent({ type: 'monthly', monthlyDay: undefined, startDate: '2025-01-01' });
      const date = parseISO('2025-03-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);
    });

    it('should return false when date is before event start', () => {
      const event = createEvent({ type: 'monthly', monthlyDay: 15, startDate: '2025-06-01' });
      const date = parseISO('2025-03-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);
    });

    it('should clamp day to end of month for 31st in shorter months', () => {
      const event = createEvent({ type: 'monthly', monthlyDay: 31, startDate: '2025-01-01' });
      // February never has 31 days, so it clamps to 28 (end of Feb)
      const dateFeb28 = parseISO('2025-02-28');
      expect(shouldEventOccurOnDate(event, dateFeb28)).toBe(true);
      // March has 31 days, so it matches
      const dateMar31 = parseISO('2025-03-31');
      expect(shouldEventOccurOnDate(event, dateMar31)).toBe(true);
      // April only has 30 days, so it clamps to 30
      const dateApr30 = parseISO('2025-04-30');
      expect(shouldEventOccurOnDate(event, dateApr30)).toBe(true);
      // April 31 doesn't exist
      const dateApr = parseISO('2025-04-15');
      expect(shouldEventOccurOnDate(event, dateApr)).toBe(false);
    });
  });

  describe('shouldEventOccurOnDate - quarterly', () => {
    it('should return true on quarter months (every 3 months)', () => {
      const event = createEvent({ type: 'quarterly', monthlyDay: 15, startDate: '2025-01-01' });
      // January (0), April (3), July (6), October (9), December (11)
      expect(shouldEventOccurOnDate(event, parseISO('2025-01-15'))).toBe(true);
      expect(shouldEventOccurOnDate(event, parseISO('2025-04-15'))).toBe(true);
      expect(shouldEventOccurOnDate(event, parseISO('2025-07-15'))).toBe(true);
      expect(shouldEventOccurOnDate(event, parseISO('2025-10-15'))).toBe(true);
    });

    it('should return false on non-quarter months', () => {
      const event = createEvent({ type: 'quarterly', monthlyDay: 15, startDate: '2025-01-01' });
      expect(shouldEventOccurOnDate(event, parseISO('2025-02-15'))).toBe(false);
      expect(shouldEventOccurOnDate(event, parseISO('2025-03-15'))).toBe(false);
      expect(shouldEventOccurOnDate(event, parseISO('2025-05-15'))).toBe(false);
    });

    it('should return false when monthlyDay is not set', () => {
      const event = createEvent({ type: 'quarterly', monthlyDay: undefined, startDate: '2025-01-01' });
      const date = parseISO('2025-04-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);
    });
  });

  describe('shouldEventOccurOnDate - semi-annual', () => {
    it('should return true every 6 months from start', () => {
      const event = createEvent({ type: 'semi-annual', monthlyDay: 15, startDate: '2025-01-01' });
      // January (0), July (6)
      expect(shouldEventOccurOnDate(event, parseISO('2025-01-15'))).toBe(true);
      expect(shouldEventOccurOnDate(event, parseISO('2025-07-15'))).toBe(true);
      expect(shouldEventOccurOnDate(event, parseISO('2026-01-15'))).toBe(true);
    });

    it('should return false on non-semiannual months', () => {
      const event = createEvent({ type: 'semi-annual', monthlyDay: 15, startDate: '2025-01-01' });
      expect(shouldEventOccurOnDate(event, parseISO('2025-03-15'))).toBe(false);
      expect(shouldEventOccurOnDate(event, parseISO('2025-04-15'))).toBe(false);
    });

    it('should return false when monthlyDay is not set', () => {
      const event = createEvent({ type: 'semi-annual', monthlyDay: undefined, startDate: '2025-01-01' });
      const date = parseISO('2025-07-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);
    });
  });

  describe('shouldEventOccurOnDate - yearly', () => {
    it('should return true when yearlyMonth and yearlyDay match', () => {
      const event = createEvent({ type: 'yearly', yearlyMonth: 6, yearlyDay: 15, startDate: '2025-01-01' });
      const date = parseISO('2025-06-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(true);
    });

    it('should return false when yearlyMonth does not match', () => {
      const event = createEvent({ type: 'yearly', yearlyMonth: 6, yearlyDay: 15, startDate: '2025-01-01' });
      const date = parseISO('2025-07-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);
    });

    it('should return false when yearlyDay does not match', () => {
      const event = createEvent({ type: 'yearly', yearlyMonth: 6, yearlyDay: 15, startDate: '2025-01-01' });
      const date = parseISO('2025-06-20');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);
    });

    it('should return false when yearlyMonth or yearlyDay is not set', () => {
      const event = createEvent({ type: 'yearly', yearlyMonth: undefined, yearlyDay: 15, startDate: '2025-01-01' });
      const date = parseISO('2025-06-15');
      expect(shouldEventOccurOnDate(event, date)).toBe(false);

      const event2 = createEvent({ type: 'yearly', yearlyMonth: 6, yearlyDay: undefined, startDate: '2025-01-01' });
      expect(shouldEventOccurOnDate(event2, date)).toBe(false);
    });

    it('should handle Feb 29 on non-leap years by normalizing to Feb 28', () => {
      const event = createEvent({ type: 'yearly', yearlyMonth: 2, yearlyDay: 29, startDate: '2024-01-01' });
      // 2025 is not a leap year, so Feb 29 doesn't exist - should normalize to Feb 28
      const date2025 = parseISO('2025-02-28');
      expect(shouldEventOccurOnDate(event, date2025)).toBe(true);
      // Feb 29 2025 doesn't exist in JS Date, but if it did, it would be Mar 1
      const date2025Mar1 = parseISO('2025-03-01');
      expect(shouldEventOccurOnDate(event, date2025Mar1)).toBe(false);
    });

    it('should return true for Feb 29 on leap years', () => {
      const event = createEvent({ type: 'yearly', yearlyMonth: 2, yearlyDay: 29, startDate: '2024-01-01' });
      const date2024 = parseISO('2024-02-29');
      expect(shouldEventOccurOnDate(event, date2024)).toBe(true);
    });
  });
});