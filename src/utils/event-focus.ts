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
  occurrenceIndex: number;
  matchedDates: string[];
  title: string;
  summary: string;
  canFocusPrev: boolean;
  canFocusNext: boolean;
}

const buildEventChartFocusSummary = (date: string, occurrenceIndex: number, occurrenceCount: number): string => {
  if (occurrenceCount <= 1) {
    return `图表已跳到 ${date}，这是当前时间窗内唯一一次发生。`;
  }

  return `图表已跳到 ${date}（第 ${occurrenceIndex + 1} / ${occurrenceCount} 次发生，可继续切换查看前后日期）。`;
};

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
  preferredDate?: string,
): EventChartFocusState | null => {
  const matchedDates = timeline
    .filter((day) => day.events.some((item) => item.eventId === event.id))
    .map((day) => day.date);

  if (!matchedDates.length) return null;

  let occurrenceIndex = -1;

  if (preferredDate) {
    occurrenceIndex = matchedDates.indexOf(preferredDate);
  }

  if (occurrenceIndex < 0) {
    const todayIndex = timeline.findIndex((day) => day.isToday);
    if (todayIndex >= 0) {
      occurrenceIndex = matchedDates.findIndex((date) => timeline.findIndex((item) => item.date === date) >= todayIndex);
    }
  }

  if (occurrenceIndex < 0) {
    occurrenceIndex = 0;
  }

  const date = matchedDates[occurrenceIndex];
  const occurrenceCount = matchedDates.length;
  const title = `已定位到「${event.name}」`;

  return {
    eventId: event.id,
    date,
    occurrenceCount,
    occurrenceIndex,
    matchedDates,
    title,
    summary: buildEventChartFocusSummary(date, occurrenceIndex, occurrenceCount),
    canFocusPrev: occurrenceIndex > 0,
    canFocusNext: occurrenceIndex < occurrenceCount - 1,
  };
};

export const stepEventChartFocusState = (
  timeline: DailySnapshot[],
  event: CashFlowEvent,
  current: EventChartFocusState,
  direction: -1 | 1,
): EventChartFocusState | null => {
  const nextIndex = current.occurrenceIndex + direction;
  if (nextIndex < 0 || nextIndex >= current.matchedDates.length) {
    return current;
  }

  return buildEventChartFocusState(timeline, event, current.matchedDates[nextIndex]);
};
