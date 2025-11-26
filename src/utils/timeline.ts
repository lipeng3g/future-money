import { addDays, addMonths, differenceInCalendarMonths, formatISO, isAfter, isBefore, isSameDay, isWeekend, parseISO, startOfDay } from 'date-fns';
import type { CashFlowEvent } from '@/types/event';
import type { DailySnapshot, EventOccurrence, TimelineInput } from '@/types/timeline';

const clampMonthlyExecutionDate = (target: Date, day: number): number => {
  const endOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return Math.min(day, endOfMonth);
};

const isLeapYearDate = (date: Date): boolean => {
  const year = date.getFullYear();
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

const normalizeYearlyDay = (date: Date, month: number, day: number): { month: number; day: number } => {
  if (month === 2 && day === 29 && !isLeapYearDate(date)) {
    return { month, day: 28 };
  }
  return { month, day };
};

export class TimelineGenerator {
  generate(input: TimelineInput): DailySnapshot[] {
    const { events, months, snapshots } = input;
    const mode = input.mode ?? 'latest';
    const todayDate = input.today ? startOfDay(parseISO(input.today)) : startOfDay(new Date());

    if (!snapshots || snapshots.length === 0) {
      return [];
    }

    const sortedSnapshots = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));

    if (mode === 'latest') {
      const latest = sortedSnapshots[sortedSnapshots.length - 1];
      return this.generateSegment({
        startDate: latest.date,
        initialBalance: latest.balance,
        snapshotId: latest.id,
        events,
        months,
        today: todayDate,
      });
    }

    // segments 模式：为每个快照生成一个片段，保留以备将来回放使用
    const result: DailySnapshot[] = [];
    for (let i = 0; i < sortedSnapshots.length; i += 1) {
      const snap = sortedSnapshots[i];
      const next = sortedSnapshots[i + 1];
      const segment = this.generateSegment({
        startDate: snap.date,
        initialBalance: snap.balance,
        snapshotId: snap.id,
        events,
        months,
        today: todayDate,
        // 如果存在下一条快照，则该片段在下一快照前一天结束
        endBeforeDate: next ? next.date : undefined,
      });
      result.push(...segment);
    }
    return result;
  }

  private generateSegment(params: {
    startDate: string;
    initialBalance: number;
    snapshotId: string;
    events: CashFlowEvent[];
    months: number;
    today: Date;
    endBeforeDate?: string;
  }): DailySnapshot[] {
    const { startDate, initialBalance, snapshotId, events, months, today, endBeforeDate } = params;
    const start = startOfDay(parseISO(startDate));
    const maxEnd = startOfDay(addMonths(start, months));
    const limitEnd = endBeforeDate ? startOfDay(parseISO(endBeforeDate)) : maxEnd;
    // 片段结束在 limitEnd 和 maxEnd 的较早者（endBeforeDate 不包含当天）
    const end = isBefore(limitEnd, maxEnd) ? addDays(limitEnd, -1) : maxEnd;

    const timeline: DailySnapshot[] = [];
    let cursor = new Date(start);
    let balance = initialBalance;

    while (!isAfter(cursor, end)) {
      const dailyEvents = this.getEventsForDate(cursor, events);
      const change = this.calculateDailyChange(dailyEvents);
      balance = Number((balance + change).toFixed(2));

      const dateStr = formatISO(cursor, { representation: 'date' });
      const isTodayFlag = isSameDay(cursor, today);
      const isPast = isBefore(cursor, today);

      timeline.push({
        date: dateStr,
        balance,
        change,
        events: dailyEvents,
        isWeekend: isWeekend(cursor),
        isToday: isTodayFlag,
        snapshotId,
        isPast,
      });

      cursor = addDays(cursor, 1);
    }

    return timeline;
  }

  private calculateDailyChange(events: EventOccurrence[]): number {
    return events.reduce((sum, event) => sum + (event.category === 'income' ? event.amount : -event.amount), 0);
  }

  private getEventsForDate(date: Date, events: CashFlowEvent[]): EventOccurrence[] {
    return events
      .filter((event) => event.enabled !== false)
      .filter((event) => this.isEventActiveOnDate(event, date))
      .filter((event) => this.shouldEventOccur(event, date))
      .map((event) => ({
        id: `${event.id}-${formatISO(date, { representation: 'date' })}`,
        eventId: event.id,
        name: event.name,
        category: event.category,
        amount: event.amount,
        date: formatISO(date, { representation: 'date' }),
      }));
  }

  private isEventActiveOnDate(event: CashFlowEvent, date: Date): boolean {
    const start = startOfDay(parseISO(event.startDate));
    if (isBefore(date, start)) {
      return false;
    }
    if (event.endDate) {
      const end = startOfDay(parseISO(event.endDate));
      if (isAfter(date, end)) {
        return false;
      }
    }
    return true;
  }

  private shouldEventOccur(event: CashFlowEvent, date: Date): boolean {
    switch (event.type) {
      case 'once':
        return this.matchOnceEvent(event, date);
      case 'monthly':
        return this.matchMonthlyEvent(event, date);
      case 'yearly':
        return this.matchYearlyEvent(event, date);
      default:
        return false;
    }
  }

  private matchOnceEvent(event: CashFlowEvent, date: Date): boolean {
    const target = event.onceDate ? startOfDay(parseISO(event.onceDate)) : startOfDay(parseISO(event.startDate));
    return isSameDay(date, target);
  }

  private matchMonthlyEvent(event: CashFlowEvent, date: Date): boolean {
    if (!event.monthlyDay) return false;
    if (differenceInCalendarMonths(date, startOfDay(parseISO(event.startDate))) < 0) {
      return false;
    }
    const targetDay = clampMonthlyExecutionDate(date, event.monthlyDay);
    return date.getDate() === targetDay;
  }

  private matchYearlyEvent(event: CashFlowEvent, date: Date): boolean {
    if (!event.yearlyMonth || !event.yearlyDay) return false;
    const normalized = normalizeYearlyDay(date, event.yearlyMonth, event.yearlyDay);
    return date.getMonth() + 1 === normalized.month && date.getDate() === normalized.day;
  }
}
