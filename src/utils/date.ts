import { addDays, addMonths, format, isSameDay, isWeekend, parseISO, setHours, startOfDay } from 'date-fns';

export const toISODate = (date: Date): string => format(date, 'yyyy-MM-dd');

export const parseISODate = (value: string): Date => startOfDay(parseISO(value));

export const addMonthsSafe = (date: Date, months: number): Date => addMonths(date, months);

export const addDaysSafe = (date: Date, days: number): Date => addDays(date, days);

export const isSameISODate = (left: Date, right: Date): boolean => isSameDay(left, right);

export const isWeekendDate = (date: Date): boolean => isWeekend(date);

export const todayStart = (): Date => startOfDay(setHours(new Date(), 0));

export const clampMonthlyDay = (date: Date, desiredDay: number): number => {
  const endOfMonth = addDays(startOfDay(addMonths(date, 1)), -1).getDate();
  return Math.min(desiredDay, endOfMonth);
};
