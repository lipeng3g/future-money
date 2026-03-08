import { addDays, addMonths, formatISO, isAfter, isSameDay, isWeekend, parseISO, startOfDay } from 'date-fns';
import type { CashFlowEvent } from '@/types/event';
import type { DailySnapshot, EventOccurrence, TimelineInput } from '@/types/timeline';
import type { Reconciliation, LedgerEntry, EventOverride } from '@/types/reconciliation';
import { computePeriodKey } from '@/utils/reconciliation';
import { isEventActiveOnDate, shouldEventOccurOnDate } from '@/utils/recurrence';

export class TimelineGenerator {
  generate(input: TimelineInput): DailySnapshot[] {
    const { events, reconciliations, ledgerEntries, eventOverrides, months } = input;
    const todayDate = input.today ? startOfDay(parseISO(input.today)) : startOfDay(new Date());

    if (!reconciliations || reconciliations.length === 0) {
      return [];
    }

    const sortedReconciliations = [...reconciliations].sort((a, b) => a.date.localeCompare(b.date));
    const latestRecon = sortedReconciliations[sortedReconciliations.length - 1];

    const timeline: DailySnapshot[] = [];

    // 段1: 冻结区（历史）— 从最早对账点到最新对账点
    if (sortedReconciliations.length >= 1) {
      const frozenDays = this.generateFrozenZone(sortedReconciliations, ledgerEntries, todayDate);
      timeline.push(...frozenDays);
    }

    // 段2: 预测区（未来）— 从最新对账点之后开始
    const projectedDays = this.generateProjectedZone({
      startDate: latestRecon.date,
      startBalance: latestRecon.balance,
      events,
      eventOverrides,
      months,
      today: todayDate,
    });
    timeline.push(...projectedDays);

    return timeline;
  }

  /**
   * 冻结区：基于对账记录和账本条目重建历史
   */
  private generateFrozenZone(
    reconciliations: Reconciliation[],
    ledgerEntries: LedgerEntry[],
    today: Date,
  ): DailySnapshot[] {
    const timeline: DailySnapshot[] = [];
    if (reconciliations.length === 0) return timeline;

    // 只展示从第一个对账点到最后一个对账点之间的冻结区数据
    for (let i = 0; i < reconciliations.length; i++) {
      const recon = reconciliations[i];
      const nextRecon = reconciliations[i + 1];

      // 该对账期间的账本条目
      const periodEntries = ledgerEntries
        .filter((e) => e.reconciliationId === recon.id)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (!nextRecon) {
        // 最后一个对账点：只显示当天
        const dateStr = recon.date;
        const cursor = startOfDay(parseISO(dateStr));
        const dayEvents: EventOccurrence[] = periodEntries
          .filter((e) => e.date === dateStr)
          .map((e) => ({
            id: e.id,
            eventId: e.ruleId ?? e.id,
            name: e.name,
            category: e.category,
            amount: e.amount,
            date: e.date,
          }));

        const change = dayEvents.reduce((sum, e) => sum + (e.category === 'income' ? e.amount : -e.amount), 0);

        timeline.push({
          date: dateStr,
          balance: recon.balance,
          change,
          events: dayEvents,
          isWeekend: isWeekend(cursor),
          isToday: isSameDay(cursor, today),
          zone: 'frozen',
          reconciliationId: recon.id,
        });
        continue;
      }

      // 有下一个对账点：从当前对账点到下一个对账点前一天
      const start = startOfDay(parseISO(recon.date));
      const end = addDays(startOfDay(parseISO(nextRecon.date)), -1);
      let cursor = new Date(start);
      let balance = recon.balance;

      while (!isAfter(cursor, end)) {
        const dateStr = formatISO(cursor, { representation: 'date' });
        // 第一天（对账日）balance 就是对账余额，之后的天累加当天的账本条目
        const dayEntries = periodEntries.filter((e) => e.date === dateStr);
        const dayEvents: EventOccurrence[] = dayEntries.map((e) => ({
          id: e.id,
          eventId: e.ruleId ?? e.id,
          name: e.name,
          category: e.category,
          amount: e.amount,
          date: e.date,
        }));

        const change = dayEntries.reduce((sum, e) => sum + (e.category === 'income' ? e.amount : -e.amount), 0);

        // 对账日当天不累加（balance 就是对账余额），之后的天才累加
        if (!isSameDay(cursor, start)) {
          balance = Number((balance + change).toFixed(2));
        }

        timeline.push({
          date: dateStr,
          balance,
          change: isSameDay(cursor, start) ? 0 : change,
          events: isSameDay(cursor, start) ? [] : dayEvents,
          isWeekend: isWeekend(cursor),
          isToday: isSameDay(cursor, today),
          zone: 'frozen',
          reconciliationId: recon.id,
        });

        cursor = addDays(cursor, 1);
      }
    }

    return timeline;
  }

