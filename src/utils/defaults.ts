import { formatISO } from 'date-fns';
import type { AccountConfig, BalanceSnapshot, UserPreferences } from '@/types/account';
import { createId } from '@/utils/id';

export const APP_VERSION = '1.0.0';

// 预设账户颜色与图标 key，用于新建账户时轮询分配
export const ACCOUNT_COLORS = ['#3b82f6', '#10b981', '#f97316', '#a855f7', '#ef4444', '#14b8a6', '#64748b'];
export const ACCOUNT_ICONS = ['wallet', 'fund', 'building', 'shield', 'card', 'piggy', 'coins'];

export const DEFAULT_ACCOUNT_CONFIG = (): AccountConfig => {
  const nowIso = formatISO(new Date());
  return {
    id: createId(),
    name: '主账户',
    typeLabel: '现金账户',
    initialBalance: 10000,
    currency: '¥',
    warningThreshold: 1000,
    color: ACCOUNT_COLORS[0],
    iconKey: ACCOUNT_ICONS[0],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

export const DEFAULT_SNAPSHOT = (account: AccountConfig): BalanceSnapshot => ({
  id: 'snapshot-initial',
  accountId: account.id,
  date: formatISO(new Date(), { representation: 'date' }),
  balance: account.initialBalance,
  source: 'initial',
  createdAt: account.createdAt,
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
