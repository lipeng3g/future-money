import { describe, expect, it } from 'vitest';
import {
  applyEventTypeDefaults,
  buildEventSchedulePreview,
  clampEventFormDates,
  getEventFormValidationErrors,
  getEventFormVisibleSections,
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

  it('会根据频率切换决定表单应展示的字段区块', () => {
    expect(getEventFormVisibleSections('once')).toEqual({
      showOnceDate: true,
      showMonthlyDay: false,
      showYearlyFields: false,
    });

    expect(getEventFormVisibleSections('monthly')).toEqual({
      showOnceDate: false,
      showMonthlyDay: true,
      showYearlyFields: false,
    });

    expect(getEventFormVisibleSections('yearly')).toEqual({
      showOnceDate: false,
      showMonthlyDay: false,
      showYearlyFields: true,
    });
  });

  it('频率切换时会自动补齐对应字段的默认值，但不会覆盖已有输入', () => {
    expect(applyEventTypeDefaults(createDraft({ onceDate: undefined }), 'once', '2026-03-09').onceDate).toBe('2026-03-09');
    expect(applyEventTypeDefaults(createDraft({ monthlyDay: undefined }), 'quarterly', '2026-03-09').monthlyDay).toBe(1);
    expect(applyEventTypeDefaults(createDraft({ yearlyMonth: undefined, yearlyDay: undefined }), 'yearly', '2026-03-09')).toMatchObject({
      yearlyMonth: 1,
      yearlyDay: 1,
    });
    expect(applyEventTypeDefaults(createDraft({ monthlyDay: 18 }), 'monthly', '2026-03-09').monthlyDay).toBe(18);
  });

  it('会给每月规则预演最近几次发生日期，并显示短月月末降级后的真实日期', () => {
    expect(buildEventSchedulePreview(createDraft({
      type: 'monthly',
      startDate: '2026-01-30',
      endDate: '2026-04-30',
      onceDate: undefined,
      monthlyDay: 31,
    }), 3, '2026-01-30')).toEqual([
      { date: '2026-01-31', label: '每月第 31 天' },
      { date: '2026-02-28', label: '每月第 28 天' },
      { date: '2026-03-31', label: '每月第 31 天' },
    ]);
  });

  it('会给 2/29 年度规则预演平年回退结果', () => {
    expect(buildEventSchedulePreview(createDraft({
      type: 'yearly',
      startDate: '2025-01-01',
      endDate: '2028-12-31',
      onceDate: undefined,
      monthlyDay: undefined,
      yearlyMonth: 2,
      yearlyDay: 29,
    }), 4, '2025-01-01')).toEqual([
      { date: '2025-02-28', label: '平年回退到 2 月 28 日' },
      { date: '2026-02-28', label: '平年回退到 2 月 28 日' },
      { date: '2027-02-28', label: '平年回退到 2 月 28 日' },
      { date: '2028-02-29', label: '每年 2 月 29 日' },
    ]);
  });

  it('会从业务今天开始预演，而不是把历史发生日混进“接下来”里', () => {
    expect(buildEventSchedulePreview(createDraft({
      type: 'monthly',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      onceDate: undefined,
      monthlyDay: 15,
    }), 3, '2026-03-20')).toEqual([
      { date: '2026-04-15', label: '每月第 15 天' },
      { date: '2026-05-15', label: '每月第 15 天' },
      { date: '2026-06-15', label: '每月第 15 天' },
    ]);
  });

  it('锚点早于开始日期时，仍会从规则开始日往后预演', () => {
    expect(buildEventSchedulePreview(createDraft({
      type: 'once',
      startDate: '2026-03-10',
      endDate: '2026-03-20',
      onceDate: '2026-03-12',
    }), 3, '2026-03-01')).toEqual([
      { date: '2026-03-12', label: '一次性发生' },
    ]);
  });

  it('遇到未启用或无效规则时不输出预演结果', () => {
    expect(buildEventSchedulePreview(createDraft({ enabled: false }), 3)).toEqual([]);
    expect(buildEventSchedulePreview(createDraft({ type: 'yearly', onceDate: undefined, monthlyDay: undefined, yearlyMonth: 4, yearlyDay: 31 }), 3)).toEqual([]);
  });
});
