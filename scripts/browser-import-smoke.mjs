import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const backupPath = path.join(root, 'tmp-browser-import-current.json');

const backup = {
  version: '2.0.0',
  timestamp: '2026-03-09T12:00:00.000Z',
  scope: 'current',
  state: {
    version: '2.0.0',
    account: {
      id: 'import-source',
      name: '导入源账户',
      typeLabel: '现金',
      initialBalance: 2400,
      currency: '¥',
      warningThreshold: 600,
      color: '#14b8a6',
      iconKey: 'wallet',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    accounts: [
      {
        id: 'import-source',
        name: '导入源账户',
        typeLabel: '现金',
        initialBalance: 2400,
        currency: '¥',
        warningThreshold: 600,
        color: '#14b8a6',
        iconKey: 'wallet',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    preferences: {
      defaultViewMonths: 12,
      chartType: 'balance',
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
        accountId: 'import-source',
        name: '导入工资',
        amount: 8000,
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
        accountId: 'import-source',
        name: '导入房租',
        amount: 2500,
        category: 'expense',
        type: 'monthly',
        startDate: '2026-01-01',
        monthlyDay: 12,
        enabled: true,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    snapshots: [],
    reconciliations: [
      {
        id: 'recon-1',
        accountId: 'import-source',
        date: '2026-03-05',
        balance: 5200,
        note: '导入对账',
        createdAt: '2026-03-05T00:00:00.000Z',
      },
    ],
    ledgerEntries: [
      {
        id: 'ledger-1',
        accountId: 'import-source',
        reconciliationId: 'recon-1',
        date: '2026-03-06',
        amount: -120,
        source: 'manual',
        note: '导入账本',
        createdAt: '2026-03-06T00:00:00.000Z',
      },
    ],
    eventOverrides: [
      {
        id: 'override-1',
        accountId: 'import-source',
        ruleId: 'event-rent',
        date: '2026-03-12',
        action: 'skip',
        createdAt: '2026-03-07T00:00:00.000Z',
      },
    ],
  },
};

await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');
console.log(backupPath);
