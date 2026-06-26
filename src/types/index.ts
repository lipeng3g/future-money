import type { Account } from './account';
import type { Category } from './category';
import type { Granularity, Theme } from './common';
import type { Series } from './series';
import type { Transaction } from './transaction';

export type { Account } from './account';
export type { Category } from './category';
export type { Series } from './series';
export type { Transaction } from './transaction';
export type {
  Frequency,
  Granularity,
  Money,
  RecurrenceEnd,
  Theme,
} from './common';

/** 当前数据 schema 版本 */
export const DATA_VERSION = 1;

/** 持久化的业务数据 */
export interface AppData {
  version: number;
  accounts: Account[];
  transactions: Transaction[];
  series: Series[];
  categories: Category[];
}

/** 持久化的界面设置 */
export interface AppSettings {
  theme: Theme;
  /** 时间范围预设，如 'P1M-F12M'（过去1月~未来12月） */
  rangePreset: string;
  granularity: Granularity;
  /** 图表中显示的账户 id；空数组表示全部显示 */
  visibleAccountIds: string[];
  showTotal: boolean;
}
