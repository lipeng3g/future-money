import type { CashFlowEvent } from '@/types/event';
import type { AccountConfig } from '@/types/account';

export type EventExportFormat = 'csv' | 'json';

const escapeCsvCell = (value: unknown): string => {
  const raw = String(value ?? '');
  // Escape per RFC4180-ish: quote when contains special chars.
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

export const buildEventsCsv = (events: CashFlowEvent[], accounts: AccountConfig[] = []): string => {
  const accountIndex = new Map(accounts.map((account) => [account.id, account.name] as const));

  const headers = [
    'id',
    '账户',
    '名称',
    '类型',
    '收支',
    '金额',
    '开始日期',
    '结束日期',
    '一次性日期',
    '每月日',
    '每年(月)',
    '每年(日)',
    '启用',
    '备注',
    '颜色',
    '创建时间',
    '更新时间',
  ];

  const rows = events.map((event) => {
    const accountName = accountIndex.get(event.accountId) ?? event.accountId;
    return [
      event.id,
      accountName,
      event.name,
      event.type,
      event.category,
      event.amount,
      event.startDate,
      event.endDate ?? '',
      event.onceDate ?? '',
      event.monthlyDay ?? '',
      event.yearlyMonth ?? '',
      event.yearlyDay ?? '',
      event.enabled ? 'true' : 'false',
      event.notes ?? '',
      event.color ?? '',
      event.createdAt,
      event.updatedAt,
    ].map(escapeCsvCell);
  });

  return [headers.map(escapeCsvCell).join(','), ...rows.map((row) => row.join(','))].join('\n');
};

export const buildEventsJson = (events: CashFlowEvent[]): string => {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: events.length,
      events,
    },
    null,
    2,
  );
};
