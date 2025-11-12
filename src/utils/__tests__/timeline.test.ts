import { describe, expect, it } from 'vitest';
import { TimelineGenerator } from '@/utils/timeline';
import type { CashFlowEvent } from '@/types/event';
import { AnalyticsEngine } from '@/utils/analytics';

const createEvent = (overrides: Partial<CashFlowEvent> = {}): CashFlowEvent => ({
  id: 'evt-test',
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

    const timeline = generator.generate({
      initialBalance: 10000,
      events,
      startDate: '2025-01-01',
      months: 2,
    });

    const salaryDays = timeline.filter((day) => day.events.some((e) => e.eventId === 'evt-test'));
    expect(salaryDays).toHaveLength(2); // Jan, Feb
    expect(salaryDays[0].date).toBe('2025-01-10');
    expect(timeline[0].balance).toBe(10000);
  });

  it('处理31号或2月月末的对齐', () => {
    const generator = new TimelineGenerator();
    const events: CashFlowEvent[] = [
      createEvent({ id: 'evt-31', monthlyDay: 31 }),
    ];

    const timeline = generator.generate({
      initialBalance: 0,
      events,
      startDate: '2025-01-01',
      months: 2,
    });

    const jan = timeline.find((day) => day.date === '2025-01-31');
    const feb = timeline.find((day) => day.date === '2025-02-28');
    expect(jan?.events[0].eventId).toBe('evt-31');
    expect(feb?.events[0].eventId).toBe('evt-31');
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

    const timeline = generator.generate({
      initialBalance: 1000,
      events,
      startDate: '2025-01-01',
      months: 2,
    });

    const engine = new AnalyticsEngine();
    const summary = engine.generate(timeline, 500);
    expect(summary.months.length).toBeGreaterThan(0);
    expect(summary.totalExpense).toBe(15000);
    expect(summary.warningDates.length).toBeGreaterThan(0);
  });
});
