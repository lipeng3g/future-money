import { describe, expect, it } from 'vitest';
import { buildImportRiskSummary, parseImportPreview } from '@/utils/import-preview';

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
      scope: 'all',
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

    expect(summary.scope).toBe('legacy-unknown');
    expect(summary.accountsCount).toBe(1);
    expect(summary.accountNames).toEqual(['主账户']);
    expect(summary.eventsCount).toBe(0);
    expect(summary.reconciliationsCount).toBe(0);
  });

  it('优先使用导出时写入的 scope 标记识别单账户备份', () => {
    const summary = parseImportPreview(
      JSON.stringify({
        version: '2.0.0',
        scope: 'current',
        timestamp: '2026-03-08T14:00:00.000Z',
        state: {
          version: '2.0.0',
          account: { id: 'acc-a', name: '现金账户' },
          accounts: [{ id: 'acc-a', name: '现金账户' }],
          events: [],
          preferences: {},
          snapshots: [],
          reconciliations: [],
          ledgerEntries: [],
          eventOverrides: [],
        },
      }),
    );

    expect(summary.scope).toBe('current');
    expect(summary.accountsCount).toBe(1);
  });

  it('对非法 JSON 和非法结构抛出友好错误', () => {
    expect(() => parseImportPreview('{')).toThrow(/合法的 JSON/);
    expect(() => parseImportPreview(JSON.stringify({ nope: true }))).toThrow(/格式不正确/);
  });

  it('会为整库恢复生成高风险提示，并带上当前本地将被替换的范围', () => {
    const risk = buildImportRiskSummary({
      envelopeVersion: '2.0.0',
      stateVersion: '2.0.0',
      timestamp: '2026-03-08T14:00:00.000Z',
      scope: 'all',
      accountsCount: 2,
      eventsCount: 2,
      reconciliationsCount: 1,
      ledgerEntriesCount: 3,
      eventOverridesCount: 1,
      accountNames: ['现金账户', '信用卡'],
    }, {
      accounts: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      events: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }, { id: 'e4' }],
      reconciliations: [{ id: 'r1' }],
      ledgerEntries: [{ id: 'l1' }, { id: 'l2' }],
      eventOverrides: [{ id: 'o1' }, { id: 'o2' }],
    } as never);

    expect(risk.level).toBe('high');
    expect(risk.title).toMatch(/高风险/);
    expect(risk.consequence).toContain('3 个账户');
    expect(risk.consequence).toContain('4 条事件');
    expect(risk.replacementScope).toMatch(/全部账户/);
  });

  it('会为旧版未标记备份生成中风险提示', () => {
    const risk = buildImportRiskSummary({
      envelopeVersion: '1.0.0',
      stateVersion: '1.0.0',
      timestamp: null,
      scope: 'legacy-unknown',
      accountsCount: 1,
      eventsCount: 0,
      reconciliationsCount: 0,
      ledgerEntriesCount: 0,
      eventOverridesCount: 0,
      accountNames: ['主账户'],
    });

    expect(risk.level).toBe('medium');
    expect(risk.title).toMatch(/未标记/);
    expect(risk.consequence).toMatch(/旧版或未标记/);
  });
});
