import { describe, expect, it } from 'vitest';
import { generateSampleEvents } from '@/utils/sample-data';

describe('sample-data', () => {
  describe('generateSampleEvents', () => {
    it('generates array of cash flow events', () => {
      const events = generateSampleEvents('test-account');
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it('assigns correct accountId to all events', () => {
      const accountId = 'my-test-account';
      const events = generateSampleEvents(accountId);
      events.forEach((event) => {
        expect(event.accountId).toBe(accountId);
      });
    });

    it('generates events with valid required fields', () => {
      const events = generateSampleEvents('test-account');
      events.forEach((event) => {
        expect(event.id).toBeDefined();
        expect(event.accountId).toBe('test-account');
        expect(event.name).toBeDefined();
        expect(typeof event.amount).toBe('number');
        expect(event.amount).toBeGreaterThan(0);
        expect(event.category).toMatch(/^(income|expense)$/);
        expect(event.type).toMatch(/^(monthly|yearly|quarterly|semi-annual|once)$/);
        expect(event.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(event.enabled).toBe(true);
        expect(event.createdAt).toBeDefined();
        expect(event.updatedAt).toBeDefined();
      });
    });

    it('includes income events with correct category', () => {
      const events = generateSampleEvents('test-account');
      const incomeEvents = events.filter((e) => e.category === 'income');
      expect(incomeEvents.length).toBeGreaterThan(0);
      incomeEvents.forEach((event) => {
        expect(event.name).toMatch(/工资|奖金|半年奖/);
      });
    });

    it('includes expense events with correct category', () => {
      const events = generateSampleEvents('test-account');
      const expenseEvents = events.filter((e) => e.category === 'expense');
      expect(expenseEvents.length).toBeGreaterThan(0);
      expenseEvents.forEach((event) => {
        expect(event.name).toMatch(/还款|房贷|保险|体检|家电/);
      });
    });

    it('generates monthly recurring events', () => {
      const events = generateSampleEvents('test-account');
      const monthlyEvents = events.filter((e) => e.type === 'monthly');
      expect(monthlyEvents.length).toBe(3);
      monthlyEvents.forEach((event) => {
        expect(event.monthlyDay).toBeDefined();
        expect(typeof event.monthlyDay).toBe('number');
      });
    });

    it('generates yearly recurring events', () => {
      const events = generateSampleEvents('test-account');
      const yearlyEvents = events.filter((e) => e.type === 'yearly');
      expect(yearlyEvents.length).toBe(2);
      yearlyEvents.forEach((event) => {
        expect(event.yearlyMonth).toBeDefined();
        expect(typeof event.yearlyMonth).toBe('number');
        expect(event.yearlyMonth).toBeGreaterThanOrEqual(1);
        expect(event.yearlyMonth).toBeLessThanOrEqual(12);
        expect(event.yearlyDay).toBeDefined();
      });
    });

    it('generates quarterly recurring event', () => {
      const events = generateSampleEvents('test-account');
      const quarterlyEvents = events.filter((e) => e.type === 'quarterly');
      expect(quarterlyEvents.length).toBe(1);
      expect(quarterlyEvents[0].name).toBe('季度体检');
    });

    it('generates semi-annual recurring event', () => {
      const events = generateSampleEvents('test-account');
      const semiAnnualEvents = events.filter((e) => e.type === 'semi-annual');
      expect(semiAnnualEvents.length).toBe(1);
      expect(semiAnnualEvents[0].name).toBe('半年奖');
    });

    it('generates one-time event with onceDate', () => {
      const events = generateSampleEvents('test-account');
      const onceEvents = events.filter((e) => e.type === 'once');
      expect(onceEvents.length).toBe(1);
      expect(onceEvents[0].onceDate).toBeDefined();
      expect(onceEvents[0].onceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('generates unique IDs for each event', () => {
      const events = generateSampleEvents('test-account');
      const ids = events.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(events.length);
    });
  });
});