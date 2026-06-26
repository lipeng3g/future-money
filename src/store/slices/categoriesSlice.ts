import type { Category } from '@/types';
import { uid } from '@/utils/id';
import { nextColor } from '@/utils/palette';
import type { SliceCreator } from '../types';

export interface CategoryInput {
  name: string;
  color?: string;
}

export interface CategoriesSlice {
  categories: Category[];
  addCategory: (input: CategoryInput) => string;
  updateCategory: (id: string, patch: Partial<CategoryInput>) => void;
  removeCategory: (id: string) => void;
}

const clearCategoryRef = <T extends { categoryId?: string }>(items: T[], id: string): T[] =>
  items.map((item) => (item.categoryId === id ? { ...item, categoryId: undefined } : item));

export const createCategoriesSlice: SliceCreator<CategoriesSlice> = (set, get) => ({
  categories: [],

  addCategory: (input) => {
    const category: Category = {
      id: uid(),
      name: input.name.trim(),
      color: input.color ?? nextColor(get().categories.length),
      createdAt: Date.now(),
    };
    set((s) => ({ categories: [...s.categories, category] }));
    return category.id;
  },

  updateCategory: (id, patch) => {
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  removeCategory: (id) => {
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      accounts: clearCategoryRef(s.accounts, id),
      transactions: clearCategoryRef(s.transactions, id),
      series: clearCategoryRef(s.series, id),
    }));
  },
});
