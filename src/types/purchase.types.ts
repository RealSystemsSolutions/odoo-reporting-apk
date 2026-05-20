// ─── Purchase Module Types ───────────────────────────────────────────────────

export type PurchaseOrderState = 'draft' | 'sent' | 'purchase' | 'done' | 'cancel';

/**
 * Represents a purchase.order.line record from Odoo.
 */
export interface OdooPurchaseOrderLine {
  id: number;
  product_id: [number, string] | false;
  name: string;
  product_qty: number;
  price_unit: number;
  price_subtotal: number;
  product_uom: [number, string] | false;
}

/**
 * Represents a purchase.order record from Odoo.
 */
export interface OdooPurchaseOrder {
  id: number;
  /** Reference e.g. "P00014" */
  name: string;
  /** Supplier: [id, name] */
  partner_id: [number, string] | false;
  /** Order date (ISO string or false) */
  date_order: string | false;
  /** Approval date */
  date_approve: string | false;
  /** Total amount including taxes */
  amount_total: number;
  /** Odoo purchase order state */
  state: PurchaseOrderState;
  /** IDs of associated order lines */
  order_line: number[];
}

// ─── Aggregated KPIs ─────────────────────────────────────────────────────────

export interface PurchaseKpis {
  /** Count of POs in draft or sent state (pending approval) */
  pendingApprovals: number;
  /** Sum of amount_total for confirmed POs this month */
  committedSpendThisMonth: number;
}

// ─── Store State ──────────────────────────────────────────────────────────────

export interface PurchasesState {
  kpis: PurchaseKpis;
  orders: OdooPurchaseOrder[];
  selectedOrder: OdooPurchaseOrder | null;
  selectedOrderLines: OdooPurchaseOrderLine[];
  isLoading: boolean;
  isLoadingLines: boolean;
  isConfirming: boolean;
  error: string | null;

  fetchData: () => Promise<void>;
  selectOrder: (order: OdooPurchaseOrder) => Promise<void>;
  clearSelection: () => void;
  confirmPurchaseOrder: (id: number) => Promise<boolean>;
}
