import { addYears, format, getDaysInMonth, isAfter, isValid, parseISO, startOfDay } from 'date-fns';
import type { CashFlowEvent, EventFormValues } from '@/types/event';
import { isEventActiveOnDate, shouldEventOccurOnDate } from '@/utils/recurrence';
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

export interface EventSchedulePreviewItem {
  date: string;
  label: string;
}

export interface EventFormVisibleSections {
  showOnceDate: boolean;
  showMonthlyDay: boolean;
  showYearlyFields: boolean;
}

export interface EventFormDateFeedback {
  startDateHint: EventFormSemanticHint | null;
  endDateHint: EventFormSemanticHint | null;
  onceDateHint: EventFormSemanticHint | null;
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

export const getEventFormVisibleSections = (type: EventFormValues['type']): EventFormVisibleSections => ({
  showOnceDate: type === 'once',
  showMonthlyDay: type === 'monthly' || type === 'quarterly' || type === 'semi-annual',
  showYearlyFields: type === 'yearly',
});

export const getEventFormDateFeedback = (draft: Pick<EventFormDraft, 'type' | 'startDate' | 'endDate' | 'onceDate'>): EventFormDateFeedback => {
  const startDateHint: EventFormSemanticHint | null = draft.endDate && draft.startDate && draft.startDate > draft.endDate
    ? { level: 'error', message: '起始日期不能晚于结束日期。' }
    : null;

  const endDateHint: EventFormSemanticHint | null = draft.endDate && draft.startDate && draft.endDate < draft.startDate
    ? { level: 'error', message: '结束日期不能早于起始日期。' }
    : null;

  const onceDateHint: EventFormSemanticHint | null = draft.type === 'once' && draft.onceDate
    ? (() => {
      if (draft.startDate && draft.onceDate < draft.startDate) {
        return { level: 'error', message: '发生日期不能早于起始日期。' };
      }
      if (draft.endDate && draft.onceDate > draft.endDate) {
        return { level: 'error', message: '发生日期不能晚于结束日期。' };
      }
      return null;
    })()
    : null;

  return {
    startDateHint,
    endDateHint,
    onceDateHint,
  };
};

export const applyEventTypeDefaults = (draft: EventFormDraft, nextType: EventFormValues['type'], today: string): EventFormDraft => {
  const next: EventFormDraft = {
    ...draft,
    type: nextType,
  };

  if (nextType === 'once' && !next.onceDate) {
    next.onceDate = today;
  }

  if ((nextType === 'monthly' || nextType === 'quarterly' || nextType === 'semi-annual') && !next.monthlyDay) {
    next.monthlyDay = 1;
  }

  if (nextType === 'yearly') {
    if (!next.yearlyMonth) next.yearlyMonth = 1;
    if (!next.yearlyDay) next.yearlyDay = 1;
  }

  return next;
};

const buildPreviewEvent = (draft: EventFormDraft): CashFlowEvent => ({
  id: '__preview__',
  accountId: '__preview__',
  name: draft.name.trim() || '该规则',
  amount: Number(draft.amount) || 0,
  category: draft.category,
  type: draft.type,
  startDate: draft.startDate,
  endDate: draft.endDate,
  onceDate: draft.onceDate,
  monthlyDay: draft.monthlyDay,
  yearlyMonth: draft.yearlyMonth,
  yearlyDay: draft.yearlyDay,
  notes: draft.notes?.trim() || undefined,
  color: draft.color,
  enabled: draft.enabled,
  createdAt: '',
  updatedAt: '',
});

const buildPreviewLabel = (event: CashFlowEvent, date: Date): string => {
  switch (event.type) {
    case 'once':
      return '一次性发生';
    case 'monthly':
      return `每月第 ${date.getDate()} 天`;
    case 'quarterly':
      return `季度执行 · 本次落在 ${date.getDate()} 日`;
    case 'semi-annual':
      return `半年执行 · 本次落在 ${date.getDate()} 日`;
    case 'yearly': {
      if (event.yearlyMonth === 2 && event.yearlyDay === 29 && date.getDate() === 28) {
        return '平年回退到 2 月 28 日';
      }
      return `每年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
    }
    default:
      return format(date, 'yyyy-MM-dd');
  }
};

export const buildEventSchedulePreview = (
  draft: EventFormDraft,
  count: number = 3,
  anchorDate?: string,
): EventSchedulePreviewItem[] => {
  const normalized = normalizeEventFormPayload(draft);
  const errors = getEventFormValidationErrors(normalized);
  if (errors.length || !normalized.enabled || count <= 0) {
    return [];
  }

  const event = buildPreviewEvent(normalized);
  const start = startOfDay(parseISO(event.startDate));
  const anchor = anchorDate ? startOfDay(parseISO(anchorDate)) : startOfDay(new Date());
  const effectiveStart = isValid(anchor) && isAfter(anchor, start) ? anchor : start;
  const hardEnd = event.endDate ? startOfDay(parseISO(event.endDate)) : addYears(effectiveStart, 5);
  const results: EventSchedulePreviewItem[] = [];

  for (
    let cursor = effectiveStart;
    !isAfter(cursor, hardEnd) && results.length < count;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    if (!isEventActiveOnDate(event, cursor)) continue;
    if (!shouldEventOccurOnDate(event, cursor)) continue;

    results.push({
      date: format(cursor, 'yyyy-MM-dd'),
      label: buildPreviewLabel(event, cursor),
    });
  }

  return results;
};
