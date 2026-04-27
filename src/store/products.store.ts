import { create } from 'zustand';
import { OdooProductService } from '@/services/odoo.service';
import { OdooProduct } from '@/types/odoo.types';

interface ProductsState {
  products: OdooProduct[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  hasMore: boolean;

  setSearchQuery: (query: string) => void;
  fetchProducts: (refresh?: boolean) => Promise<void>;
  createProduct: (data: Partial<OdooProduct>) => Promise<boolean>;
  updateProduct: (id: number, data: Partial<OdooProduct>) => Promise<boolean>;
  archiveProduct: (id: number) => Promise<boolean>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  hasMore: true,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().fetchProducts(true);
  },

  fetchProducts: async (refresh = false) => {
    const { products, searchQuery, isLoading, hasMore } = get();
    if (isLoading) return;
    if (!refresh && !hasMore) return;

    set({ isLoading: true, error: null });

    try {
      const offset = refresh ? 0 : products.length;
      const limit = 20;
      const newProducts = await OdooProductService.getProducts(limit, offset, searchQuery);
      
      set({
        products: refresh ? newProducts : [...products, ...newProducts],
        hasMore: newProducts.length === limit,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Error fetching products', isLoading: false });
    }
  },

  createProduct: async (data: Partial<OdooProduct>) => {
    set({ isLoading: true, error: null });
    try {
      await OdooProductService.createProduct(data);
      await get().fetchProducts(true); // Refresh list
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Error creating product', isLoading: false });
      return false;
    }
  },

  updateProduct: async (id: number, data: Partial<OdooProduct>) => {
    set({ isLoading: true, error: null });
    try {
      await OdooProductService.updateProduct(id, data);
      await get().fetchProducts(true); // Refresh list
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Error updating product', isLoading: false });
      return false;
    }
  },

  archiveProduct: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await OdooProductService.archiveProduct(id);
      set((state) => ({
        products: state.products.filter(p => p.id !== id),
        isLoading: false
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Error archiving product', isLoading: false });
      return false;
    }
  },
}));
