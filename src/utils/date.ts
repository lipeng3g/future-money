import { addDays, addMonths, endOfMonth, format, isSameDay, isWeekend, parseISO, setHours, startOfDay } from 'date-fns';

export const toISODate = (date: Date): string => format(date, 'yyyy-MM-dd');

/**
 * 基于本地时区格式化日期，避免 toISOString() 在 UTC 下造成的跨日偏移。
 */
export const formatLocalISODate = (date: Date = new Date()): string => format(date, 'yyyy-MM-dd');

export const parseISODate = (value: string): Date => startOfDay(parseISO(value));

export const addMonthsSafe = (date: Date, months: number): Date => addMonths(date, months);

export const addDaysSafe = (date: Date, days: number): Date => addDays(date, days);

export const isSameISODate = (left: Date, right: Date): boolean => isSameDay(left, right);

export const isWeekendDate = (date: Date): boolean => isWeekend(date);

export const todayStart = (): Date => startOfDay(setHours(new Date(), 0));

export const clampMonthlyDay = (date: Date, desiredDay: number): number => {
  const lastDay = endOfMonth(date).getDate();
  return Math.min(desiredDay, lastDay);
};
