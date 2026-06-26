import type { Money } from '@/types';

/** 元 → 分（四舍五入，避免浮点误差） */
export function yuanToCents(yuan: number): Money {
  return Math.round(yuan * 100);
}

/** 分 → 元 */
export function centsToYuan(cents: Money): number {
  return cents / 100;
}

interface FormatOptions {
  /** 是否显示正负号（正数加 +），默认 false */
  withSign?: boolean;
  /** 是否显示货币符号 ¥，默认 true */
  withSymbol?: boolean;
}

/** 格式化金额（输入为分），如 1234567 -> ¥12,345.67 */
export function formatMoney(cents: Money, options: FormatOptions = {}): string {
  const { withSign = false, withSymbol = true } = options;
  const yuan = centsToYuan(Math.abs(cents));
  const body = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(yuan);
  const symbol = withSymbol ? '¥' : '';
  if (cents < 0) return `-${symbol}${body}`;
  if (withSign && cents > 0) return `+${symbol}${body}`;
  return `${symbol}${body}`;
}
