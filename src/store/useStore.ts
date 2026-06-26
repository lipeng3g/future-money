import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DATA_VERSION, type AppData } from '@/types';
import { mergeAppData } from '@/utils/backup';
import { createAccountsSlice } from './slices/accountsSlice';
import { createCategoriesSlice } from './slices/categoriesSlice';
import { createSettingsSlice, initialSettings } from './slices/settingsSlice';
import { createTransactionsSlice } from './slices/transactionsSlice';
import type { Store } from './types';

const PERSIST_KEY = 'future-money';

export const useStore = create<Store>()(
  persist(
    (...a) => {
      const [set, get] = a;
      return {
        ...createAccountsSlice(...a),
        ...createTransactionsSlice(...a),
        ...createCategoriesSlice(...a),
        ...createSettingsSlice(...a),

        exportData: (): AppData => {
          const { accounts, transactions, series, categories } = get();
          return { version: DATA_VERSION, accounts, transactions, series, categories };
        },

        importData: (data, mode = 'replace') => {
          const { accounts, transactions, series, categories } = get();
          const next =
            mode === 'merge'
              ? mergeAppData({ version: DATA_VERSION, accounts, transactions, series, categories }, data)
              : data;
          set({
            accounts: next.accounts,
            transactions: next.transactions,
            series: next.series,
            categories: next.categories,
          });
        },

        resetAll: () => {
          set({ accounts: [], transactions: [], series: [], categories: [], ...initialSettings });
        },
      };
    },
    {
      name: PERSIST_KEY,
      version: DATA_VERSION,
      partialize: (s) => ({
        accounts: s.accounts,
        transactions: s.transactions,
        series: s.series,
        categories: s.categories,
        theme: s.theme,
        rangePreset: s.rangePreset,
        granularity: s.granularity,
        visibleAccountIds: s.visibleAccountIds,
        showTotal: s.showTotal,
      }),
    },
  ),
);
