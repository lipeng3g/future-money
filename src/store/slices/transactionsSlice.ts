import type { Money, Series, Transaction } from '@/types';
import { uid } from '@/utils/id';
import { expandRecurrence, type RecurrenceInput } from '@/utils/recurrence';
import type { SliceCreator } from '../types';

export interface TransactionInput {
  accountId: string;
  date: string;
  amount: Money;
  categoryId?: string;
  note?: string;
}

export type TransactionPatch = Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;

export interface TransactionsSlice {
  transactions: Transaction[];
  series: Series[];
  addTransaction: (input: TransactionInput) => string;
  addRecurring: (input: RecurrenceInput) => string;
  updateTransaction: (id: string, patch: TransactionPatch) => void;
  removeTransaction: (id: string) => void;
  batchUpdateTransactions: (ids: string[], patch: TransactionPatch) => void;
  batchDeleteTransactions: (ids: string[]) => void;
}

/** 删除变动后，移除不再拥有任何记录的周期组，避免残留空元数据 */
function pruneEmptySeries(series: Series[], transactions: Transaction[]): Series[] {
  const used = new Set(transactions.map((t) => t.seriesId).filter(Boolean));
  return series.filter((s) => used.has(s.id));
}

export const createTransactionsSlice: SliceCreator<TransactionsSlice> = (set) => ({
  transactions: [],
  series: [],

  addTransaction: (input) => {
    const now = Date.now();
    const tx: Transaction = {
      id: uid(),
      accountId: input.accountId,
      date: input.date,
      amount: input.amount,
      categoryId: input.categoryId,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ transactions: [...s.transactions, tx] }));
    return tx.id;
  },

  addRecurring: (input) => {
    const { series, transactions } = expandRecurrence(input);
    set((s) => ({
      series: [...s.series, series],
      transactions: [...s.transactions, ...transactions],
    }));
    return series.id;
  },

  updateTransaction: (id, patch) => {
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
      ),
    }));
  },

  removeTransaction: (id) => {
    set((s) => {
      const transactions = s.transactions.filter((t) => t.id !== id);
      return { transactions, series: pruneEmptySeries(s.series, transactions) };
    });
  },

  batchUpdateTransactions: (ids, patch) => {
    const idSet = new Set(ids);
    const now = Date.now();
    set((s) => ({
      transactions: s.transactions.map((t) =>
        idSet.has(t.id) ? { ...t, ...patch, updatedAt: now } : t,
      ),
    }));
  },

  batchDeleteTransactions: (ids) => {
    const idSet = new Set(ids);
    set((s) => {
      const transactions = s.transactions.filter((t) => !idSet.has(t.id));
      return { transactions, series: pruneEmptySeries(s.series, transactions) };
    });
  },
});
