import { create } from 'zustand';
import type { PurchasesState } from '@/types/purchase.types';
import { OdooPurchaseService } from '@/services/odoo.service';

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
  kpis: {
    pendingApprovals: 0,
    committedSpendThisMonth: 0,
  },
  orders: [],
  selectedOrder: null,
  selectedOrderLines: [],
  isLoading: false,
  isLoadingLines: false,
  isConfirming: false,
  error: null,

  /**
   * Fetches KPIs and the main list of purchase orders in parallel.
   */
  fetchData: async () => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const [kpis, orders] = await Promise.all([
        OdooPurchaseService.getKpis(),
        OdooPurchaseService.getOrders(30),
      ]);

      set({ kpis, orders, isLoading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error loading purchase data';
      set({ error: message, isLoading: false });
    }
  },

  /**
   * Selects a purchase order and fetches its order lines.
   */
  selectOrder: async (order) => {
    set({ selectedOrder: order, selectedOrderLines: [], isLoadingLines: true });

    try {
      const lines = await OdooPurchaseService.getOrderLines(order.order_line);
      set({ selectedOrderLines: lines, isLoadingLines: false });
    } catch (err: unknown) {
      console.error('Error fetching purchase order lines:', err);
      set({ isLoadingLines: false });
    }
  },

  clearSelection: () => {
    set({ selectedOrder: null, selectedOrderLines: [] });
  },

  /**
   * Calls button_confirm on Odoo and refreshes data on success.
   */
  confirmPurchaseOrder: async (id) => {
    set({ isConfirming: true });

    try {
      const success = await OdooPurchaseService.confirmOrder(id);

      if (success) {
        // Refresh data after confirmation
        await get().fetchData();
        set({ selectedOrder: null, selectedOrderLines: [], isConfirming: false });
      } else {
        set({ isConfirming: false });
      }

      return success;
    } catch (err: unknown) {
      console.error('confirmPurchaseOrder store error:', err);
      set({ isConfirming: false });
      return false;
    }
  },
}));
