import { describe, expect, it } from 'vitest';
import { parseImportPreview } from '@/utils/import-preview';

describe('parseImportPreview', () => {
  it('从多账户备份中提取摘要信息', () => {
    const summary = parseImportPreview(
      JSON.stringify({
        version: '2.0.0',
        timestamp: '2026-03-08T14:00:00.000Z',
        state: {
          version: '2.0.0',
          account: { id: 'acc-a', name: '现金账户' },
          accounts: [
            { id: 'acc-a', name: '现金账户' },
            { id: 'acc-b', name: '信用卡' },
          ],
          events: [{ id: 'evt-1' }, { id: 'evt-2' }],
          preferences: {},
          snapshots: [],
          reconciliations: [{ id: 'rec-1' }],
          ledgerEntries: [{ id: 'led-1' }, { id: 'led-2' }, { id: 'led-3' }],
          eventOverrides: [{ id: 'ov-1' }],
        },
      }),
    );

    expect(summary).toEqual({
      envelopeVersion: '2.0.0',
      stateVersion: '2.0.0',
      timestamp: '2026-03-08T14:00:00.000Z',
      accountsCount: 2,
      eventsCount: 2,
      reconciliationsCount: 1,
      ledgerEntriesCount: 3,
      eventOverridesCount: 1,
      accountNames: ['现金账户', '信用卡'],
    });
  });

  it('兼容旧备份缺少 accounts 字段时，回退到 account', () => {
    const summary = parseImportPreview(
      JSON.stringify({
        version: '1.0.0',
        state: {
          account: { id: 'acc-a', name: '主账户' },
          events: [],
          preferences: {},
          snapshots: [],
        },
      }),
    );

    expect(summary.accountsCount).toBe(1);
    expect(summary.accountNames).toEqual(['主账户']);
    expect(summary.eventsCount).toBe(0);
    expect(summary.reconciliationsCount).toBe(0);
  });

  it('对非法 JSON 和非法结构抛出友好错误', () => {
    expect(() => parseImportPreview('{')).toThrow(/合法的 JSON/);
    expect(() => parseImportPreview(JSON.stringify({ nope: true }))).toThrow(/格式不正确/);
  });
});
