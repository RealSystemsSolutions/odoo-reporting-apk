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

export type ReportingPeriod = 'yesterday' | 'today' | 'week' | 'month';

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
  is_storable?: boolean;
  qty_available: number;
  product_variant_count: number;
  image_128: string | false;
  active: boolean;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  product_variant_id?: [number, string] | false;
  
  // Custom fields (POS / Supermarket)
  food_stamp?: boolean;
  wic?: boolean;
  fsa?: boolean;
  age_verification?: boolean;
  open_price?: boolean;
  scalable?: boolean;
  rollup_pricing?: boolean;
  prefix_price?: boolean;
  wt_format?: boolean;
  mix_and_match?: boolean;
  promotion_description?: string;
  promotion_qty?: number;
  promotion_price?: number;
  modifier_1?: string;
  modifier_2?: string;
  modifier_3?: string;
  is_kitchen?: boolean;
  office_copy?: boolean;
  print1?: boolean;
  print2?: boolean;
  print3?: boolean;
  print4?: boolean;
  taxable?: boolean;
  tax_amount?: number;
  follow_department?: boolean;
  family_code?: boolean;
  visible?: boolean;
  margin?: number;
  alert_quantity?: number;
  size?: string;
  brand?: string;
  label?: string;
  group_id?: string;
  label_description?: string;
  sibling_item?: [number, string] | false;
}

export interface OdooProductCategory {
  id: number;
  name: string;
  complete_name?: string;
  // Custom fields
  food_stamp?: boolean;
  wic?: boolean;
  fsa?: boolean;
  age_verification?: boolean;
  taxable?: boolean;
  age_allow?: number;
  taxes_id?: number[];
  scalable?: boolean;
  open_price?: boolean;
  mix_and_match?: boolean;
  prefix_price?: boolean;
  wt_format?: boolean;
  visible?: boolean;
  alphabetic_order?: boolean;
  family_code?: boolean;
  print1?: boolean;
  print2?: boolean;
  print3?: boolean;
  print4?: boolean;
  margin?: number;
  screen_link?: number;
  scale_dept_id?: number;
  index_position?: number;
  major_group_id?: number;
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
  
  // Custom POS fields
  pos_product_order_id?: string;
  pos_invoice_id?: string;
  pos_is_promotion_price?: boolean;
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
  
  // Custom POS fields
  pos_receipt_number?: string;
  pos_payment_date?: string;
  pos_invoice_status?: string;
  pos_subtotal?: number;
  pos_tax?: number;
  pos_total?: number;
  pos_balance?: number;
  pos_tip?: number;
  pos_merchant_fee?: number;
  pos_discount?: number;
  pos_discount_type?: string;
  pos_total_paid?: number;
  pos_is_refund?: boolean;
  pos_is_refund_sale?: boolean;
  pos_transfer_type?: string;
  pos_order_type?: string;
  pos_table_id?: string;
  pos_apply_tip?: boolean;
  pos_client_age?: number;
  pos_application_user_id?: string;
  pos_payment_ids?: number[];
  pos_payment_method_summary?: string;
}

// ─── Reports: Sales & Margin Analysis ──────────────────────────────────────────

export interface SalesMarginDataPoint {
  month: string;
  revenue: number;
  cogs: number; // Cost of Goods Sold
}

export interface SalesMarginByCategory {
  id: string;
  category: string;
  revenue: number;
  cogs: number;
  margin: number;
  marginPercent: number;
  color: string;
}

export interface SalesMarginReport {
  monthlyComparison: SalesMarginDataPoint[];
  categoryBreakdown: SalesMarginByCategory[];
}

// ─── Reports: Inventory Turnover & Stock Alerts ────────────────────────────────

export type StockHealthStatus = 'critical' | 'warning' | 'healthy';

export interface InventoryItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  reorderPoint: number;
  status: StockHealthStatus;
  warehouse: string;
  lastMovement: string;
  turnoverRate: number; // Rotations per period
}

export interface InventoryReport {
  items: InventoryItem[];
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
}

// ─── Reports: CRM Pipeline ────────────────────────────────────────────────────

export interface CrmLeadOpportunity {
  id: number;
  name: string;
  partnerName: string;
  expectedRevenue: number;
  probability: number;
  stage: string;
  stageIndex: number;
}

export interface CrmStageData {
  stageId: number;
  stageName: string;
  stageIndex: number;
  totalOpportunities: number;
  totalExpectedRevenue: number;
  opportunities: CrmLeadOpportunity[];
}

export interface CrmPipelineReport {
  stages: CrmStageData[];
  totalRevenue: number;
  totalLeads: number;
}

// ─── Reports: POS Shift Analysis ──────────────────────────────────────────────

export interface PosHourlySales {
  hour: number; // 0-23
  label: string; // e.g., "14:00"
  sales: number;
  transactionCount: number;
}

export interface PosSessionMetrics {
  sessionId: number;
  sessionName: string;
  status: 'open' | 'closed';
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  cashExpected: number;
  cashActual: number;
  discrepancy: number;
  discrepancyPercent: number;
}

export interface PosShiftReport {
  metrics: PosSessionMetrics[];
  todayHourlySales: PosHourlySales[];
  totalDaySales: number;
  totalTransactions: number;
  averageTicket: number;
}

// ─── Reports: Master Custom Report ──────────────────────────────────────────

export interface MasterReportCategoryLine {
  id: number;
  category_name: string;
  number_sold: number;
  gross_revenue: number;
  gross_revenue_percent: number;
}

export interface MasterReportPaymentLine {
  id: number;
  name: string;
  count_payment: number;
  total: number;
}

export interface MasterReportFinancialLine {
  id: number;
  index_record: number;
  description: string;
  count: number;
  amount: number;
}

export interface MasterReportData {
  id: number;
  start_date: string;
  end_date: string;
  report_generated: string;
  category_line_ids: MasterReportCategoryLine[];
  payment_line_ids: MasterReportPaymentLine[];
  payment_methods_line_ids: MasterReportPaymentLine[];
  financial_line_ids: MasterReportFinancialLine[];
  display_name: string;
}

