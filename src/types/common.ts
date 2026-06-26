/** 金额：以「分」为单位的整数，避免浮点误差 */
export type Money = number;

/** 周期频率 */
export type Frequency =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

/** 周期结束条件：按次数 或 按截止日期（含当日） */
export type RecurrenceEnd =
  | { kind: 'count'; count: number }
  | { kind: 'until'; date: string };

export type Theme = 'light' | 'dark';

export type Granularity = 'day' | 'week' | 'month';
