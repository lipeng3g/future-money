import type { AppState, PersistedStateEnvelope } from '@/types/storage';
import type { Reconciliation } from '@/types/reconciliation';
import { APP_VERSION, DEFAULT_ACCOUNT_CONFIG, DEFAULT_PREFERENCES, DEFAULT_SNAPSHOT } from '@/utils/defaults';
import { createId } from '@/utils/id';

const STORAGE_KEY = 'futureMoney.state';

const isStorageAvailable = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export const createDefaultState = (): AppState => {
  const account = DEFAULT_ACCOUNT_CONFIG();
  return {
    version: APP_VERSION,
    account,
    accounts: [account],
    events: [],
    preferences: DEFAULT_PREFERENCES(),
    snapshots: [],
    reconciliations: [],
    ledgerEntries: [],
    eventOverrides: [],
  };
};

/** 将 v1 快照迁移为 v2 对账记录 */
const migrateV1ToV2 = (state: AppState): AppState => {
  const reconciliations: Reconciliation[] = [];

  if (state.snapshots && state.snapshots.length > 0) {
    for (const snap of state.snapshots) {
      reconciliations.push({
        id: createId(),
        accountId: snap.accountId,
        date: snap.date,
        balance: snap.balance,
        note: snap.note ?? (snap.source === 'initial' ? '初始对账（从快照迁移）' : '从快照迁移'),
        createdAt: snap.createdAt,
      });
    }
  }
  // 没有快照时不自动创建对账记录，等待用户首次对账

  return {
    ...state,
    version: APP_VERSION,
    reconciliations,
    ledgerEntries: [],
    eventOverrides: [],
  };
};

export class StorageManager {
  private storage: Storage | null;

  constructor() {
    this.storage = isStorageAvailable() ? window.localStorage : null;
  }

  loadState(): AppState {
    if (!this.storage) return createDefaultState();
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw) as PersistedStateEnvelope;
      if (!parsed.state) throw new Error('invalid state payload');
      const base = createDefaultState();
      const state: AppState = {
        ...base,
        ...parsed.state,
        version: APP_VERSION,
      };
      // 兼容旧数据：如果没有 accounts，则基于 account 构造列表
      if (!state.accounts || state.accounts.length === 0) {
        state.accounts = [state.account];
      }
      // 同步 account 字段为第一个账户，作为当前账户镜像
      if (state.accounts[0]) {
        state.account = state.accounts[0];
      }
      // 兼容旧数据：如果没有 snapshots，则基于账户配置生成一条初始快照
      if (!state.snapshots || state.snapshots.length === 0) {
        state.snapshots = [DEFAULT_SNAPSHOT(state.account)];
      }

      // v1 → v2 迁移：如果没有 reconciliations，从 snapshots 迁移
      if (!state.reconciliations || state.reconciliations.length === 0) {
        const migrated = migrateV1ToV2(state);
        state.reconciliations = migrated.reconciliations;
        state.ledgerEntries = migrated.ledgerEntries;
        state.eventOverrides = migrated.eventOverrides;
        // 保存迁移后的状态
        this.saveState(state);
      }

      // 确保新字段有默认值
      if (!state.ledgerEntries) state.ledgerEntries = [];
      if (!state.eventOverrides) state.eventOverrides = [];

      return state;
    } catch (error) {
      console.warn('无法解析本地数据，回退默认值', error);
      return createDefaultState();
    }
  }

  saveState(state: AppState): void {
    if (!this.storage) return;
    const envelope: PersistedStateEnvelope = {
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      state,
    };
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch (error) {
      console.warn('存储数据失败', error);
    }
  }

  clear(): void {
    if (!this.storage) return;
    this.storage.removeItem(STORAGE_KEY);
  }

  exportState(state: AppState): string {
    const payload: PersistedStateEnvelope = {
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      state,
    };
    return JSON.stringify(payload, null, 2);
  }

  importState(content: string): AppState {
    const parsed = JSON.parse(content) as PersistedStateEnvelope;
    if (!parsed || !parsed.state) {
      throw new Error('导入文件格式不正确');
    }
    const base = createDefaultState();
    const state: AppState = {
      ...base,
      ...parsed.state,
      version: APP_VERSION,
    };
    if (!state.accounts || state.accounts.length === 0) {
      state.accounts = [state.account];
    }
    if (state.accounts[0]) {
      state.account = state.accounts[0];
    }
    if (!state.snapshots || state.snapshots.length === 0) {
      state.snapshots = [DEFAULT_SNAPSHOT(state.account)];
    }
    // 迁移 v1 数据
    if (!state.reconciliations || state.reconciliations.length === 0) {
      const migrated = migrateV1ToV2(state);
      state.reconciliations = migrated.reconciliations;
      state.ledgerEntries = migrated.ledgerEntries;
      state.eventOverrides = migrated.eventOverrides;
    }
    if (!state.ledgerEntries) state.ledgerEntries = [];
    if (!state.eventOverrides) state.eventOverrides = [];
    return state;
  }
}
