// ─── Purchase Module Types ───────────────────────────────────────────────────

export type PurchaseOrderState = 'draft' | 'sent' | 'purchase' | 'done' | 'cancel';

export interface OdooPurchaseOrderLine {
  id: number;
  product_id: [number, string] | false;
  name: string;
  product_qty: number;
  price_unit: number;
  price_subtotal: number;
  product_uom: [number, string] | false;
}

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
  /** IDs of associated stock.picking (receipts) */
  picking_ids: number[];
  /** IDs of associated account.move (vendor bills) */
  invoice_ids: number[];
  /** Internal notes / terms */
  notes: string | false;
}

// ─── Related Models ───────────────────────────────────────────────────────────

export interface OdooStockPicking {
  id: number;
  name: string;
  state: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancel';
  scheduled_date: string | false;
  date_done: string | false;
}

export interface OdooAccountMove {
  id: number;
  name: string;
  state: 'draft' | 'posted' | 'cancel';
  invoice_date: string | false;
  amount_total: number;
  payment_state: string;
}

export interface OdooMailMessage {
  id: number;
  author_id: [number, string] | false;
  date: string;
  body: string;
  message_type: string;
  subtype_id: [number, string] | false;
}

// ORM write commands for One2many fields (Commands 0/1/2)
export type LineOrmCommand =
  | [0, 0, Record<string, unknown>]      // Create new line
  | [1, number, Record<string, unknown>] // Update existing line
  | [2, number, false];                  // Delete existing line

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
  /** True while any lifecycle action (cancel/lock/unlock) is running */
  isActionLoading: boolean;
  pickings: OdooStockPicking[];
  invoices: OdooAccountMove[];
  messages: OdooMailMessage[];
  isLoadingPickings: boolean;
  isLoadingInvoices: boolean;
  isLoadingMessages: boolean;
  isPostingMessage: boolean;
  error: string | null;

  fetchData: () => Promise<void>;
  selectOrder: (order: OdooPurchaseOrder) => Promise<void>;
  clearSelection: () => void;
  /** Re-fetches the selected order and its lines after a state change. */
  refreshSelectedOrder: (id: number) => Promise<void>;
  confirmPurchaseOrder: (id: number) => Promise<boolean>;
  cancelPurchaseOrder: (id: number) => Promise<boolean>;
  lockPurchaseOrder: (id: number) => Promise<boolean>;
  unlockPurchaseOrder: (id: number) => Promise<boolean>;
  /** Applies ORM commands (0/1/2) to order_line and re-fetches the order. */
  updatePurchaseOrder: (id: number, commands: LineOrmCommand[]) => Promise<boolean>;
  fetchPickings: (pickingIds: number[]) => Promise<void>;
  fetchInvoices: (invoiceIds: number[]) => Promise<void>;
  fetchMessages: (orderId: number) => Promise<void>;
  postMessage: (orderId: number, body: string) => Promise<boolean>;
}
