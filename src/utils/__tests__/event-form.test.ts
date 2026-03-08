import { describe, expect, it } from 'vitest';
import {
  clampEventFormDates,
  getEventFormValidationErrors,
  getMonthlyRuleSemanticHint,
  getYearlyRuleSemanticHint,
  isEndDateSelectable,
  isOnceDateSelectable,
  isStartDateSelectable,
  normalizeEventFormPayload,
  type EventFormDraft,
} from '@/utils/event-form';

const createDraft = (overrides: Partial<EventFormDraft> = {}): EventFormDraft => ({
  name: '  工资到账  ',
  amount: 12000,
  category: 'income',
  type: 'once',
  startDate: '2026-03-10',
  endDate: '2026-03-20',
  onceDate: '2026-03-08',
  monthlyDay: 10,
  yearlyMonth: 3,
  yearlyDay: 8,
  notes: '  税后  ',
  color: '#3b82f6',
  enabled: true,
  ...overrides,
});

describe('event-form helpers', () => {
  it('会把一次性事件日期夹在起止日期之间，并自动修正倒挂的结束日期', () => {
    const normalized = clampEventFormDates(createDraft({
      startDate: '2026-03-10',
      endDate: '2026-03-05',
      onceDate: '2026-03-01',
    }));

    expect(normalized.endDate).toBe('2026-03-10');
    expect(normalized.onceDate).toBe('2026-03-10');
  });

  it('提交前会裁剪名称/备注空白并保留结构化字段', () => {
    expect(normalizeEventFormPayload(createDraft())).toMatchObject({
      name: '工资到账',
      notes: '税后',
      amount: 12000,
      type: 'once',
    });
  });

  it('会复用业务校验，阻止无效每年日期组合', () => {
    const errors = getEventFormValidationErrors(createDraft({
      type: 'yearly',
      onceDate: undefined,
      monthlyDay: undefined,
      yearlyMonth: 4,
      yearlyDay: 31,
    }));

    expect(errors).toContain('每年事件的月份和日期组合无效');
  });

  it('日期可选范围判断与表单约束保持一致', () => {
    expect(isStartDateSelectable('2026-03-08', '2026-03-10')).toBe(true);
    expect(isStartDateSelectable('2026-03-12', '2026-03-10')).toBe(false);

    expect(isEndDateSelectable('2026-03-12', '2026-03-10')).toBe(true);
    expect(isEndDateSelectable('2026-03-08', '2026-03-10')).toBe(false);

    expect(isOnceDateSelectable('2026-03-15', '2026-03-10', '2026-03-20')).toBe(true);
    expect(isOnceDateSelectable('2026-03-08', '2026-03-10', '2026-03-20')).toBe(false);
    expect(isOnceDateSelectable('2026-03-21', '2026-03-10', '2026-03-20')).toBe(false);
  });

  it('会提前提示每月高日期在短月自动落月末', () => {
    expect(getMonthlyRuleSemanticHint(31)).toMatchObject({
      level: 'info',
      message: '遇到没有 31 日的月份时，会自动落在当月最后一天。',
    });
    expect(getMonthlyRuleSemanticHint(15)).toBeNull();
  });

  it('会提前提示每年 2/29 的平年降级与无效月日组合', () => {
    expect(getYearlyRuleSemanticHint(2, 29)).toMatchObject({
      level: 'info',
      message: '闰年按 2 月 29 日执行；平年会自动按 2 月 28 日执行。',
    });

    expect(getYearlyRuleSemanticHint(4, 31)).toMatchObject({
      level: 'error',
      message: '4 月没有 31 日，请调整为该月存在的日期。',
    });
  });
});
