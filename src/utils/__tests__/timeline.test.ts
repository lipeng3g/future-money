import { describe, expect, it } from 'vitest';
import { TimelineGenerator } from '@/utils/timeline';
import { ReconciliationEngine, computePeriodKey } from '@/utils/reconciliation';
import { isEventActiveOnDate, shouldEventOccurOnDate } from '@/utils/recurrence';
import type { CashFlowEvent } from '@/types/event';
import type { Reconciliation } from '@/types/reconciliation';
import { AnalyticsEngine } from '@/utils/analytics';

const createEvent = (overrides: Partial<CashFlowEvent> = {}): CashFlowEvent => ({
  id: 'evt-test',
  accountId: 'acc-1',
  name: '工资',
  amount: 2000,
  category: 'income',
  type: 'monthly',
  startDate: '2025-01-01',
  monthlyDay: 10,
  enabled: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const createReconciliation = (overrides: Partial<Reconciliation> = {}): Reconciliation => ({
  id: 'recon-1',
  accountId: 'acc-1',
  date: '2025-01-01',
  balance: 10000,
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('TimelineGenerator', () => {
  it('生成指定月份内的日度余额', () => {
    const generator = new TimelineGenerator();
    const events: CashFlowEvent[] = [
      createEvent(),
      createEvent({
        id: 'evt-expense',
        name: '房贷',
        amount: 3000,
        category: 'expense',
        monthlyDay: 20,
      }),
    ];

    const reconciliations: Reconciliation[] = [
      createReconciliation(),
    ];

    const timeline = generator.generate({
      events,
      reconciliations,
      ledgerEntries: [],
      eventOverrides: [],
      months: 2,
      today: '2025-01-01',
    });

    const salaryDays = timeline.filter((day) => day.events.some((e) => e.eventId === 'evt-test'));
    expect(salaryDays).toHaveLength(2); // Jan, Feb
    expect(salaryDays[0].date).toBe('2025-01-10');
    // First day is the frozen reconciliation point
    expect(timeline[0].balance).toBe(10000);
    expect(timeline[0].zone).toBe('frozen');
  });

  it('处理31号或2月月末的对齐', () => {
    const generator = new TimelineGenerator();
    const events: CashFlowEvent[] = [
      createEvent({ id: 'evt-31', monthlyDay: 31 }),
    ];

    const reconciliations: Reconciliation[] = [
      createReconciliation({ balance: 0 }),
    ];

    const timeline = generator.generate({
      events,
      reconciliations,
      ledgerEntries: [],
      eventOverrides: [],
      months: 2,
      today: '2025-01-01',
    });

    const jan = timeline.find((day) => day.date === '2025-01-31');
    const feb = timeline.find((day) => day.date === '2025-02-28');
    expect(jan?.events[0].eventId).toBe('evt-31');
    expect(feb?.events[0].eventId).toBe('evt-31');
  });

  it('预测区正确标识 zone', () => {
    const generator = new TimelineGenerator();
    const events: CashFlowEvent[] = [];
    const reconciliations: Reconciliation[] = [
      createReconciliation(),
    ];

    const timeline = generator.generate({
      events,
      reconciliations,
      ledgerEntries: [],
      eventOverrides: [],
      months: 1,
      today: '2025-01-01',
    });

    // 第一天是冻结区（对账点）
    expect(timeline[0].zone).toBe('frozen');
    // 后续天是预测区
    expect(timeline[1].zone).toBe('projected');
  });

  it('事件覆盖: skipped 跳过事件', () => {
    const generator = new TimelineGenerator();
    const events: CashFlowEvent[] = [
      createEvent(),
    ];
    const reconciliations: Reconciliation[] = [
      createReconciliation(),
    ];

    const timeline = generator.generate({
      events,
      reconciliations,
      ledgerEntries: [],
      eventOverrides: [
        {
          id: 'ov-1',
          accountId: 'acc-1',
          ruleId: 'evt-test',
          period: '2025-01',
          action: 'skipped',
          createdAt: '2025-01-01T00:00:00Z',
        },
      ],
      months: 2,
      today: '2025-01-01',
    });

    // Jan salary should be skipped
    const janSalary = timeline.filter(
      (d) => d.date === '2025-01-10' && d.events.some((e) => e.eventId === 'evt-test'),
    );
    expect(janSalary).toHaveLength(0);

    // Feb salary should still exist
    const febSalary = timeline.filter(
      (d) => d.date === '2025-02-10' && d.events.some((e) => e.eventId === 'evt-test'),
    );
    expect(febSalary).toHaveLength(1);
  });

  it('事件覆盖: modified 修改金额', () => {
    const generator = new TimelineGenerator();
    const events: CashFlowEvent[] = [
      createEvent(),
    ];
    const reconciliations: Reconciliation[] = [
      createReconciliation(),
    ];

    const timeline = generator.generate({
      events,
      reconciliations,
      ledgerEntries: [],
      eventOverrides: [
        {
          id: 'ov-2',
          accountId: 'acc-1',
          ruleId: 'evt-test',
          period: '2025-01',
          action: 'modified',
          amount: 5000,
          createdAt: '2025-01-01T00:00:00Z',
        },
      ],
      months: 2,
      today: '2025-01-01',
    });

    const janDay = timeline.find((d) => d.date === '2025-01-10');
    expect(janDay?.events[0].amount).toBe(5000);
    expect(janDay?.events[0].overrideAction).toBe('modified');
  });
});

describe('ReconciliationEngine', () => {
  it('生成待确认条目', () => {
    const engine = new ReconciliationEngine();
    const rules: CashFlowEvent[] = [
      createEvent(),
    ];
    const lastRecon = createReconciliation();

    const entries = engine.generatePendingEntries(rules, lastRecon, '2025-01-31');
    // Should find salary on Jan 10
    const salary = entries.find((e) => e.ruleId === 'evt-test');
    expect(salary).toBeDefined();
    expect(salary?.date).toBe('2025-01-10');
    expect(salary?.amount).toBe(2000);
  });

  it('创建对账记录并计算差额调整', () => {
    const engine = new ReconciliationEngine();
    const lastRecon = createReconciliation({ balance: 10000 });

    const { reconciliation, ledgerEntries } = engine.createReconciliation(
      'acc-1',
      '2025-01-31',
      12500,
      [
        { name: '工资', amount: 2000, category: 'income', date: '2025-01-10', source: 'rule' },
        { name: '房贷', amount: 3000, category: 'expense', date: '2025-01-20', source: 'rule' },
      ],
      lastRecon,
      '月末对账',
    );

    expect(reconciliation.balance).toBe(12500);
    expect(reconciliation.note).toBe('月末对账');

    // Expected: 10000 + 2000 - 3000 = 9000, actual 12500, diff = 3500
    const adjustment = ledgerEntries.find((e) => e.source === 'adjustment');
    expect(adjustment).toBeDefined();
    expect(adjustment?.amount).toBe(3500);
    expect(adjustment?.category).toBe('income');
  });

  it('无差额时不生成调整条目', () => {
    const engine = new ReconciliationEngine();
    const lastRecon = createReconciliation({ balance: 10000 });

    const { ledgerEntries } = engine.createReconciliation(
      'acc-1',
      '2025-01-31',
      9000, // exactly 10000 + 2000 - 3000
      [
        { name: '工资', amount: 2000, category: 'income', date: '2025-01-10', source: 'rule' },
        { name: '房贷', amount: 3000, category: 'expense', date: '2025-01-20', source: 'rule' },
      ],
      lastRecon,
    );

    const adjustment = ledgerEntries.find((e) => e.source === 'adjustment');
    expect(adjustment).toBeUndefined();
  });
});

describe('computePeriodKey', () => {
  it('monthly 返回 YYYY-MM', () => {
    const event = createEvent({ type: 'monthly' });
    expect(computePeriodKey(event, '2025-03-15')).toBe('2025-03');
  });

  it('yearly 返回 YYYY', () => {
    const event = createEvent({ type: 'yearly' });
    expect(computePeriodKey(event, '2025-06-01')).toBe('2025');
  });

  it('once 返回 YYYY-MM-DD', () => {
    const event = createEvent({ type: 'once' });
    expect(computePeriodKey(event, '2025-02-08')).toBe('2025-02-08');
  });
});

describe('recurrence helpers', () => {
  it('尊重 endDate，超出结束日期后不再生效', () => {
    const event = createEvent({ endDate: '2025-01-31' });
    expect(isEventActiveOnDate(event, new Date('2025-01-31T00:00:00'))).toBe(true);
    expect(isEventActiveOnDate(event, new Date('2025-02-01T00:00:00'))).toBe(false);
  });

  it('季度和半年事件只在对应间隔月触发', () => {
    const quarterly = createEvent({ type: 'quarterly', monthlyDay: 10, startDate: '2025-01-01' });
    const semiAnnual = createEvent({ type: 'semi-annual', monthlyDay: 10, startDate: '2025-01-01' });

    expect(shouldEventOccurOnDate(quarterly, new Date('2025-04-10T00:00:00'))).toBe(true);
    expect(shouldEventOccurOnDate(quarterly, new Date('2025-05-10T00:00:00'))).toBe(false);
    expect(shouldEventOccurOnDate(semiAnnual, new Date('2025-07-10T00:00:00'))).toBe(true);
    expect(shouldEventOccurOnDate(semiAnnual, new Date('2025-04-10T00:00:00'))).toBe(false);
  });

  it('年度 2/29 在平年自动落到 2/28', () => {
    const yearlyLeap = createEvent({ type: 'yearly', yearlyMonth: 2, yearlyDay: 29 });
    expect(shouldEventOccurOnDate(yearlyLeap, new Date('2025-02-28T00:00:00'))).toBe(true);
    expect(shouldEventOccurOnDate(yearlyLeap, new Date('2024-02-29T00:00:00'))).toBe(true);
  });
});

describe('AnalyticsEngine', () => {
  it('汇总月度收入支出与预警日期', () => {
    const generator = new TimelineGenerator();
    const events: CashFlowEvent[] = [
      createEvent(),
      createEvent({
        id: 'evt-expense',
        name: '消费',
        amount: 15000,
        category: 'expense',
        type: 'once',
        onceDate: '2025-01-15',
      }),
    ];

    const reconciliations: Reconciliation[] = [
      createReconciliation({ balance: 1000 }),
    ];

    const timeline = generator.generate({
      events,
      reconciliations,
      ledgerEntries: [],
      eventOverrides: [],
      months: 2,
      today: '2025-01-01',
    });

    const engine = new AnalyticsEngine();
    const summary = engine.generate(timeline, 500);
    expect(summary.months.length).toBeGreaterThan(0);
    expect(summary.totalExpense).toBe(15000);
    expect(summary.warningDates.length).toBeGreaterThan(0);
  });
});
