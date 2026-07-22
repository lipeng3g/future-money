import { describe, expect, it } from 'vitest';
import { parseRange } from '@/hooks/useChartData';
import { addMonths, today } from '@/utils/date';

describe('parseRange', () => {
  it('支持默认的过去 3 月到今后 1 年范围', () => {
    expect(parseRange('P3M-F12M')).toEqual({
      from: addMonths(today(), -3),
      to: addMonths(today(), 12),
    });
  });

  it('自定义范围优先使用用户日期', () => {
    expect(parseRange('custom', '2026-01-01', '2027-01-01')).toEqual({
      from: '2026-01-01',
      to: '2027-01-01',
    });
  });
});
