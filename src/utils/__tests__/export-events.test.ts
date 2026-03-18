import { describe, it, expect } from 'vitest';
import type { CashFlowEvent } from '@/types/event';
import type { AccountConfig } from '@/types/account';
import { buildEventsCsv, buildEventsJson } from '@/utils/export-events';

describe('export-events.ts', () => {
  const mockEvent: CashFlowEvent = {
    id: 'evt-001',
    accountId: 'acc-001',
    name: '工资',
    amount: 15000,
    category: 'income',
    type: 'monthly',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    monthlyDay: 1,
    yearlyMonth: undefined,
    yearlyDay: undefined,
    color: '#3b82f6',
    notes: '月薪',
    enabled: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const mockExpenseEvent: CashFlowEvent = {
    id: 'evt-002',
    accountId: 'acc-001',
    name: '房租',
    amount: 3000,
    category: 'expense',
    type: 'monthly',
    startDate: '2025-01-01',
    monthlyDay: 15,
    enabled: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const mockOnceEvent: CashFlowEvent = {
    id: 'evt-003',
    accountId: 'acc-002',
    name: '奖金',
    amount: 5000,
    category: 'income',
    type: 'once',
    startDate: '2025-03-01',
    onceDate: '2025-03-15',
    enabled: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const mockAccounts: AccountConfig[] = [
    {
      id: 'acc-001',
      name: '主账户',
      typeLabel: '现金账户',
      initialBalance: 0,
      currency: '¥',
      warningThreshold: 1000,
      color: '#3b82f6',
      iconKey: 'wallet',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'acc-002',
      name: '储蓄账户',
      typeLabel: '储蓄账户',
      initialBalance: 0,
      currency: '¥',
      warningThreshold: 1000,
      color: '#10b981',
      iconKey: 'piggy',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ];

  describe('buildEventsCsv', () => {
    it('should generate CSV with headers', () => {
      const csv = buildEventsCsv([mockEvent], []);
      const lines = csv.split('\n');
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('账户');
      expect(lines[0]).toContain('名称');
      expect(lines[0]).toContain('金额');
    });

    it('should map account ID to account name', () => {
      const csv = buildEventsCsv([mockEvent], mockAccounts);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('主账户');
    });

    it('should handle events without accounts', () => {
      const csv = buildEventsCsv([mockEvent], []);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('acc-001'); // fallback to accountId
    });

    it('should handle income and expense categories', () => {
      const csv = buildEventsCsv([mockEvent, mockExpenseEvent], []);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('income');
      expect(lines[2]).toContain('expense');
    });

    it('should handle monthly recurrence type', () => {
      const csv = buildEventsCsv([mockEvent], []);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('monthly');
      expect(lines[1]).toContain('1'); // monthlyDay
    });

    it('should handle once recurrence type with onceDate', () => {
      const csv = buildEventsCsv([mockOnceEvent], []);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('once');
      expect(lines[1]).toContain('2025-03-15'); // onceDate
    });

    it('should handle optional fields (endDate, notes, color)', () => {
      const csv = buildEventsCsv([mockEvent], []);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('2025-12-31'); // endDate
      expect(lines[1]).toContain('月薪'); // notes
      expect(lines[1]).toContain('#3b82f6'); // color
    });

    it('should handle disabled events', () => {
      const disabledEvent = { ...mockEvent, enabled: false };
      const csv = buildEventsCsv([disabledEvent], []);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('false');
    });

    it('should escape special characters in CSV', () => {
      const specialEvent = { ...mockEvent, name: '测试,"comma' };
      const csv = buildEventsCsv([specialEvent], []);
      expect(csv).toContain('"测试,""comma"');
    });

    it('should format dates in ISO format', () => {
      const csv = buildEventsCsv([mockEvent], []);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('2025-01-01T00:00:00.000Z'); // createdAt
      expect(lines[1]).toContain('2025-01-01T00:00:00.000Z'); // updatedAt
    });

    it('should handle empty events array', () => {
      const csv = buildEventsCsv([], []);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1); // only headers
      expect(lines[0]).toContain('id');
    });
  });

  describe('buildEventsJson', () => {
    it('should generate JSON with exportedAt timestamp', () => {
      const json = buildEventsJson([mockEvent]);
      const parsed = JSON.parse(json);
      expect(parsed.exportedAt).toBeDefined();
      expect(new Date(parsed.exportedAt).getTime()).not.toBeNaN();
    });

    it('should include count of exported events', () => {
      const json = buildEventsJson([mockEvent, mockExpenseEvent]);
      const parsed = JSON.parse(json);
      expect(parsed.count).toBe(2);
    });

    it('should include events array', () => {
      const json = buildEventsJson([mockEvent]);
      const parsed = JSON.parse(json);
      expect(parsed.events).toHaveLength(1);
      expect(parsed.events[0].id).toBe('evt-001');
    });

    it('should pretty-print JSON with 2-space indentation', () => {
      const json = buildEventsJson([mockEvent]);
      // Check that the JSON has newlines (pretty-printed)
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should handle empty events array', () => {
      const json = buildEventsJson([]);
      const parsed = JSON.parse(json);
      expect(parsed.count).toBe(0);
      expect(parsed.events).toHaveLength(0);
    });

    it('should preserve event data structure', () => {
      const json = buildEventsJson([mockEvent]);
      const parsed = JSON.parse(json);
      expect(parsed.events[0]).toEqual(mockEvent);
    });
  });
});