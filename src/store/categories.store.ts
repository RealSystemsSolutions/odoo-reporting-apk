import { create } from 'zustand';
import type { OdooProductCategory } from '@/types/odoo.types';
import { OdooCategoryService } from '@/services/odoo.service';

interface CategoriesState {
  categories: OdooProductCategory[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  hasMore: boolean;
  
  setSearchQuery: (query: string) => void;
  fetchCategories: (reset?: boolean) => Promise<void>;
  createCategory: (data: Partial<OdooProductCategory>) => Promise<void>;
  updateCategory: (id: number, data: Partial<OdooProductCategory>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  hasMore: true,

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchCategories(true);
  },

  fetchCategories: async (reset = false) => {
    const { categories, searchQuery, isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const offset = reset ? 0 : categories.length;
      const data = await OdooCategoryService.getCategories(50, offset, searchQuery);
      
      set({
        categories: reset ? data : [...categories, ...data],
        isLoading: false,
        hasMore: data.length === 50,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch categories', isLoading: false });
    }
  },

  createCategory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await OdooCategoryService.createCategory(data);
      await get().fetchCategories(true);
    } catch (e: any) {
      set({ error: e.message || 'Failed to create category', isLoading: false });
      throw e;
    }
  },

  updateCategory: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await OdooCategoryService.updateCategory(id, data);
      await get().fetchCategories(true);
    } catch (e: any) {
      set({ error: e.message || 'Failed to update category', isLoading: false });
      throw e;
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await OdooCategoryService.deleteCategory(id);
      await get().fetchCategories(true);
    } catch (e: any) {
      set({ error: e.message || 'Failed to delete category', isLoading: false });
      throw e;
    }
  },
}));