  /**
   * 预测区：基于规则 + 覆盖生成未来时间线
   */
  private generateProjectedZone(params: {
    startDate: string;
    startBalance: number;
    events: CashFlowEvent[];
    eventOverrides: EventOverride[];
    months: number;
    today: Date;
  }): DailySnapshot[] {
    const { startDate, startBalance, events, eventOverrides, months, today } = params;
    const start = addDays(startOfDay(parseISO(startDate)), 1); // 从对账日的下一天开始
    const end = startOfDay(addMonths(startOfDay(parseISO(startDate)), months));

    const timeline: DailySnapshot[] = [];
    let cursor = new Date(start);
    let balance = startBalance;

    // 构建覆盖索引: ruleId+period -> override
    const overrideMap = new Map<string, EventOverride>();
    for (const ov of eventOverrides) {
      overrideMap.set(`${ov.ruleId}::${ov.period}`, ov);
    }

    while (!isAfter(cursor, end)) {
      const dailyEvents = this.getEventsForDate(cursor, events, overrideMap);
      const change = this.calculateDailyChange(dailyEvents);
      balance = Number((balance + change).toFixed(2));

      const dateStr = formatISO(cursor, { representation: 'date' });

      timeline.push({
        date: dateStr,
        balance,
        change,
        events: dailyEvents,
        isWeekend: isWeekend(cursor),
        isToday: isSameDay(cursor, today),
        zone: 'projected',
      });

      cursor = addDays(cursor, 1);
    }

    return timeline;
  }

  private calculateDailyChange(events: EventOccurrence[]): number {
    return events.reduce((sum, event) => sum + (event.category === 'income' ? event.amount : -event.amount), 0);
  }

  private getEventsForDate(
    date: Date,
    events: CashFlowEvent[],
    overrideMap: Map<string, EventOverride>,
  ): EventOccurrence[] {
    const result: EventOccurrence[] = [];

    for (const event of events) {
      if (event.enabled === false) continue;
      if (!isEventActiveOnDate(event, date)) continue;
      if (!shouldEventOccurOnDate(event, date)) continue;

      const dateStr = formatISO(date, { representation: 'date' });
      const periodKey = computePeriodKey(event, dateStr);
      const overrideKey = `${event.id}::${periodKey}`;
      const override = overrideMap.get(overrideKey);

      if (override) {
        if (override.action === 'confirmed' || override.action === 'skipped') {
          // confirmed: 已反映在对账余额中，不再预测
          // skipped: 用户标记跳过
          continue;
        }
        if (override.action === 'modified') {
          result.push({
            id: `${event.id}-${dateStr}`,
            eventId: event.id,
            name: override.name ?? event.name,
            category: event.category,
            amount: override.amount ?? event.amount,
            date: dateStr,
            overrideId: override.id,
            overrideAction: override.action,
            period: periodKey,
          });
          continue;
        }
      }

      // 无覆盖，正常生成
      result.push({
        id: `${event.id}-${dateStr}`,
        eventId: event.id,
        name: event.name,
        category: event.category,
        amount: event.amount,
        date: dateStr,
        period: periodKey,
      });
    }

    return result;
  }

}
