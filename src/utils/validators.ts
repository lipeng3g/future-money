import { isValid, parseISO } from 'date-fns';
import type { CashFlowEvent, RecurrenceType } from '@/types/event';

export const isValidISODate = (value?: string | null): boolean => {
  if (!value) return false;
  const parsed = parseISO(value);
  return isValid(parsed) && value.length === 10;
};

const isPositive = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value > 0;

const recurrenceLabels: Record<RecurrenceType, string> = {
  once: '一次性',
  monthly: '每月',
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

  if (!event.type || !['once', 'monthly', 'yearly'].includes(event.type)) {
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
      break;
    case 'monthly':
      if (!event.monthlyDay || event.monthlyDay < 1 || event.monthlyDay > 31) {
        errors.push('每月事件需要 1-31 的日期');
      }
      break;
    case 'yearly':
      if (!event.yearlyMonth || event.yearlyMonth < 1 || event.yearlyMonth > 12) {
        errors.push('每年事件需要 1-12 的月份');
      }
      if (!event.yearlyDay || event.yearlyDay < 1 || event.yearlyDay > 31) {
        errors.push('每年事件需要 1-31 的日期');
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
