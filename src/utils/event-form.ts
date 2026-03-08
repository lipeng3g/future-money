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
