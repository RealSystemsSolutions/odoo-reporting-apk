import { create } from 'zustand';
import { OdooOrder, OdooOrderLine } from '@/types/odoo.types';
import { OdooOrderService } from '@/services/odoo.service';

interface OrdersState {
  orders: OdooOrder[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  hasMore: boolean;
  page: number;

  setSearchQuery: (query: string) => void;
  fetchOrders: (reset?: boolean) => Promise<void>;
  createOrder: (data: Partial<OdooOrder>) => Promise<number | false>;
  updateOrder: (id: number, data: Partial<OdooOrder>) => Promise<boolean>;
  confirmOrder: (id: number) => Promise<boolean>;
  cancelOrder: (id: number) => Promise<boolean>;
  fetchOrderLines: (lineIds: number[]) => Promise<OdooOrderLine[]>;
}

const LIMIT = 20;

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  hasMore: true,
  page: 0,

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    // Trigger search with debounce in component
  },

  fetchOrders: async (reset = false) => {
    const { searchQuery, page, orders, isLoading, hasMore } = get();

    if (isLoading) return;
    if (!reset && !hasMore) return;

    set({ isLoading: true, error: null });

    const currentPage = reset ? 0 : page;

    try {
      const newOrders = await OdooOrderService.getOrders(
        LIMIT,
        currentPage * LIMIT,
        searchQuery
      );

      set({
        orders: reset ? newOrders : [...orders, ...newOrders],
        page: currentPage + 1,
        hasMore: newOrders.length === LIMIT,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Error al obtener órdenes', isLoading: false });
    }
  },

  fetchOrderLines: async (lineIds: number[]) => {
    try {
      return await OdooOrderService.getOrderLines(lineIds);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  createOrder: async (data) => {
    try {
      const newId = await OdooOrderService.createOrder(data);
      await get().fetchOrders(true);
      return newId;
    } catch (err) {
      console.error('Error creating order:', err);
      return false;
    }
  },

  updateOrder: async (id, data) => {
    try {
      const success = await OdooOrderService.updateOrder(id, data);
      if (success) {
        await get().fetchOrders(true);
      }
      return success;
    } catch (err) {
      console.error('Error updating order:', err);
      return false;
    }
  },

  confirmOrder: async (id) => {
    try {
      const success = await OdooOrderService.confirmOrder(id);
      if (success) {
        await get().fetchOrders(true);
      }
      return success;
    } catch (err) {
      console.error('Error confirming order:', err);
      return false;
    }
  },

  cancelOrder: async (id) => {
    try {
      const success = await OdooOrderService.cancelOrder(id);
      if (success) {
        await get().fetchOrders(true);
      }
      return success;
    } catch (err) {
      console.error('Error canceling order:', err);
      return false;
    }
  },
}));
