import type { AppSettings, Granularity, Theme } from '@/types';
import type { SliceCreator } from '../types';

export const initialSettings: AppSettings = {
  theme: 'light',
  rangePreset: 'P1M-F12M',
  granularity: 'month',
  visibleAccountIds: [],
  showTotal: true,
};

export interface SettingsSlice extends AppSettings {
  setTheme: (theme: Theme) => void;
  setRangePreset: (preset: string) => void;
  setGranularity: (granularity: Granularity) => void;
  /** 设置图表可见账户白名单；空数组表示全部显示 */
  setVisibleAccountIds: (ids: string[]) => void;
  toggleTotal: () => void;
}

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set) => ({
  ...initialSettings,

  setTheme: (theme) => set({ theme }),
  setRangePreset: (rangePreset) => set({ rangePreset }),
  setGranularity: (granularity) => set({ granularity }),
  setVisibleAccountIds: (visibleAccountIds) => set({ visibleAccountIds }),
  toggleTotal: () => set((s) => ({ showTotal: !s.showTotal })),
});
