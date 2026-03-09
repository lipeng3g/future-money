import type { EventOccurrence, DailySnapshot } from '@/types/timeline';
import { getUpcomingCutoffDate } from '@/utils/upcoming';

export interface UpcomingItem {
  id: string;
  eventId: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  period?: string;
  overrideId?: string;
  overrideAction?: string;
}

export const DEFAULT_UPCOMING_ITEM_LIMIT = 18;

const compareUpcomingEvents = (a: EventOccurrence, b: EventOccurrence) => {
  if (a.category !== b.category) {
    return a.category === 'expense' ? -1 : 1;
  }
  if (a.amount !== b.amount) {
    return b.amount - a.amount;
  }
  return a.name.localeCompare(b.name, 'zh-CN');
};

export const buildUpcomingItems = (
  timeline: DailySnapshot[],
  today: string,
  options?: { daysAhead?: number; limit?: number },
): UpcomingItem[] => {
  const cutoffStr = getUpcomingCutoffDate(today, options?.daysAhead);
  const limit = options?.limit ?? DEFAULT_UPCOMING_ITEM_LIMIT;

  const filteredDays = timeline
    .filter((day) => day.date >= today && day.date <= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const items: UpcomingItem[] = [];

  for (const day of filteredDays) {
    const sortedEvents = [...day.events].sort(compareUpcomingEvents);
    for (const event of sortedEvents) {
      items.push({
        id: `${event.id}-${day.date}`,
        eventId: event.eventId,
        name: event.name,
        amount: event.amount,
        category: event.category,
        date: day.date,
        period: event.period,
        overrideId: event.overrideId,
        overrideAction: event.overrideAction,
      });

      if (items.length >= limit) {
        return items;
      }
    }
  }

  return items;
};
