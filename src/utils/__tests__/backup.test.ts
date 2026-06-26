import { describe, expect, it } from 'vitest';
import { DATA_VERSION, type AppData } from '@/types';
import {
  deserialize,
  mergeAppData,
  migrate,
  serialize,
  summarize,
  validateAppData,
} from '@/utils/backup';

const sample: AppData = {
  version: DATA_VERSION,
  categories: [{ id: 'c1', name: '工资', color: '#16a34a', createdAt: 1 }],
  accounts: [
    {
      id: 'a1',
      name: '现金',
      openingBalance: 200000,
      openingDate: '2026-06-01',
      color: '#2f6bff',
      archived: false,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  series: [],
  transactions: [
    {
      id: 't1',
      accountId: 'a1',
      date: '2026-06-10',
      amount: 150000,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
};

describe('backup', () => {
  it('序列化与反序列化往返一致', () => {
    expect(deserialize(serialize(sample))).toEqual(sample);
  });

  it('migrate 对当前版本返回原样', () => {
    expect(migrate(sample)).toEqual(sample);
  });

  it('validateAppData 拒绝非法结构', () => {
    expect(() => validateAppData(null)).toThrow();
    expect(() => validateAppData({ accounts: [] })).toThrow();
    expect(() => validateAppData({ version: 1, accounts: {}, transactions: [], series: [], categories: [] })).toThrow();
  });

  it('拒绝高于当前版本的数据', () => {
    expect(() => validateAppData({ ...sample, version: DATA_VERSION + 1 })).toThrow();
  });

  it('deserialize 拒绝非法 JSON', () => {
    expect(() => deserialize('{ not json')).toThrow();
  });

  it('summarize 统计各实体数量', () => {
    expect(summarize(sample)).toEqual({
      version: DATA_VERSION,
      accounts: 1,
      transactions: 1,
      series: 0,
      categories: 1,
    });
  });

  it('mergeAppData 按 id 合并且同 id 以导入数据为准', () => {
    const incoming: AppData = {
      version: DATA_VERSION,
      categories: [{ id: 'c1', name: '工资改', color: '#000', createdAt: 2 }],
      accounts: [
        {
          id: 'a2',
          name: '招行',
          openingBalance: 0,
          openingDate: '2026-06-01',
          color: '#000',
          archived: false,
          createdAt: 2,
          updatedAt: 2,
        },
      ],
      series: [],
      transactions: [{ id: 't1', accountId: 'a1', date: '2026-07-01', amount: 999, createdAt: 2, updatedAt: 2 }],
    };
    const merged = mergeAppData(sample, incoming);
    expect(merged.accounts).toHaveLength(2);
    expect(merged.categories.find((c) => c.id === 'c1')?.name).toBe('工资改');
    expect(merged.transactions).toHaveLength(1);
    expect(merged.transactions[0].amount).toBe(999);
  });
});
