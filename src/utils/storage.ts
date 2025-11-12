import type { AppState, PersistedStateEnvelope } from '@/types/storage';
import { APP_VERSION, DEFAULT_ACCOUNT_CONFIG, DEFAULT_PREFERENCES } from '@/utils/defaults';

const STORAGE_KEY = 'futureMoney.state';

const isStorageAvailable = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export const createDefaultState = (): AppState => ({
  version: APP_VERSION,
  account: DEFAULT_ACCOUNT_CONFIG(),
  events: [],
  preferences: DEFAULT_PREFERENCES(),
});

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
      return {
        ...createDefaultState(),
        ...parsed.state,
        version: APP_VERSION,
      };
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
    return {
      ...createDefaultState(),
      ...parsed.state,
      version: APP_VERSION,
    };
  }
}
