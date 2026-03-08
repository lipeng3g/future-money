import type { DailySnapshot, EventOccurrence } from '@/types';

const buildTimelineDateIndex = (timeline: DailySnapshot[]): Map<string, DailySnapshot> => {
  const index = new Map<string, DailySnapshot>();
  timeline.forEach((snapshot) => {
    index.set(snapshot.date, snapshot);
  });
  return index;
};

export const aggregateAccountTimelines = (
  timelinesByAccount: Record<string, DailySnapshot[]>,
  selectedAccountIds: string[],
): DailySnapshot[] => {
  const normalizedAccountIds = selectedAccountIds.filter((accountId) => Boolean(timelinesByAccount[accountId]?.length));
  if (!normalizedAccountIds.length) return [];

  const allDates = new Set<string>();
  const indexedTimelines = normalizedAccountIds.map((accountId) => {
    const timeline = timelinesByAccount[accountId] ?? [];
    timeline.forEach((snapshot) => allDates.add(snapshot.date));
    return {
      accountId,
      index: buildTimelineDateIndex(timeline),
    };
  });

  return Array.from(allDates)
    .sort()
    .map((date) => {
      let balance = 0;
      let change = 0;
      const events: EventOccurrence[] = [];
      let isWeekend = false;
      let isToday = false;
      let zone: 'frozen' | 'projected' = 'projected';
      let reconciliationId: string | undefined;
      let snapshotId: string | undefined;

      indexedTimelines.forEach(({ accountId, index }) => {
        const day = index.get(date);
        if (!day) return;

        balance += day.balance;
        change += day.change;
        events.push(
          ...day.events.map((event) => ({
            ...event,
            accountId: event.accountId ?? accountId,
          })),
        );
        isWeekend ||= day.isWeekend;
        isToday ||= day.isToday;
        if (day.zone === 'frozen') {
          zone = 'frozen';
        }
        reconciliationId ??= day.reconciliationId;
        snapshotId ??= day.snapshotId;
      });

      return {
        date,
        balance,
        change,
        events,
        isWeekend,
        isToday,
        zone,
        reconciliationId,
        snapshotId,
      };
    });
};
