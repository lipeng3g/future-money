import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatLocalISODate } from '@/utils/date';

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
