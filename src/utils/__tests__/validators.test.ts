import { describe, expect, it } from 'vitest';
import { isValidISODate, validateCashFlowEvent } from '@/utils/validators';
import type { CashFlowEvent } from '@/types/event';

const createEvent = (overrides: Partial<CashFlowEvent> = {}): Partial<CashFlowEvent> => ({
  id: 'evt-test',
  accountId: 'acc-1',
  name: '工资',
  amount: 5000,
  category: 'income',
  type: 'monthly',
  startDate: '2025-01-01',
  monthlyDay: 10,
  enabled: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('isValidISODate', () => {
  it('接受合法 YYYY-MM-DD 日期', () => {
    expect(isValidISODate('2025-02-28')).toBe(true);
  });

  it('拒绝不存在的自然日与非标准格式', () => {
    expect(isValidISODate('2025-02-30')).toBe(false);
    expect(isValidISODate('2025-2-8')).toBe(false);
    expect(isValidISODate('2025/02/08')).toBe(false);
  });

  it('拒绝夹带时间的字符串（避免误把 datetime 当 date）', () => {
    expect(isValidISODate('2025-02-28T00:00:00Z')).toBe(false);
  });
});

describe('validateCashFlowEvent', () => {
  it('接受合法的每月事件', () => {
    expect(validateCashFlowEvent(createEvent())).toEqual([]);
  });

  it('拒绝小数 monthlyDay', () => {
    const errors = validateCashFlowEvent(createEvent({ monthlyDay: 10.5 }));
    expect(errors).toContain('需要 1-31 的整数日期');
  });

  it('拒绝非法 yearly 月日组合', () => {
    const errors = validateCashFlowEvent(
      createEvent({
        type: 'yearly',
        monthlyDay: undefined,
        yearlyMonth: 4,
        yearlyDay: 31,
      }),
    );

    expect(errors).toContain('每年事件的月份和日期组合无效');
  });

  it('允许 yearly 事件使用 2 月 29 日', () => {
    const errors = validateCashFlowEvent(
      createEvent({
        type: 'yearly',
        monthlyDay: undefined,
        yearlyMonth: 2,
        yearlyDay: 29,
      }),
    );

    expect(errors).toEqual([]);
  });

  it('拒绝结束日期早于起始日期', () => {
    const errors = validateCashFlowEvent(
      createEvent({
        endDate: '2024-12-31',
      }),
    );

    expect(errors).toContain('结束日期不得早于起始日期');
  });

  it('当起始日期非法时，不应再进行结束日期早于起始日期的字符串比较', () => {
    const errors = validateCashFlowEvent(
      createEvent({
        startDate: '2025-02-30',
        endDate: '2024-12-31',
      }),
    );

    expect(errors).toContain('起始日期格式不正确');
    expect(errors).not.toContain('结束日期不得早于起始日期');
  });

  it('拒绝一次性事件日期早于起始日期', () => {
    const errors = validateCashFlowEvent(
      createEvent({
        type: 'once',
        onceDate: '2024-12-31',
      }),
    );

    expect(errors).toContain('一次性事件日期不得早于起始日期');
  });

  it('拒绝一次性事件日期晚于结束日期', () => {
    const errors = validateCashFlowEvent(
      createEvent({
        type: 'once',
        endDate: '2025-01-15',
        onceDate: '2025-01-20',
      }),
    );

    expect(errors).toContain('一次性事件日期不得晚于结束日期');
  });
});
