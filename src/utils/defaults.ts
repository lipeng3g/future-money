import { formatISO } from 'date-fns';
import type { AccountConfig, UserPreferences } from '@/types/account';

export const APP_VERSION = '1.0.0';

export const DEFAULT_ACCOUNT_CONFIG = (): AccountConfig => ({
  initialBalance: 10000,
  currency: '¥',
  warningThreshold: 1000,
  createdAt: formatISO(new Date()),
  updatedAt: formatISO(new Date()),
});

export const DEFAULT_PREFERENCES = (): UserPreferences => ({
  defaultViewMonths: 12,
  chartType: 'line',
  showWeekends: true,
});

export const COLOR_PALETTE = {
  income: '#52c41a',
  expense: '#ff4d4f',
  warning: '#faad14',
  neutral: '#1890ff',
};
