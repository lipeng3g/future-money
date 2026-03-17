import { format, getDaysInMonth, isValid, parseISO } from 'date-fns';
import type { CashFlowEvent, RecurrenceType } from '@/types/event';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidISODate = (value?: string | null): boolean => {
  if (!value || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = parseISO(value);

  // `parseISO('YYYY-MM-DD')` creates a local Date; comparing to `format(parsed, ...)`
  // avoids edge cases where timezone offsets make `toISOString()` land on a different day.
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === value;
};

const isPositive = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value > 0;
const isIntegerInRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const isValidYearlyMonthDay = (month: number, day: number): boolean => {
  if (month === 2 && day === 29) {
    return true;
  }

  const maxDay = getDaysInMonth(new Date(2025, month - 1, 1));
  return day <= maxDay;
};

const recurrenceLabels: Record<RecurrenceType, string> = {
  once: '一次性',
  monthly: '每月',
  quarterly: '每季度',
  'semi-annual': '每半年',
  yearly: '每年',
};

export const validateCashFlowEvent = (event: Partial<CashFlowEvent>): string[] => {
  const errors: string[] = [];

  if (!event.name || !event.name.trim()) {
    errors.push('事件名称不能为空');
  }

  if (!isPositive(event.amount ?? 0)) {
    errors.push('金额必须大于 0');
  }

  if (!event.category || !['income', 'expense'].includes(event.category)) {
    errors.push('请选择收入或支出');
  }

  if (!event.type || !['once', 'monthly', 'quarterly', 'semi-annual', 'yearly'].includes(event.type)) {
    errors.push('请选择合法的重复类型');
  }

  if (!isValidISODate(event.startDate)) {
    errors.push('起始日期格式不正确');
  }

  if (event.endDate && !isValidISODate(event.endDate)) {
    errors.push('结束日期格式不正确');
  }

  if (event.endDate && event.startDate && event.endDate < event.startDate) {
    errors.push('结束日期不得早于起始日期');
  }

  switch (event.type) {
    case 'once':
      if (!isValidISODate(event.onceDate)) {
        errors.push('一次性事件需要有效日期');
      }
      if (event.onceDate && event.startDate && event.onceDate < event.startDate) {
        errors.push('一次性事件日期不得早于起始日期');
      }
      if (event.onceDate && event.endDate && event.onceDate > event.endDate) {
        errors.push('一次性事件日期不得晚于结束日期');
      }
      break;
    case 'monthly':
    case 'quarterly':
    case 'semi-annual':
      if (!isIntegerInRange(event.monthlyDay, 1, 31)) {
        errors.push('需要 1-31 的整数日期');
      }
      break;
    case 'yearly':
      if (!isIntegerInRange(event.yearlyMonth, 1, 12)) {
        errors.push('每年事件需要 1-12 的月份');
      }
      if (!isIntegerInRange(event.yearlyDay, 1, 31)) {
        errors.push('每年事件需要 1-31 的日期');
      }
      const hasValidYearlyMonth = isIntegerInRange(event.yearlyMonth, 1, 12);
      const hasValidYearlyDay = isIntegerInRange(event.yearlyDay, 1, 31);
      if (
        hasValidYearlyMonth
        && hasValidYearlyDay
        && !isValidYearlyMonthDay(event.yearlyMonth as number, event.yearlyDay as number)
      ) {
        errors.push('每年事件的月份和日期组合无效');
      }
      break;
  }

  if (errors.length === 0 && event.type && event.category) {
    const label = recurrenceLabels[event.type as RecurrenceType];
    if (!label) {
      errors.push('重复类型不支持');
    }
  }

  return errors;
};
