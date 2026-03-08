import type { CashFlowEvent } from '@/types/event';
import type { DailySnapshot } from '@/types/timeline';

export interface EventListFocusState {
  sourceDate: string;
  eventIds: string[];
  accountIds: string[];
  title: string;
  summary: string;
}

export interface EventChartFocusState {
  eventId: string;
  date: string;
  occurrenceCount: number;
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

export const buildEventChartFocusState = (
  timeline: DailySnapshot[],
  event: CashFlowEvent,
): EventChartFocusState | null => {
  const matchedDays = timeline.filter((day) => day.events.some((item) => item.eventId === event.id));
  if (!matchedDays.length) return null;

  const todayIndex = timeline.findIndex((day) => day.isToday);
  const nextMatchedDay = todayIndex >= 0
    ? matchedDays.find((day) => timeline.findIndex((item) => item.date === day.date) >= todayIndex)
    : null;
  const focusedDay = nextMatchedDay ?? matchedDays[0];
  const occurrenceCount = matchedDays.length;
  const title = `已定位到「${event.name}」`;
  const summary = occurrenceCount > 1
    ? `图表已跳到 ${focusedDay.date}（当前时间窗内共 ${occurrenceCount} 次发生，可继续拖动查看其它日期）。`
    : `图表已跳到 ${focusedDay.date}，这是当前时间窗内唯一一次发生。`;

  return {
    eventId: event.id,
    date: focusedDay.date,
    occurrenceCount,
    title,
    summary,
  };
};
