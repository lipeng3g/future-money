import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const fixturesDir = path.join(root, 'tmp-browser-chart-smoke');

const emptyState = {
  version: '2.0.0',
  account: {
    id: 'account-empty',
    name: '空数据账户',
    typeLabel: '现金',
    initialBalance: 0,
    currency: '¥',
    warningThreshold: 500,
    color: '#3b82f6',
    iconKey: 'wallet',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
  },
  accounts: [
    {
      id: 'account-empty',
      name: '空数据账户',
      typeLabel: '现金',
      initialBalance: 0,
      currency: '¥',
      warningThreshold: 500,
      color: '#3b82f6',
      iconKey: 'wallet',
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:00.000Z',
    },
  ],
  preferences: {
    defaultViewMonths: 12,
    chartType: 'line',
    showWeekends: true,
    theme: 'light',
    language: 'zh-CN',
    currency: '¥',
    compactMode: false,
    aiProviderType: 'openai-compatible',
    aiBaseUrl: '',
    aiModel: '',
    aiApiKey: '',
    aiSystemPrompt: '',
    enableAiProxy: false,
  },
  events: [],
  snapshots: [],
  reconciliations: [],
  ledgerEntries: [],
  eventOverrides: [],
};

const seededState = {
  version: '2.0.0',
  account: {
    id: 'account-main',
    name: '主账户',
    typeLabel: '现金',
    initialBalance: 5200,
    currency: '¥',
    warningThreshold: 800,
    color: '#10b981',
    iconKey: 'wallet',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
  },
  accounts: [
    {
      id: 'account-main',
      name: '主账户',
      typeLabel: '现金',
      initialBalance: 5200,
      currency: '¥',
      warningThreshold: 800,
      color: '#10b981',
      iconKey: 'wallet',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:00.000Z',
    },
  ],
  preferences: {
    defaultViewMonths: 12,
    chartType: 'line',
    showWeekends: true,
    theme: 'light',
    language: 'zh-CN',
    currency: '¥',
    compactMode: false,
    aiProviderType: 'openai-compatible',
    aiBaseUrl: '',
    aiModel: '',
    aiApiKey: '',
    aiSystemPrompt: '',
    enableAiProxy: false,
  },
  events: [
    {
      id: 'event-salary',
      accountId: 'account-main',
      name: '工资到账',
      amount: 12000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'event-rent',
      accountId: 'account-main',
      name: '房租',
      amount: 3200,
      category: 'expense',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 12,
      enabled: true,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'event-insurance',
      accountId: 'account-main',
      name: '季度保险',
      amount: 900,
      category: 'expense',
      type: 'quarterly',
      startDate: '2026-01-01',
      monthlyDay: 18,
      enabled: true,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ],
  snapshots: [],
  reconciliations: [
    {
      id: 'recon-main',
      accountId: 'account-main',
      date: '2026-03-05',
      balance: 5200,
      note: '初始对账',
      createdAt: '2026-03-05T00:00:00.000Z',
    },
  ],
  ledgerEntries: [
    {
      id: 'ledger-grocery',
      accountId: 'account-main',
      reconciliationId: 'recon-main',
      date: '2026-03-06',
      amount: -180,
      category: 'expense',
      name: '日常买菜',
      source: 'manual',
      createdAt: '2026-03-06T00:00:00.000Z',
      updatedAt: '2026-03-06T00:00:00.000Z',
    },
  ],
  eventOverrides: [],
};

const wrapEnvelope = (state) => ({
  version: '2.0.0',
  timestamp: '2026-03-10T01:00:00.000Z',
  scope: 'all',
  state,
});

await fs.mkdir(fixturesDir, { recursive: true });
await fs.writeFile(path.join(fixturesDir, 'empty-state.json'), JSON.stringify(wrapEnvelope(emptyState), null, 2), 'utf8');
await fs.writeFile(path.join(fixturesDir, 'seeded-state.json'), JSON.stringify(wrapEnvelope(seededState), null, 2), 'utf8');

console.log(fixturesDir);
console.log(path.join(fixturesDir, 'empty-state.json'));
console.log(path.join(fixturesDir, 'seeded-state.json'));
