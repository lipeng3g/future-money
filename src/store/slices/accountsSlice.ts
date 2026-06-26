import type { Account, Money } from '@/types';
import { uid } from '@/utils/id';
import { nextColor } from '@/utils/palette';
import type { SliceCreator } from '../types';

export interface AccountInput {
  name: string;
  openingBalance: Money;
  openingDate: string;
  color?: string;
  categoryId?: string;
}

export interface AccountsSlice {
  accounts: Account[];
  addAccount: (input: AccountInput) => string;
  updateAccount: (id: string, patch: Partial<AccountInput>) => void;
  archiveAccount: (id: string, archived: boolean) => void;
  removeAccount: (id: string) => void;
}

export const createAccountsSlice: SliceCreator<AccountsSlice> = (set, get) => ({
  accounts: [],

  addAccount: (input) => {
    const now = Date.now();
    const account: Account = {
      id: uid(),
      name: input.name.trim(),
      categoryId: input.categoryId,
      openingBalance: input.openingBalance,
      openingDate: input.openingDate,
      color: input.color ?? nextColor(get().accounts.length),
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ accounts: [...s.accounts, account] }));
    return account.id;
  },

  updateAccount: (id, patch) => {
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a,
      ),
    }));
  },

  archiveAccount: (id, archived) => {
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id ? { ...a, archived, updatedAt: Date.now() } : a,
      ),
    }));
  },

  removeAccount: (id) => {
    set((s) => ({
      accounts: s.accounts.filter((a) => a.id !== id),
      transactions: s.transactions.filter((t) => t.accountId !== id),
      series: s.series.filter((ser) => ser.accountId !== id),
    }));
  },
});
