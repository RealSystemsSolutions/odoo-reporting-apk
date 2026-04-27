// ─── Odoo Types ────────────────────────────────────────────────────────────────

export interface OdooTenant {
  url: string;
  db: string;
}

export interface OdooUser {
  uid: number;
  name: string;
  sessionId: string;
  tenant: OdooTenant;
}

export type ReportingPeriod = 'today' | 'week' | 'month';

// ─── KPI ───────────────────────────────────────────────────────────────────────

export interface KpiData {
  id: string;
  label: string;
  value: number;
  unit: '$' | '%' | '#';
  /** Percentage change vs previous period */
  change: number;
  icon: string;
  accentColor: string;
}

// ─── Charts ────────────────────────────────────────────────────────────────────

export interface SalesPoint {
  date: string; // e.g. "Feb 01"
  amount: number;
}

export interface TopProduct {
  id: string;
  name: string;
  qty: number;
  revenue: number;
}

export interface CategorySlice {
  id: string;
  category: string;
  value: number;
  color: string;
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export type TransactionState = 'paid' | 'pending' | 'overdue' | 'draft';

export interface Transaction {
  id: number;
  name: string;
  partner: string;
  date: string;
  amount: number;
  state: TransactionState;
}

// ─── Dashboard payload ─────────────────────────────────────────────────────────

export interface DashboardData {
  kpis: KpiData[];
  salesEvolution: SalesPoint[];
  topProducts: TopProduct[];
  categoryDistribution: CategorySlice[];
  recentTransactions: Transaction[];
}

// ─── Products ──────────────────────────────────────────────────────────────────

export interface OdooProduct {
  id: number;
  name: string;
  default_code: string | false;
  barcode: string | false;
  list_price: number;
  standard_price: number;
  categ_id: [number, string] | false;
  type: string;
  qty_available: number;
  product_variant_count: number;
  image_128: string | false;
  active: boolean;
}

// ─── Sales (Quotations / Orders) ───────────────────────────────────────────────

export interface OdooPartner {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
  active: boolean;
}

export interface OdooOrderLine {
  id: number;
  product_id: [number, string] | false;
  name: string;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  tax_id?: number[];
  // If it's a new line, we might not have an id yet
}

export interface OdooOrder {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  date_order: string | false;
  amount_total: number;
  state: 'draft' | 'sent' | 'sale' | 'done' | 'cancel';
  order_line: number[];
}
