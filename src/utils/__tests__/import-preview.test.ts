import { describe, expect, it } from 'vitest';
import {
  buildImportAccountDataDeltaSummary,
  buildImportAccountDiffSummary,
  buildImportDataDeltaSummary,
  buildImportDateRangeSummary,
  buildImportRiskSummary,
  parseImportPreview,
} from '@/utils/import-preview';

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

  it('会给出当前本地账户与备份账户的增删交集摘要', () => {
    const diff = buildImportAccountDiffSummary({
      accountNames: ['现金账户', '旅行基金', '信用卡'],
    }, [
      { id: 'acc-1', name: '现金账户' },
      { id: 'acc-2', name: '房贷账户' },
      { id: 'acc-3', name: '信用卡' },
    ] as never);

    expect(diff).toEqual({
      addedNames: ['旅行基金'],
      removedNames: ['房贷账户'],
      keptNames: ['现金账户', '信用卡'],
    });
  });

  it('会自动去重并忽略空账户名，避免差异提示被脏数据污染', () => {
    const diff = buildImportAccountDiffSummary({
      accountNames: [' 现金账户 ', '', '现金账户', '备用金'],
    }, [
      { id: 'acc-1', name: '现金账户' },
      { id: 'acc-2', name: ' ' },
    ] as never);

    expect(diff).toEqual({
      addedNames: ['备用金'],
      removedNames: [],
      keptNames: ['现金账户'],
    });
  });

  it('会生成恢复前后数据规模的净变化摘要，便于确认是否明显增减', () => {
    const delta = buildImportDataDeltaSummary({
      accountsCount: 2,
      eventsCount: 8,
      reconciliationsCount: 1,
      ledgerEntriesCount: 12,
      eventOverridesCount: 0,
    }, {
      accounts: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      events: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
      reconciliations: [{ id: 'r1' }, { id: 'r2' }],
      ledgerEntries: [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }, { id: 'l4' }],
      eventOverrides: [{ id: 'o1' }],
    } as never);

    expect(delta).toEqual([
      { label: '账户', currentCount: 3, incomingCount: 2, delta: -1 },
      { label: '事件', currentCount: 3, incomingCount: 8, delta: 5 },
      { label: '对账', currentCount: 2, incomingCount: 1, delta: -1 },
      { label: '账本记录', currentCount: 4, incomingCount: 12, delta: 8 },
      { label: '覆盖记录', currentCount: 1, incomingCount: 0, delta: -1 },
    ]);
  });

  it('会给出按账户聚合后的事件/对账/账本/覆盖变化，便于发现具体是哪个账户发生变化', () => {
    const delta = buildImportAccountDataDeltaSummary({
      accounts: [
        { id: 'acc-a', name: '现金账户' },
        { id: 'acc-b', name: '信用卡' },
      ],
      events: [
        { id: 'evt-1', accountId: 'acc-a' },
        { id: 'evt-2', accountId: 'acc-b' },
        { id: 'evt-3', accountId: 'acc-b' },
      ],
      reconciliations: [
        { id: 'rec-1', accountId: 'acc-a' },
      ],
      ledgerEntries: [
        { id: 'led-1', accountId: 'acc-a' },
        { id: 'led-2', accountId: 'acc-a' },
      ],
      eventOverrides: [
        { id: 'ov-1', accountId: 'acc-b' },
      ],
    } as never, {
      accounts: [
        { id: 'current-a', name: '现金账户' },
        { id: 'current-c', name: '旅行基金' },
      ],
      events: [
        { id: 'evt-old-1', accountId: 'current-a' },
        { id: 'evt-old-2', accountId: 'current-c' },
      ],
      reconciliations: [
        { id: 'rec-old-1', accountId: 'current-c' },
      ],
      ledgerEntries: [
        { id: 'led-old-1', accountId: 'current-c' },
      ],
      eventOverrides: [],
    } as never);

    expect(delta).toEqual([
      {
        accountName: '旅行基金',
        eventsDelta: -1,
        reconciliationsDelta: -1,
        ledgerEntriesDelta: -1,
        eventOverridesDelta: 0,
      },
      {
        accountName: '现金账户',
        eventsDelta: 0,
        reconciliationsDelta: 1,
        ledgerEntriesDelta: 2,
        eventOverridesDelta: 0,
      },
      {
        accountName: '信用卡',
        eventsDelta: 2,
        reconciliationsDelta: 0,
        ledgerEntriesDelta: 0,
        eventOverridesDelta: 1,
      },
    ]);
  });

  it('会汇总当前本地与备份文件的日期覆盖范围，便于确认时间跨度是否异常', () => {
    const range = buildImportDateRangeSummary({
      events: [
        { startDate: '2026-01-10', endDate: '2026-12-31' },
        { startDate: '2026-02-01', onceDate: '2026-02-15' },
      ],
      reconciliations: [{ date: '2026-03-01' }],
      ledgerEntries: [{ date: '2026-03-09' }],
    } as never, {
      events: [
        { startDate: '2025-06-01', endDate: '2025-09-30' },
      ],
      reconciliations: [{ date: '2025-06-08' }],
      ledgerEntries: [{ date: '2025-07-01' }],
    } as never);

    expect(range).toEqual({
      currentRangeLabel: '2025-06-01 → 2025-09-30',
      incomingRangeLabel: '2026-01-10 → 2026-12-31',
      hasCurrentData: true,
      hasIncomingData: true,
    });
  });
});
