import { differenceInCalendarMonths, isAfter, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { CashFlowEvent } from '@/types/event';

const clampMonthlyExecutionDate = (target: Date, day: number): number => {
  const endOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return Math.min(day, endOfMonth);
};

const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

const normalizeYearlyDay = (date: Date, month: number, day: number): { month: number; day: number } => {
  if (month === 2 && day === 29 && !isLeapYear(date.getFullYear())) {
    return { month, day: 28 };
  }
  return { month, day };
};

export const isEventActiveOnDate = (event: CashFlowEvent, date: Date): boolean => {
  const start = startOfDay(parseISO(event.startDate));
  if (isBefore(date, start)) return false;

  if (event.endDate) {
    const end = startOfDay(parseISO(event.endDate));
    if (isAfter(date, end)) return false;
  }

  return true;
};

export const shouldEventOccurOnDate = (event: CashFlowEvent, date: Date): boolean => {
  switch (event.type) {
    case 'once': {
      const target = event.onceDate ? startOfDay(parseISO(event.onceDate)) : startOfDay(parseISO(event.startDate));
      return isSameDay(date, target);
    }
    case 'monthly': {
      if (!event.monthlyDay) return false;
      if (differenceInCalendarMonths(date, startOfDay(parseISO(event.startDate))) < 0) return false;
      const targetDay = clampMonthlyExecutionDate(date, event.monthlyDay);
      return date.getDate() === targetDay;
    }
    case 'quarterly': {
      if (!event.monthlyDay) return false;
      const diff = differenceInCalendarMonths(date, startOfDay(parseISO(event.startDate)));
      if (diff < 0 || diff % 3 !== 0) return false;
      const targetDay = clampMonthlyExecutionDate(date, event.monthlyDay);
      return date.getDate() === targetDay;
    }
    case 'semi-annual': {
      if (!event.monthlyDay) return false;
      const diff = differenceInCalendarMonths(date, startOfDay(parseISO(event.startDate)));
      if (diff < 0 || diff % 6 !== 0) return false;
      const targetDay = clampMonthlyExecutionDate(date, event.monthlyDay);
      return date.getDate() === targetDay;
    }
    case 'yearly': {
      if (!event.yearlyMonth || !event.yearlyDay) return false;
      const normalized = normalizeYearlyDay(date, event.yearlyMonth, event.yearlyDay);
      return date.getMonth() + 1 === normalized.month && date.getDate() === normalized.day;
    }
    default:
      return false;
  }
};
