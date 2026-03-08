import { describe, expect, it } from 'vitest';
import { getUpcomingCutoffDate } from '@/utils/upcoming';

describe('getUpcomingCutoffDate', () => {
  it('基于业务 today 计算未来 60 天截止日，而不是系统当前时间', () => {
    expect(getUpcomingCutoffDate('2025-01-01')).toBe('2025-03-02');
  });

  it('正确处理闰年二月边界', () => {
    expect(getUpcomingCutoffDate('2024-02-29')).toBe('2024-04-29');
  });

  it('支持自定义天数', () => {
    expect(getUpcomingCutoffDate('2025-12-31', 1)).toBe('2026-01-01');
  });
});
