import { describe, expect, it, vi, afterEach } from 'vitest';
import { clampMonthlyDay, formatLocalISODate, isWeekendDate, todayStart } from '@/utils/date';

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
