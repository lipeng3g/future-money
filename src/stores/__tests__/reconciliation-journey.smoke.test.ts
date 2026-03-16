import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFinanceStore } from '@/stores/finance';

/**
 * 这条 smoke 用于锁住 README「最小闭环」：
 * 录入事件 → 首次对账 → 生成未来时间线（含事件日期与余额变化）
 */
describe('reconciliation journey smoke', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
  });

  it('can add an event, reconcile once, and see projected timeline events + balances', () => {
    const store = useFinanceStore();

    // 固定业务今天，避免测试受系统日期影响
    store.setSimulatedToday('2026-03-01');

    store.addEvent({
      name: '工资',
      amount: 10000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });

    // 完成首次对账：对账日 == 业务今天（needsReconciliation 应为 false）
    store.reconcile('2026-03-01', 1000, [], '首次对账');
    expect(store.needsReconciliation).toBe(false);

    // 时间线应包含冻结区的对账日，以及未来预测区。
    const reconDay = store.timeline.find((snap) => snap.date === '2026-03-01');
    expect(reconDay).toBeTruthy();
    expect(reconDay?.zone).toBe('frozen');
    expect(reconDay?.isToday).toBe(true);

    // 预测区应在 2026-03-10 命中「工资」事件，且余额应被正确累加。
    const salaryDay = store.timeline.find((snap) => snap.date === '2026-03-10');
    expect(salaryDay).toBeTruthy();
    expect(salaryDay?.zone).toBe('projected');
    expect(salaryDay?.events.map((e) => e.name)).toContain('工资');
    expect(salaryDay?.change).toBe(10000);
    expect(salaryDay?.balance).toBe(11000);

    // 推进业务今天：对账日 < 今天，则需要对账。
    store.setSimulatedToday('2026-03-20');
    expect(store.needsReconciliation).toBe(true);
  });
});
