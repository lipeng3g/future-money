import { describe, expect, it } from 'vitest';
import { buildUpcomingItems, DEFAULT_UPCOMING_ITEM_LIMIT } from '@/utils/upcoming-items';
import type { DailySnapshot } from '@/types/timeline';

describe('buildUpcomingItems', () => {
  it('只提取业务 today 到 cutoff 之间的未来事件', () => {
    const timeline: DailySnapshot[] = [
      {
        date: '2025-01-01',
        balance: 0,
        change: 0,
        events: [{ id: 'past', eventId: 'past', name: '过去', category: 'expense', amount: 1, date: '2025-01-01' }],
        isWeekend: false,
        isToday: false,
        zone: 'projected',
      },
      {
        date: '2025-01-02',
        balance: 0,
        change: 0,
        events: [{ id: 'today', eventId: 'today', name: '今天', category: 'expense', amount: 2, date: '2025-01-02' }],
        isWeekend: false,
        isToday: true,
        zone: 'projected',
      },
      {
        date: '2025-03-05',
        balance: 0,
        change: 0,
        events: [{ id: 'too-late', eventId: 'too-late', name: '超窗', category: 'income', amount: 3, date: '2025-03-05' }],
        isWeekend: false,
        isToday: false,
        zone: 'projected',
      },
    ];

    const items = buildUpcomingItems(timeline, '2025-01-02');
    expect(items.map((item) => item.name)).toEqual(['今天']);
  });

  it('默认限制侧栏项目数，避免超长列表', () => {
    const timeline: DailySnapshot[] = Array.from({ length: DEFAULT_UPCOMING_ITEM_LIMIT + 5 }, (_, index) => ({
      date: `2025-02-${String(index + 1).padStart(2, '0')}`,
      balance: 0,
      change: 0,
      events: [{ id: `event-${index}`, eventId: `event-${index}`, name: `事件 ${index}`, category: 'expense', amount: index, date: `2025-02-${String(index + 1).padStart(2, '0')}` }],
      isWeekend: false,
      isToday: false,
      zone: 'projected',
    }));

    const items = buildUpcomingItems(timeline, '2025-02-01');
    expect(items).toHaveLength(DEFAULT_UPCOMING_ITEM_LIMIT);
  });

  it('同日事件按支出优先、金额降序排序，便于先看风险项', () => {
    const timeline: DailySnapshot[] = [{
      date: '2025-02-02',
      balance: 0,
      change: 0,
      events: [
        { id: 'income', eventId: 'income', name: '工资', category: 'income', amount: 1000, date: '2025-02-02' },
        { id: 'expense-small', eventId: 'expense-small', name: '咖啡', category: 'expense', amount: 20, date: '2025-02-02' },
        { id: 'expense-large', eventId: 'expense-large', name: '房租', category: 'expense', amount: 3000, date: '2025-02-02' },
      ],
      isWeekend: false,
      isToday: false,
      zone: 'projected',
    }];

    const items = buildUpcomingItems(timeline, '2025-02-01', { limit: 10 });
    expect(items.map((item) => item.name)).toEqual(['房租', '咖啡', '工资']);
  });

  it('保留多账户聚合事件的 accountId，供侧栏展示来源账户', () => {
    const timeline: DailySnapshot[] = [{
      date: '2025-02-03',
      balance: 0,
      change: 0,
      events: [
        { id: 'salary', eventId: 'salary', name: '工资', category: 'income', amount: 5000, date: '2025-02-03', accountId: 'acc-salary' },
        { id: 'rent', eventId: 'rent', name: '房租', category: 'expense', amount: 2800, date: '2025-02-03', accountId: 'acc-cash' },
      ],
      isWeekend: false,
      isToday: false,
      zone: 'projected',
    }];

    const items = buildUpcomingItems(timeline, '2025-02-01', { limit: 10 });
    expect(items.map((item) => item.accountId)).toEqual(['acc-cash', 'acc-salary']);
  });
});
