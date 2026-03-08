import { addDaysSafe, parseISODate, toISODate } from '@/utils/date';

export const getUpcomingCutoffDate = (today: string, daysAhead = 60): string => {
  return toISODate(addDaysSafe(parseISODate(today), daysAhead));
};
