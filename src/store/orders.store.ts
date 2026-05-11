import { create } from 'zustand';
import { OdooOrder, OdooOrderLine } from '@/types/odoo.types';
import { OdooOrderService } from '@/services/odoo.service';

interface OrdersState {
  orders: OdooOrder[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  hasMore: boolean;
  orderGroups: any[];
  currentGroupIndex: number;
  // Date range filters
  dateFrom: string;
  dateTo: string;
  stateFilter: string; // 'all' | 'draft' | 'sent' | 'sale' | 'done' | 'cancel'

  setSearchQuery: (query: string) => void;
  setDateFrom: (date: string) => void;
  setDateTo: (date: string) => void;
  setStateFilter: (state: string) => void;
  clearFilters: () => void;
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
  orderGroups: [],
  currentGroupIndex: 0,
  dateFrom: '',
  dateTo: '',
  stateFilter: 'all',

  setSearchQuery: (query) => {
    set({ searchQuery: query, currentGroupIndex: 0, orderGroups: [] });
  },

  setDateFrom: (date) => {
    set({ dateFrom: date, currentGroupIndex: 0, orderGroups: [] });
  },

  setDateTo: (date) => {
    set({ dateTo: date, currentGroupIndex: 0, orderGroups: [] });
  },

  setStateFilter: (state) => {
    set({ stateFilter: state, currentGroupIndex: 0, orderGroups: [] });
  },

  clearFilters: () => {
    set({ dateFrom: '', dateTo: '', stateFilter: 'all', searchQuery: '', currentGroupIndex: 0, orderGroups: [] });
  },

  fetchOrders: async (reset = false) => {
    const { searchQuery, dateFrom, dateTo, stateFilter, orderGroups, currentGroupIndex, orders, isLoading, hasMore } = get();

    if (isLoading) return;
    if (!reset && !hasMore) return;

    set({ isLoading: true, error: null });

    try {
      let groups = orderGroups;
      let nextIndex = currentGroupIndex;

      if (reset) {
        groups = await OdooOrderService.getOrderGroups(searchQuery, dateFrom, dateTo, stateFilter);
        nextIndex = 0;
        set({ orderGroups: groups });
      }

      if (groups.length === 0 || nextIndex >= groups.length) {
        set({ orders: reset ? [] : orders, hasMore: false, isLoading: false });
        return;
      }

      const groupDomain = groups[nextIndex].__domain;
      const newOrders = await OdooOrderService.getOrdersByDomain(groupDomain);

      set({
        orders: reset ? newOrders : [...orders, ...newOrders],
        currentGroupIndex: nextIndex + 1,
        hasMore: nextIndex + 1 < groups.length,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Error fetching orders', isLoading: false });
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
