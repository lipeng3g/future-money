import type { DailySnapshot, EventOccurrence } from '@/types';

const buildTimelineDateIndex = (timeline: DailySnapshot[]): Map<string, DailySnapshot> => {
  const index = new Map<string, DailySnapshot>();
  timeline.forEach((snapshot) => {
    index.set(snapshot.date, snapshot);
  });
  return index;
};

const findLatestSnapshotOnOrBeforeDate = (
  timeline: DailySnapshot[],
  date: string,
): DailySnapshot | null => {
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    if (timeline[i].date <= date) {
      return timeline[i];
    }
  }

  return null;
};

export const aggregateAccountTimelines = (
  timelinesByAccount: Record<string, DailySnapshot[]>,
  selectedAccountIds: string[],
): DailySnapshot[] => {
  const normalizedAccountIds = selectedAccountIds.filter((accountId) => Boolean(timelinesByAccount[accountId]?.length));
  if (!normalizedAccountIds.length) return [];

  const allDates = new Set<string>();
  const indexedTimelines = normalizedAccountIds.map((accountId) => {
    const timeline = [...(timelinesByAccount[accountId] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    timeline.forEach((snapshot) => allDates.add(snapshot.date));
    return {
      accountId,
      timeline,
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

      indexedTimelines.forEach(({ accountId, timeline, index }) => {
        const exactDay = index.get(date);
        const effectiveDay = exactDay ?? findLatestSnapshotOnOrBeforeDate(timeline, date);
        if (!effectiveDay) return;

        balance += effectiveDay.balance;
        isWeekend ||= effectiveDay.isWeekend;
        isToday ||= effectiveDay.isToday;
        if (effectiveDay.zone === 'frozen') {
          zone = 'frozen';
        }
        reconciliationId ??= effectiveDay.reconciliationId;
        snapshotId ??= effectiveDay.snapshotId;

        if (!exactDay) {
          return;
        }

        change += exactDay.change;
        events.push(
          ...exactDay.events.map((event) => ({
            ...event,
            accountId: event.accountId ?? accountId,
          })),
        );
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
