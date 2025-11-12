export interface AccountConfig {
  initialBalance: number;
  currency: string;
  warningThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export type AccountUpdate = Partial<Omit<AccountConfig, 'createdAt' | 'updatedAt'>>;

export interface UserPreferences {
  defaultViewMonths: number;
  chartType: 'line' | 'area';
  showWeekends: boolean;
}

export interface PreferencesUpdate extends Partial<UserPreferences> {}
