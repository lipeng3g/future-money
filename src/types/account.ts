export interface AccountConfig {
  id: string;
  /** 用户为账户起的名称，例如：现金、基金、公积金 */
  name: string;
  /** 可选的类型标签，仅用于展示，例如：现金账户、长期投资 */
  typeLabel?: string;
  /** 最近一次校准时的余额，用于当前预测的展示 */
  initialBalance: number;
  currency: string;
  warningThreshold: number;
  /** UI 展示用颜色与图标 key，可自动生成 */
  color?: string;
  iconKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccountUpdate = Partial<Omit<AccountConfig, 'id' | 'createdAt' | 'updatedAt'>>;

export interface UserPreferences {
  defaultViewMonths: number;
  chartType: 'line' | 'area';
  showWeekends: boolean;
}

export interface PreferencesUpdate extends Partial<UserPreferences> {}

export interface BalanceSnapshot {
  id: string;
  accountId: string;
  /** 快照日期（建议表示当天结束时的真实余额） */
  date: string;
  balance: number;
  note?: string;
  source: 'initial' | 'manual' | 'import';
  createdAt: string;
}
