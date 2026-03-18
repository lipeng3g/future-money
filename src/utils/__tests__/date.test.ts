import { describe, expect, it, vi, afterEach } from 'vitest';
import { clampMonthlyDay, formatLocalISODate, isWeekendDate, todayStart, toISODate, parseISODate, addMonthsSafe, addDaysSafe, isSameISODate } from '@/utils/date';

describe('formatLocalISODate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('默认使用本地时间格式化 YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 8, 0, 30, 0));

    expect(formatLocalISODate()).toBe('2025-03-08');
  });

  it('避免 UTC ISO 字符串导致的跨日偏移', () => {
    const localLateNight = new Date(2025, 2, 8, 0, 30, 0);

    expect(formatLocalISODate(localLateNight)).toBe('2025-03-08');
    expect(localLateNight.toISOString().slice(0, 10)).toBe('2025-03-07');
  });
});

describe('clampMonthlyDay', () => {
  it('返回不超过月末天数的日期', () => {
    const janDate = new Date(2025, 0, 15); // January
    expect(clampMonthlyDay(janDate, 31)).toBe(31); // January has 31 days
    expect(clampMonthlyDay(janDate, 15)).toBe(15); // 15 < 31, return 15
    expect(clampMonthlyDay(janDate, 32)).toBe(31); // Clamp to 31
  });

  it('2 月 clamping 到 28 或 29 天 (基于月份, 而非输入日期)', () => {
    const anyDateInFeb2025 = new Date(2025, 1, 15); // February 2025 (non-leap year)
    const anyDateInFeb2024 = new Date(2024, 1, 1); // February 2024 (leap year)

    expect(clampMonthlyDay(anyDateInFeb2025, 31)).toBe(28);
    expect(clampMonthlyDay(anyDateInFeb2025, 15)).toBe(15);
    expect(clampMonthlyDay(anyDateInFeb2024, 31)).toBe(29); // Leap year
  });

  it('月份天数边界：4 月 30 天', () => {
    const april = new Date(2025, 3, 15); // April (30 days)
    expect(clampMonthlyDay(april, 31)).toBe(30);
    expect(clampMonthlyDay(april, 30)).toBe(30);
    expect(clampMonthlyDay(april, 15)).toBe(15);
  });
});

describe('isWeekendDate', () => {
  it('周六是周末', () => {
    // 2025-03-08 is Saturday
    const saturday = new Date(2025, 2, 8);
    expect(isWeekendDate(saturday)).toBe(true);
  });

  it('周日是周末', () => {
    // 2025-03-09 is Sunday
    const sunday = new Date(2025, 2, 9);
    expect(isWeekendDate(sunday)).toBe(true);
  });

  it('工作日不是周末', () => {
    // 2025-03-07 is Friday
    const friday = new Date(2025, 2, 7);
    expect(isWeekendDate(friday)).toBe(false);
  });
});

describe('todayStart', () => {
  it('返回当天 00:00:00', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 8, 14, 30, 45));

    const result = todayStart();
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('toISODate', () => {
  it('格式化为 YYYY-MM-DD', () => {
    const date = new Date(2025, 2, 15); // March 15, 2025
    expect(toISODate(date)).toBe('2025-03-15');
  });

  it('处理月初日期', () => {
    const date = new Date(2025, 0, 1); // January 1, 2025
    expect(toISODate(date)).toBe('2025-01-01');
  });

  it('处理月末日期', () => {
    const date = new Date(2024, 11, 31); // December 31, 2024
    expect(toISODate(date)).toBe('2024-12-31');
  });
});

describe('parseISODate', () => {
  it('解析 ISO 字符串为当天起始', () => {
    const result = parseISODate('2025-03-15');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(2); // March (0-indexed)
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('解析月初日期', () => {
    const result = parseISODate('2025-01-01');
    expect(result.getDate()).toBe(1);
  });
});

describe('addMonthsSafe', () => {
  it('月份递增加法', () => {
    const date = new Date(2025, 1, 15); // Feb 15, 2025
    const result = addMonthsSafe(date, 2);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(15);
  });

  it('处理月末日期溢出（自动回弹）', () => {
    const date = new Date(2025, 0, 31); // Jan 31, 2025
    const result = addMonthsSafe(date, 1);
    expect(result.getMonth()).toBe(1); // February
    // date-fns 会回弹到月末有效的最后一天
    expect(result.getDate()).toBe(28); // Feb 28, 2025 (non-leap year)
  });
});

describe('addDaysSafe', () => {
  it('天数递增加法', () => {
    const date = new Date(2025, 2, 15); // March 15, 2025
    const result = addDaysSafe(date, 10);
    expect(result.getDate()).toBe(25);
  });

  it('跨月加法', () => {
    const date = new Date(2025, 2, 28); // March 28, 2025
    const result = addDaysSafe(date, 5);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(2);
  });

  it('负数减法', () => {
    const date = new Date(2025, 2, 5); // March 5, 2025
    const result = addDaysSafe(date, -3);
    expect(result.getDate()).toBe(2);
  });
});

describe('isSameISODate', () => {
  it('相同日期返回 true', () => {
    const date1 = new Date(2025, 2, 15, 10, 30, 0);
    const date2 = new Date(2025, 2, 15, 18, 45, 0);
    expect(isSameISODate(date1, date2)).toBe(true);
  });

  it('不同日期返回 false', () => {
    const date1 = new Date(2025, 2, 15);
    const date2 = new Date(2025, 2, 16);
    expect(isSameISODate(date1, date2)).toBe(false);
  });

  it('跨日时间应视为同一天（本地时间）', () => {
    const date1 = new Date(2025, 2, 15, 23, 59, 0);
    const date2 = new Date(2025, 2, 16, 0, 1, 0);
    // isSameDay 比较的是 year/month/date，不比较时间
    expect(isSameISODate(date1, date2)).toBe(false);
  });
});

describe('formatLocalISODate timezone edge case', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('正确处理 UTC 午夜边界（本地时间仍是前一天）', () => {
    // 创建一个 UTC 时间 00:30，但本地时间可能是前一天晚上
    // 这是一个真实场景：用户在 UTC+8 时区的早上 00:30 查看日期
    vi.useFakeTimers();
    // 强制设置系统时区为 UTC+8
    vi.setSystemTime(new Date('2025-03-15T00:30:00.000+08:00'));

    const date = new Date('2025-03-15T00:30:00.000+08:00');
    const result = formatLocalISODate(date);

    // 期望返回本地日期 2025-03-15，而不是 UTC 日期 2025-03-14
    expect(result).toBe('2025-03-15');
  });
});
