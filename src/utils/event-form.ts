import { getDaysInMonth } from 'date-fns';
import type { EventFormValues } from '@/types/event';
import { validateCashFlowEvent } from '@/utils/validators';

export interface EventFormDraft {
  name: string;
  amount: number;
  category: EventFormValues['category'];
  type: EventFormValues['type'];
  startDate: string;
  endDate?: string;
  onceDate?: string;
  monthlyDay?: number;
  yearlyMonth?: number;
  yearlyDay?: number;
  notes?: string;
  color?: string;
  enabled: boolean;
}

export interface EventFormSemanticHint {
  level: 'info' | 'warning' | 'error';
  message: string;
}

const clampDateRange = (date: string | undefined, min?: string, max?: string): string | undefined => {
  if (!date) return date;
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
};

export const clampEventFormDates = (draft: EventFormDraft): EventFormDraft => {
  const next: EventFormDraft = {
    ...draft,
  };

  if (next.endDate && next.startDate && next.endDate < next.startDate) {
    next.endDate = next.startDate;
  }

  if (next.type === 'once') {
    next.onceDate = clampDateRange(next.onceDate, next.startDate, next.endDate);
  }

  return next;
};

export const normalizeEventFormPayload = (draft: EventFormDraft): EventFormValues => {
  const normalized = clampEventFormDates({
    ...draft,
    name: draft.name.trim(),
    notes: draft.notes?.trim() || undefined,
  });

  return {
    name: normalized.name,
    amount: Number(normalized.amount) || 0,
    category: normalized.category,
    type: normalized.type,
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    onceDate: normalized.onceDate,
    monthlyDay: normalized.monthlyDay,
    yearlyMonth: normalized.yearlyMonth,
    yearlyDay: normalized.yearlyDay,
    notes: normalized.notes,
    color: normalized.color,
    enabled: normalized.enabled,
  };
};

export const getEventFormValidationErrors = (draft: EventFormDraft): string[] => {
  return validateCashFlowEvent(normalizeEventFormPayload(draft));
};

export const isStartDateSelectable = (date: string, endDate?: string): boolean => {
  return !endDate || date <= endDate;
};

export const isEndDateSelectable = (date: string, startDate?: string): boolean => {
  return !startDate || date >= startDate;
};

export const isOnceDateSelectable = (date: string, startDate?: string, endDate?: string): boolean => {
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
};

const isIntegerInRange = (value: unknown, min: number, max: number): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
};

const isValidYearlyMonthDay = (month: number, day: number): boolean => {
  if (month === 2 && day === 29) {
    return true;
  }

  return day <= getDaysInMonth(new Date(2025, month - 1, 1));
};

export const getMonthlyRuleSemanticHint = (day?: number): EventFormSemanticHint | null => {
  if (!isIntegerInRange(day, 1, 31)) {
    return null;
  }

  if (day <= 28) {
    return null;
  }

  if (day === 29) {
    return {
      level: 'info',
      message: '遇到没有 29 日的月份时，会自动落在当月最后一天。',
    };
  }

  return {
    level: 'info',
    message: `遇到没有 ${day} 日的月份时，会自动落在当月最后一天。`,
  };
};

export const getYearlyRuleSemanticHint = (month?: number, day?: number): EventFormSemanticHint | null => {
  if (!isIntegerInRange(month, 1, 12) || !isIntegerInRange(day, 1, 31)) {
    return null;
  }

  if (!isValidYearlyMonthDay(month, day)) {
    return {
      level: 'error',
      message: `${month} 月没有 ${day} 日，请调整为该月存在的日期。`,
    };
  }

  if (month === 2 && day === 29) {
    return {
      level: 'info',
      message: '闰年按 2 月 29 日执行；平年会自动按 2 月 28 日执行。',
    };
  }

  return null;
};
