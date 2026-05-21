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
  isActionLoading: false,
  pickings: [],
  invoices: [],
  messages: [],
  isLoadingPickings: false,
  isLoadingInvoices: false,
  isLoadingMessages: false,
  isPostingMessage: false,
  pickingMoveLines: [],
  isLoadingMoveLines: false,
  isValidatingPicking: false,
  error: null,

  // ─── List & selection ───────────────────────────────────────────────────

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
      const message = err instanceof Error ? err.message : 'Error loading purchase data';
      set({ error: message, isLoading: false });
    }
  },

  selectOrder: async (order) => {
    set({ selectedOrder: order, selectedOrderLines: [], isLoadingLines: true });
    try {
      const lines = await OdooPurchaseService.getOrderLines(order.order_line);
      set({ selectedOrderLines: lines, isLoadingLines: false });
    } catch (err: unknown) {
      console.error('selectOrder lines error:', err);
      set({ isLoadingLines: false });
    }
  },

  clearSelection: () => {
    set({
      selectedOrder: null,
      selectedOrderLines: [],
      pickings: [],
      invoices: [],
      messages: [],
      pickingMoveLines: [],
    });
  },

  /**
   * Re-reads the order (with all relational fields) and its lines after any mutation.
   * Also triggers a background refresh of the main list + KPIs.
   */
  refreshSelectedOrder: async (id) => {
    try {
      const order = await OdooPurchaseService.getOrderById(id);
      const lines = await OdooPurchaseService.getOrderLines(order.order_line);
      set({ selectedOrder: order, selectedOrderLines: lines });
      // Refresh list in background; don't await to keep UI responsive
      get().fetchData();
    } catch (err: unknown) {
      console.error('refreshSelectedOrder error:', err);
    }
  },

  // ─── Lifecycle actions ─────────────────────────────────────────────────

  confirmPurchaseOrder: async (id) => {
    set({ isConfirming: true });
    try {
      const success = await OdooPurchaseService.confirmOrder(id);
      if (success) await get().refreshSelectedOrder(id);
      return success;
    } catch (err: unknown) {
      console.error('confirmPurchaseOrder error:', err);
      return false;
    } finally {
      set({ isConfirming: false });
    }
  },

  cancelPurchaseOrder: async (id) => {
    set({ isActionLoading: true });
    try {
      const success = await OdooPurchaseService.cancelOrder(id);
      if (success) await get().refreshSelectedOrder(id);
      return success;
    } catch (err: unknown) {
      console.error('cancelPurchaseOrder error:', err);
      return false;
    } finally {
      set({ isActionLoading: false });
    }
  },

  unlockPurchaseOrder: async (id) => {
    set({ isActionLoading: true });
    try {
      const success = await OdooPurchaseService.unlockOrder(id);
      if (success) await get().refreshSelectedOrder(id);
      return success;
    } catch (err: unknown) {
      console.error('unlockPurchaseOrder error:', err);
      return false;
    } finally {
      set({ isActionLoading: false });
    }
  },

  updatePurchaseOrder: async (id, commands) => {
    try {
      const success = await OdooPurchaseService.updateOrder(id, commands);
      if (success) await get().refreshSelectedOrder(id);
      return success;
    } catch (err: unknown) {
      console.error('updatePurchaseOrder error:', err);
      return false;
    }
  },

  // ─── Lazy-loaded relational data ───────────────────────────────────────

  fetchPickings: async (pickingIds) => {
    set({ isLoadingPickings: true });
    try {
      const pickings = await OdooPurchaseService.getPickings(pickingIds);
      set({ pickings, isLoadingPickings: false });
    } catch (err: unknown) {
      console.error('fetchPickings error:', err);
      set({ isLoadingPickings: false });
    }
  },

  fetchInvoices: async (invoiceIds) => {
    set({ isLoadingInvoices: true });
    try {
      const invoices = await OdooPurchaseService.getInvoices(invoiceIds);
      set({ invoices, isLoadingInvoices: false });
    } catch (err: unknown) {
      console.error('fetchInvoices error:', err);
      set({ isLoadingInvoices: false });
    }
  },

  fetchMessages: async (orderId) => {
    set({ isLoadingMessages: true });
    try {
      const messages = await OdooPurchaseService.getMessages(orderId);
      set({ messages, isLoadingMessages: false });
    } catch (err: unknown) {
      console.error('fetchMessages error:', err);
      set({ isLoadingMessages: false });
    }
  },

  postMessage: async (orderId, body) => {
    set({ isPostingMessage: true });
    try {
      const success = await OdooPurchaseService.postMessage(orderId, body);
      if (success) {
        const messages = await OdooPurchaseService.getMessages(orderId);
        set({ messages });
      }
      return success;
    } catch (err: unknown) {
      console.error('postMessage error:', err);
      return false;
    } finally {
      set({ isPostingMessage: false });
    }
  },

  // ─── Receive Products ──────────────────────────────────────────────────

  fetchPickingMoveLines: async (pickingId) => {
    set({ isLoadingMoveLines: true, pickingMoveLines: [] });
    try {
      const lines = await OdooPurchaseService.getPickingMoveLines(pickingId);
      set({ pickingMoveLines: lines, isLoadingMoveLines: false });
    } catch (err: unknown) {
      console.error('fetchPickingMoveLines error:', err);
      set({ isLoadingMoveLines: false });
    }
  },

  validatePicking: async (pickingId, lines) => {
    set({ isValidatingPicking: true });
    try {
      const success = await OdooPurchaseService.validatePicking(pickingId, lines);
      if (success) {
        const { selectedOrder } = get();
        if (selectedOrder) await get().refreshSelectedOrder(selectedOrder.id);
      }
      return success;
    } catch (err: unknown) {
      console.error('validatePicking error:', err);
      return false;
    } finally {
      set({ isValidatingPicking: false });
    }
  },
}));
