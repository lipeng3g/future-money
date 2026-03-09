import { chromium } from 'playwright';
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const messages = [];
page.on('console', (msg) => {
  messages.push(msg.text());
});

try {
  await page.goto('http://127.0.0.1:4175/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.localStorage.setItem('futureMoney.onboarding.v3', '1');
  });
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByRole('button', { name: '账户管理' }).click();
  await page.getByRole('button', { name: '导入当前账户' }).click();

  await page.locator('input[type="file"]').setInputFiles(backupPath);

  await page.waitForSelector('.ant-modal-confirm', { state: 'visible' });

  const modalText = await page.locator('.ant-modal-confirm').innerText();
  if (!modalText.includes('当前账户事件规则 diff')) {
    throw new Error(`missing event diff section: ${modalText}`);
  }
  if (!modalText.includes('将新增：导入工资、导入房租')) {
    throw new Error(`missing added event names: ${modalText}`);
  }
  if (!modalText.includes('导入后事件 / 对账 / 账本：2 / 1 / 1')) {
    throw new Error(`missing sanitized data counts: ${modalText}`);
  }

  await page.getByPlaceholder('请输入：导入当前账户').fill('导入当前账户');
  await page.getByRole('button', { name: '确认导入' }).click();

  await page.waitForTimeout(300);

  await page.getByRole('button', { name: '账户管理' }).click();
  await page.waitForSelector('.ant-modal', { state: 'visible' });

  const manageText = await page.locator('.ant-modal').innerText();
  if (!manageText.includes('撤销上次导入 / 恢复')) {
    throw new Error(`missing undo action in manage modal: ${manageText}`);
  }
  if (!manageText.includes('导入当前账户 · tmp-browser-import-current.json')) {
    throw new Error(`missing undo summary: ${manageText}`);
  }

  await page.getByRole('button', { name: '撤销上次导入' }).click();
  await page.waitForSelector('.ant-modal-confirm', { state: 'visible' });
  const undoText = await page.locator('.ant-modal-confirm').innerText();
  if (!undoText.includes('导入当前账户前快照')) {
    throw new Error(`missing undo confirm type: ${undoText}`);
  }
  await page.getByRole('button', { name: '确认撤销' }).click();
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => JSON.parse(window.localStorage.getItem('futureMoney.state') ?? 'null'));
  const rollback = await page.evaluate(() => window.localStorage.getItem('futureMoney.rollback'));

  if (!state?.state?.events?.length) {
    throw new Error('expected at least one event after undo state restore');
  }

  const accountName = state.state.account?.name;
  const eventNames = state.state.events.map((event) => event.name);

  if (accountName !== '我的账户') {
    throw new Error(`unexpected account name after undo: ${accountName}`);
  }
  if (eventNames.includes('导入工资') || eventNames.includes('导入房租')) {
    throw new Error(`imported events still present after undo: ${eventNames.join(',')}`);
  }
  if (rollback !== null) {
    throw new Error('rollback snapshot should be cleared after undo');
  }

  console.log('browser smoke ok');
} finally {
  await browser.close();
  await fs.rm(backupPath, { force: true });
}
