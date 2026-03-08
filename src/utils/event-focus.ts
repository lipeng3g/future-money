import type { CashFlowEvent } from '@/types/event';
import type { DailySnapshot } from '@/types/timeline';

export interface EventListFocusState {
  sourceDate: string;
  eventIds: string[];
  accountIds: string[];
  title: string;
  summary: string;
}

export const buildEventListFocusState = (
  timeline: DailySnapshot[],
  events: CashFlowEvent[],
  sourceDate: string,
): EventListFocusState | null => {
  const day = timeline.find((item) => item.date === sourceDate);
  if (!day?.events.length) return null;

  const uniqueEventIds = Array.from(new Set(day.events.map((event) => event.eventId).filter(Boolean)));
  if (!uniqueEventIds.length) return null;

  const matchedEvents = uniqueEventIds
    .map((eventId) => events.find((event) => event.id === eventId))
    .filter((event): event is CashFlowEvent => Boolean(event));

  const accountIds = Array.from(new Set(matchedEvents.map((event) => event.accountId).filter(Boolean)));
  const title = `${sourceDate} 对应规则事件`;
  const summary = matchedEvents.length
    ? `已定位 ${matchedEvents.length} 条规则事件：${matchedEvents.map((event) => event.name).join('、')}`
    : `已定位 ${uniqueEventIds.length} 条事件发生记录`;

  return {
    sourceDate,
    eventIds: uniqueEventIds,
    accountIds,
    title,
    summary,
  };
};
