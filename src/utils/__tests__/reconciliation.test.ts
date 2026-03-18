import { describe, it, expect } from 'vitest';
import { ReconciliationEngine, computePeriodKey } from '../reconciliation';
import type { CashFlowEvent } from '@/types/event';
import type { Reconciliation, LedgerEntry } from '@/types/reconciliation';

const createEvent = (overrides: Partial<CashFlowEvent> = {}): CashFlowEvent => ({
  id: 'rule-1',
  accountId: 'account-1',
  name: 'Test Rule',
  amount: 1000,
  category: 'income',
  type: 'once',
  startDate: '2025-01-01',
  enabled: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const createReconciliation = (overrides: Partial<Reconciliation> = {}): Reconciliation => ({
  id: 'recon-1',
  accountId: 'account-1',
  date: '2025-01-31',
  balance: 5000,
  createdAt: '2025-01-31T00:00:00Z',
  ...overrides,
});

describe('reconciliation.ts', () => {
  describe('computePeriodKey', () => {
    it('should return full date for once type', () => {
      const event = createEvent({ type: 'once' });
      expect(computePeriodKey(event, '2025-06-15')).toBe('2025-06-15');
    });

    it('should return YYYY-MM for monthly type', () => {
      const event = createEvent({ type: 'monthly' });
      expect(computePeriodKey(event, '2025-06-15')).toBe('2025-06');
    });

    it('should return YYYY-MM for quarterly type', () => {
      const event = createEvent({ type: 'quarterly' });
      expect(computePeriodKey(event, '2025-06-15')).toBe('2025-06');
    });

    it('should return YYYY-MM for semi-annual type', () => {
      const event = createEvent({ type: 'semi-annual' });
      expect(computePeriodKey(event, '2025-06-15')).toBe('2025-06');
    });

    it('should return YYYY for yearly type', () => {
      const event = createEvent({ type: 'yearly' });
      expect(computePeriodKey(event, '2025-06-15')).toBe('2025');
    });
  });

  describe('ReconciliationEngine', () => {
    describe('generatePendingEntries', () => {
      it('should return empty array when no rules provided', () => {
        const engine = new ReconciliationEngine();
        const result = engine.generatePendingEntries([], null, '2025-06-30');
        expect(result).toHaveLength(0);
      });

      it('should return empty array when startDate is after endDate', () => {
        const engine = new ReconciliationEngine();
        const result = engine.generatePendingEntries([], null, '2025-01-01');
        expect(result).toHaveLength(0);
      });

      it('should filter out disabled rules', () => {
        const engine = new ReconciliationEngine();
        const rules: CashFlowEvent[] = [
          createEvent({ id: 'rule-1', type: 'once', onceDate: '2025-06-15', enabled: false }),
        ];
        const result = engine.generatePendingEntries(rules, null, '2025-06-30');
        expect(result).toHaveLength(0);
      });

      it('should generate entries for once type events within date range', () => {
        const engine = new ReconciliationEngine();
        const rules: CashFlowEvent[] = [
          createEvent({ id: 'rule-1', type: 'once', onceDate: '2025-06-15', amount: 1000, category: 'income' }),
        ];
        // Need lastReconciliation to have a proper date range to iterate over
        const lastReconciliation = createReconciliation({ date: '2025-06-01' });
        const result = engine.generatePendingEntries(rules, lastReconciliation, '2025-06-30');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          ruleId: 'rule-1',
          name: 'Test Rule',
          amount: 1000,
          category: 'income',
          date: '2025-06-15',
          source: 'rule',
        });
      });

      it('should generate entries for monthly recurring events', () => {
        const engine = new ReconciliationEngine();
        const rules: CashFlowEvent[] = [
          createEvent({
            id: 'rule-1',
            type: 'monthly',
            monthlyDay: 15,
            startDate: '2025-01-01',
            amount: 500,
            category: 'expense',
          }),
        ];
        // Need lastReconciliation to have a proper date range
        const lastReconciliation = createReconciliation({ date: '2025-06-01' });
        // Generate from 2025-06-02 to 2025-06-30 - should get the 15th entry
        const result = engine.generatePendingEntries(rules, lastReconciliation, '2025-06-30');
        expect(result).toHaveLength(1);
        expect(result[0].date).toBe('2025-06-15');
        expect(result[0].category).toBe('expense');
      });

      it('should start from day after last reconciliation', () => {
        const engine = new ReconciliationEngine();
        const lastReconciliation = createReconciliation({ date: '2025-06-14' });
        const rules: CashFlowEvent[] = [
          createEvent({
            id: 'rule-1',
            type: 'monthly',
            monthlyDay: 15,
            startDate: '2025-01-01',
            amount: 500,
          }),
        ];
        // Last recon was 2025-06-14, so should start from 2025-06-15
        const result = engine.generatePendingEntries(rules, lastReconciliation, '2025-07-31');
        // Should get 2025-06-15 (after 14th) and 2025-07-15
        expect(result).toHaveLength(2);
        expect(result[0].date).toBe('2025-06-15');
        expect(result[1].date).toBe('2025-07-15');
      });

      it('should not generate entries before rule start date', () => {
        const engine = new ReconciliationEngine();
        const rules: CashFlowEvent[] = [
          createEvent({
            id: 'rule-1',
            type: 'once',
            onceDate: '2025-03-15',
            startDate: '2025-06-01', // Rule starts after the onceDate
          }),
        ];
        const lastReconciliation = createReconciliation({ date: '2025-05-01' });
        const result = engine.generatePendingEntries(rules, lastReconciliation, '2025-06-30');
        expect(result).toHaveLength(0);
      });

      it('should not generate entries after rule end date', () => {
        const engine = new ReconciliationEngine();
        const rules: CashFlowEvent[] = [
          createEvent({
            id: 'rule-1',
            type: 'monthly',
            monthlyDay: 15,
            startDate: '2025-01-01',
            endDate: '2025-05-31',
            amount: 500,
          }),
        ];
        // lastReconciliation is end of May, target is June - should not generate anything
        const lastReconciliation = createReconciliation({ date: '2025-05-31' });
        // Target date is June, but rule ended in May
        const result = engine.generatePendingEntries(rules, lastReconciliation, '2025-06-30');
        expect(result).toHaveLength(0);
      });
    });

    describe('createReconciliation', () => {
      it('should create reconciliation with expected balance calculated from entries', () => {
        const engine = new ReconciliationEngine();
        const entries = [
          { ruleId: 'rule-1', name: 'Income 1', amount: 1000, category: 'income' as const, date: '2025-06-01', source: 'rule' as const },
          { ruleId: 'rule-2', name: 'Expense 1', amount: 300, category: 'expense' as const, date: '2025-06-02', source: 'rule' as const },
        ];
        const lastReconciliation = createReconciliation({ balance: 5000 });

        const result = engine.createReconciliation('account-1', '2025-06-30', 5700, entries, lastReconciliation);

        expect(result.reconciliation.accountId).toBe('account-1');
        expect(result.reconciliation.balance).toBe(5700);
        expect(result.ledgerEntries).toHaveLength(2);
        // Expected: 5000 + (1000 - 300) = 5700, diff = 0
        expect(result.ledgerEntries.filter(e => e.source === 'adjustment')).toHaveLength(0);
      });

      it('should create adjustment entry when balance differs from expected', () => {
        const engine = new ReconciliationEngine();
        const entries = [
          { ruleId: 'rule-1', name: 'Income 1', amount: 1000, category: 'income' as const, date: '2025-06-01', source: 'rule' as const },
        ];
        const lastReconciliation = createReconciliation({ balance: 5000 });

        // Expected: 5000 + 1000 = 6000, but actual is 6200, diff = 200
        const result = engine.createReconciliation('account-1', '2025-06-30', 6200, entries, lastReconciliation);

        expect(result.reconciliation.balance).toBe(6200);
        const adjustment = result.ledgerEntries.find(e => e.source === 'adjustment');
        expect(adjustment).toBeDefined();
        expect(adjustment?.amount).toBe(200);
        expect(adjustment?.category).toBe('income'); // diff > 0 means income
      });

      it('should create expense adjustment when actual balance is less than expected', () => {
        const engine = new ReconciliationEngine();
        const entries = [
          { ruleId: 'rule-1', name: 'Income 1', amount: 1000, category: 'income' as const, date: '2025-06-01', source: 'rule' as const },
        ];
        const lastReconciliation = createReconciliation({ balance: 5000 });

        // Expected: 5000 + 1000 = 6000, but actual is 5800, diff = -200
        const result = engine.createReconciliation('account-1', '2025-06-30', 5800, entries, lastReconciliation);

        const adjustment = result.ledgerEntries.find(e => e.source === 'adjustment');
        expect(adjustment?.category).toBe('expense'); // diff < 0 means expense
        expect(adjustment?.amount).toBe(200);
      });

      it('should handle first reconciliation with no previous balance', () => {
        const engine = new ReconciliationEngine();
        const entries = [
          { name: 'Initial deposit', amount: 10000, category: 'income' as const, date: '2025-06-01', source: 'manual' as const },
        ];

        const result = engine.createReconciliation('account-1', '2025-06-30', 10000, entries, null);

        expect(result.reconciliation.balance).toBe(10000);
        expect(result.ledgerEntries).toHaveLength(1);
        expect(result.ledgerEntries[0].source).toBe('manual');
      });

      it('should include note in reconciliation', () => {
        const engine = new ReconciliationEngine();
        const result = engine.createReconciliation('account-1', '2025-06-30', 5000, [], null, 'Monthly reconciliation');

        expect(result.reconciliation.note).toBe('Monthly reconciliation');
      });
    });

    describe('recalculateAdjustment', () => {
      it('should remove old adjustment and recalculate based on new previous balance', () => {
        const engine = new ReconciliationEngine();
        const reconciliation = createReconciliation({ balance: 5000 });
        const existingEntries: LedgerEntry[] = [
          {
            id: 'entry-1',
            accountId: 'account-1',
            reconciliationId: 'recon-1',
            ruleId: 'rule-1',
            name: 'Income',
            amount: 1000,
            category: 'income',
            date: '2025-06-01',
            source: 'rule',
            createdAt: '2025-06-01T00:00:00Z',
            updatedAt: '2025-06-01T00:00:00Z',
          },
          {
            id: 'entry-2',
            accountId: 'account-1',
            reconciliationId: 'recon-1',
            name: '差额调整',
            amount: 200,
            category: 'income',
            date: '2025-06-30',
            source: 'adjustment',
            createdAt: '2025-06-01T00:00:00Z',
            updatedAt: '2025-06-01T00:00:00Z',
          },
        ];

        // With previous balance 4000 + income 1000 = 5000 expected, actual 5000, diff = 0
        const result = engine.recalculateAdjustment(reconciliation, existingEntries, 4000);

        expect(result).toHaveLength(1); // Only the rule entry, adjustment removed
        expect(result.every(e => e.source !== 'adjustment')).toBe(true);
      });

      it('should add new adjustment when diff arises from changed previous balance', () => {
        const engine = new ReconciliationEngine();
        const reconciliation = createReconciliation({ balance: 5000 });
        const existingEntries: LedgerEntry[] = [
          {
            id: 'entry-1',
            accountId: 'account-1',
            reconciliationId: 'recon-1',
            ruleId: 'rule-1',
            name: 'Income',
            amount: 1000,
            category: 'income',
            date: '2025-06-01',
            source: 'rule',
            createdAt: '2025-06-01T00:00:00Z',
            updatedAt: '2025-06-01T00:00:00Z',
          },
        ];

        // With previous balance 3500 + income 1000 = 4500 expected, actual 5000, diff = 500
        const result = engine.recalculateAdjustment(reconciliation, existingEntries, 3500);

        const adjustment = result.find(e => e.source === 'adjustment');
        expect(adjustment).toBeDefined();
        expect(adjustment?.amount).toBe(500);
        expect(adjustment?.category).toBe('income');
      });

      it('should handle entries with mixed categories', () => {
        const engine = new ReconciliationEngine();
        const reconciliation = createReconciliation({ balance: 3000 });
        const existingEntries: LedgerEntry[] = [
          {
            id: 'entry-1',
            accountId: 'account-1',
            reconciliationId: 'recon-1',
            ruleId: 'rule-1',
            name: 'Salary',
            amount: 5000,
            category: 'income',
            date: '2025-06-01',
            source: 'rule',
            createdAt: '2025-06-01T00:00:00Z',
            updatedAt: '2025-06-01T00:00:00Z',
          },
          {
            id: 'entry-2',
            accountId: 'account-1',
            reconciliationId: 'recon-1',
            ruleId: 'rule-2',
            name: 'Rent',
            amount: 2000,
            category: 'expense',
            date: '2025-06-02',
            source: 'rule',
            createdAt: '2025-06-01T00:00:00Z',
            updatedAt: '2025-06-01T00:00:00Z',
          },
        ];

        // Previous: 0, Net: 5000 - 2000 = 3000, Expected: 3000, Actual: 3000, diff = 0
        const result = engine.recalculateAdjustment(reconciliation, existingEntries, 0);

        expect(result.find(e => e.source === 'adjustment')).toBeUndefined();
      });
    });
  });
});