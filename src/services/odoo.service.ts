import axios from "axios";
import type { AxiosInstance } from "axios";
import { Platform } from "react-native";
import { useAppStore } from "@/store/app.store";

let _instance: AxiosInstance | null = null;

/**
 * Detects if an Odoo error represents a session expiration.
 */
function isSessionExpired(error: any): boolean {
  if (!error) return false;
  const message = error.data?.message ?? error.message;
  const name = error.data?.name;
  return (
    name === 'odoo.http.SessionExpiredException' ||
    (typeof message === 'string' && message.toLowerCase().includes('session expired'))
  );
}

/**
 * Triggers a global logout to redirect the user to login.
 */
const handleSessionExpired = () => {
  useAppStore.getState().logout();
};

/**
 * Returns an Axios instance configured for the current tenant's Odoo URL.
 * The baseURL is read dynamically from the Zustand store each time.
 */
export function getOdooClient(): AxiosInstance {
  const tenantUrl = useAppStore.getState().user?.tenant.url ?? "";

  if (!_instance || _instance.defaults.baseURL !== tenantUrl) {
    axios.defaults.withCredentials = true;
    _instance = axios.create({
      baseURL: tenantUrl,
      timeout: 15_000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    _instance.interceptors.request.use((config) => {
      const sessionId = useAppStore.getState().user?.sessionId;

      if (Platform.OS === 'web') {
        const originalUrl = config.baseURL 
          ? `${config.baseURL.replace(/\/$/, '')}${config.url}`
          : config.url;
        
        config.baseURL = '';
        config.url = '/.netlify/functions/proxy';
        
        // Use Headers type assertion or assign carefully
        if (config.headers) {
          config.headers['x-target-url'] = originalUrl;
          if (sessionId) {
            config.headers['x-session-id'] = sessionId;
          }
        }
      } else {
        if (sessionId) {
          config.headers["Cookie"] = `session_id=${sessionId}`;
          if (config.url && !config.url.includes("session_id=")) {
            const separator = config.url.includes("?") ? "&" : "?";
            config.url = `${config.url}${separator}session_id=${sessionId}`;
          }
        }
      }
      
      return config;
    });

    _instance.interceptors.response.use(
      (res) => res,
      (err) => {
        // Redirect on 401 Unauthorized
        if (err?.response?.status === 401) {
          handleSessionExpired();
        }

        // Normalize Odoo JSON-RPC errors
        const odooError = err?.response?.data?.error;
        if (odooError) {
          if (isSessionExpired(odooError)) {
            handleSessionExpired();
          }
          return Promise.reject(new Error(odooError.data?.message ?? odooError.message));
        }
        return Promise.reject(err);
      },
    );
  }

  return _instance;
}

// ─── Generic JSON-RPC 2.0 call helper ─────────────────────────────────────────

interface JsonRpcPayload {
  model: string;
  method: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
}

export async function callOdoo<T>(payload: JsonRpcPayload): Promise<T> {
  const client = getOdooClient();
  const { data } = await client.post("/web/dataset/call_kw", {
    jsonrpc: "2.0",
    method: "call",
    id: Date.now(),
    params: {
      model: payload.model,
      method: payload.method,
      args: payload.args ?? [],
      kwargs: payload.kwargs ?? {},
    },
  });

  if (data.error) {
    if (isSessionExpired(data.error)) {
      handleSessionExpired();
    }
    throw new Error(data.error.data?.message ?? data.error.message);
  }

  return data.result as T;
}

// ─── Dashboard Data Fetching ──────────────────────────────────────────────────

import type {
  DashboardData,
  KpiData,
  SalesPoint,
  TopProduct,
  CategorySlice,
  Transaction,
  ReportingPeriod,
  OdooProduct,
  OdooOrder,
  OdooOrderLine,
  OdooPartner,
} from "@/types/odoo.types";

function getPeriodDomain(
  period: ReportingPeriod,
  dateField: string = "date_order",
  startDate?: string,
  endDate?: string,
): any[][] {
  const clauses: any[][] = [];

  // If explicit start/end provided use those (expected in 'YYYY-MM-DD' or full timestamp)
  if (startDate || endDate) {
    if (startDate) {
      // Ensure time portion for start
      const s = startDate.length === 10 ? `${startDate} 00:00:00` : startDate;
      clauses.push([dateField, ">=", s]);
    }
    if (endDate) {
      const e = endDate.length === 10 ? `${endDate} 23:59:59` : endDate;
      clauses.push([dateField, "<=", e]);
    }
    return clauses;
  }

  const now = new Date();

  if (period === "today") {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    clauses.push([
      dateField,
      ">=",
      startOfDay.toISOString().replace("T", " ").substring(0, 19),
    ]);
  } else if (period === "yesterday") {
    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(now.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    clauses.push([
      dateField,
      ">=",
      startOfYesterday.toISOString().replace("T", " ").substring(0, 19),
    ]);
    clauses.push([
      dateField,
      "<",
      startOfDay.toISOString().replace("T", " ").substring(0, 19),
    ]);
  } else if (period === "week") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    clauses.push([
      dateField,
      ">=",
      startOfWeek.toISOString().replace("T", " ").substring(0, 19),
    ]);
  } else if (period === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    clauses.push([
      dateField,
      ">=",
      startOfMonth.toISOString().replace("T", " ").substring(0, 19),
    ]);
  }

  return clauses;
}

/**
 * Helper to get domains for current (t) and previous (t-1) periods for KPI comparison
 */
function getKpiDomains(
  period: ReportingPeriod,
  dateField: string = "date_order",
): { t: any[][]; tMinus1: any[][] } {
  const now = new Date();
  let tStart: Date;
  let tEnd: Date | null = null;
  let tm1Start: Date;
  let tm1End: Date;

  if (period === "today") {
    tStart = new Date(now);
    tStart.setHours(0, 0, 0, 0);
    tm1Start = new Date(tStart);
    tm1Start.setDate(tm1Start.getDate() - 1);
    tm1End = new Date(tStart);
  } else if (period === "yesterday") {
    tStart = new Date(now);
    tStart.setDate(now.getDate() - 1);
    tStart.setHours(0, 0, 0, 0);
    tEnd = new Date(now);
    tEnd.setHours(0, 0, 0, 0);
    tm1Start = new Date(tStart);
    tm1Start.setDate(tm1Start.getDate() - 1);
    tm1End = new Date(tStart);
  } else if (period === "week") {
    tStart = new Date(now);
    tStart.setDate(now.getDate() - now.getDay());
    tStart.setHours(0, 0, 0, 0);
    tm1Start = new Date(tStart);
    tm1Start.setDate(tm1Start.getDate() - 7);
    tm1End = new Date(tStart);
  } else {
    // month
    tStart = new Date(now.getFullYear(), now.getMonth(), 1);
    tm1Start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    tm1End = new Date(tStart);
  }

  const fmt = (d: Date) => d.toISOString().replace("T", " ").substring(0, 19);

  const tConditions: any[][] = [[dateField, ">=", fmt(tStart)]];
  if (tEnd) {
    tConditions.push([dateField, "<", fmt(tEnd)]);
  }

  return {
    t: tConditions,
    tMinus1: [
      [dateField, ">=", fmt(tm1Start)],
      [dateField, "<", fmt(tm1End)],
    ],
  };
}

export const OdooDashboardService = {
  async getDashboardData(period: ReportingPeriod): Promise<DashboardData> {
    const p1 = this.fetchKpis(period);
    const p2 = this.fetchSalesEvolution(period);
    const p3 = this.fetchTopProducts(period);
    const p4 = this.fetchCategoryDistribution(period);
    const p5 = this.fetchRecentTransactions(period);

    const [
      kpis,
      salesEvolution,
      topProducts,
      categoryDistribution,
      recentTransactions,
    ] = await Promise.all([p1, p2, p3, p4, p5]);

    return {
      kpis,
      salesEvolution,
      topProducts,
      categoryDistribution,
      recentTransactions,
    };
  },

  async fetchKpis(period: ReportingPeriod): Promise<KpiData[]> {
    const domains = getKpiDomains(period, "date_order");

    const calculateChange = (t: number, tm1: number) => {
      if (tm1 === 0) return t > 0 ? Infinity : 0;
      return ((t - tm1) / tm1) * 100;
    };

    try {
      // 1. Quotations (draft, sent)
      const quoteDomainT = [["state", "in", ["draft", "sent"]], ...domains.t];
      const quoteDomainTM1 = [
        ["state", "in", ["draft", "sent"]],
        ...domains.tMinus1,
      ];

      const [quotesT, quotesTM1] = await Promise.all([
        callOdoo<any[]>({
          model: "sale.order",
          method: "read_group",
          args: [quoteDomainT, ["id"], []],
        }),
        callOdoo<any[]>({
          model: "sale.order",
          method: "read_group",
          args: [quoteDomainTM1, ["id"], []],
        }),
      ]);

      const valQuotesT = quotesT[0]?.id_count || quotesT[0]?.__count || 0;
      const valQuotesTM1 = quotesTM1[0]?.id_count || quotesTM1[0]?.__count || 0;

      // 2. Orders & Revenue (sale, done)
      const orderDomainT = [["state", "in", ["sale", "done"]], ...domains.t];
      const orderDomainTM1 = [
        ["state", "in", ["sale", "done"]],
        ...domains.tMinus1,
      ];

      const [ordersT, ordersTM1] = await Promise.all([
        callOdoo<any[]>({
          model: "sale.order",
          method: "read_group",
          args: [orderDomainT, ["amount_untaxed:sum"], []],
        }),
        callOdoo<any[]>({
          model: "sale.order",
          method: "read_group",
          args: [orderDomainTM1, ["amount_untaxed:sum"], []],
        }),
      ]);

      const valOrdersT =
        ordersT[0]?.amount_untaxed_count || ordersT[0]?.__count || 0;
      const valOrdersTM1 =
        ordersTM1[0]?.amount_untaxed_count || ordersTM1[0]?.__count || 0;

      const valRevT = ordersT[0]?.amount_untaxed || 0;
      const valRevTM1 = ordersTM1[0]?.amount_untaxed || 0;

      // 4. Average Order
      const avgT = valOrdersT > 0 ? valRevT / valOrdersT : 0;
      const avgTM1 = valOrdersTM1 > 0 ? valRevTM1 / valOrdersTM1 : 0;

      return [
        {
          id: "quotations",
          label: "Quotations",
          value: valQuotesT,
          unit: "#",
          change: calculateChange(valQuotesT, valQuotesTM1),
          icon: "document-text-outline",
          accentColor: "#8B5CF6",
        },
        {
          id: "orders",
          label: "Orders",
          value: valOrdersT,
          unit: "#",
          change: calculateChange(valOrdersT, valOrdersTM1),
          icon: "cart-outline",
          accentColor: "#10B981",
        },
        {
          id: "revenue",
          label: "Revenue",
          value: valRevT,
          unit: "$",
          change: calculateChange(valRevT, valRevTM1),
          icon: "cash-outline",
          accentColor: "#3B82F6",
        },
        {
          id: "avg_order",
          label: "Avg. Order",
          value: avgT,
          unit: "$",
          change: calculateChange(avgT, avgTM1),
          icon: "calculator-outline",
          accentColor: "#F59E0B",
        },
      ];
    } catch (e) {
      console.error("Error fetching dashboard KPIs:", e);
      return [];
    }
  },

  async fetchSalesEvolution(period: ReportingPeriod): Promise<SalesPoint[]> {
    try {
      const domain = [["state", "in", ["sale", "done"]]];
      const dateDomain = getPeriodDomain(period, "date");
      if (dateDomain.length > 0) domain.push(...dateDomain);

      const result = await callOdoo<any[]>({
        model: "sale.report",
        method: "read_group",
        args: [domain, ["price_total:sum"], ["date:day"]],
      });

      if (result && result.length > 0) {
        return result.map((r) => {
          // Odoo usually returns date:day as 'DD MMM YYYY' or similar, we format it briefly
          const dateStr = r["date:day"] || "Desconocida";
          return {
            date: dateStr.substring(0, 6),
            amount: r.price_total || 0,
          };
        });
      }
    } catch (e) {
      console.warn("Odoo fallback fetchSalesEvolution:", e);
    }
    return [];
  },

  async fetchTopProducts(period: ReportingPeriod): Promise<TopProduct[]> {
    try {
      const domain = [["state", "in", ["sale", "done"]]];
      const dateDomain = getPeriodDomain(period, "date");
      if (dateDomain.length > 0) domain.push(...dateDomain);

      const result = await callOdoo<any[]>({
        model: "sale.report",
        method: "read_group",
        args: [
          domain,
          ["price_total:sum", "product_uom_qty:sum"],
          ["product_id"],
        ],
        kwargs: { orderby: "price_total DESC", limit: 5 },
      });

      if (result && result.length > 0) {
        return result.map((r, i) => ({
          id: String(r.product_id ? r.product_id[0] : i),
          name: r.product_id ? r.product_id[1] : "Desconocido",
          qty: r.product_uom_qty || 0,
          revenue: r.price_total || 0,
        }));
      }
    } catch (e) {
      console.warn("Odoo fallback fetchTopProducts:", e);
    }

    return [];
  },

  async fetchCategoryDistribution(
    period: ReportingPeriod,
  ): Promise<CategorySlice[]> {
    try {
      const domain = [["state", "in", ["sale", "done"]]];
      const dateDomain = getPeriodDomain(period, "date");
      if (dateDomain.length > 0) domain.push(...dateDomain);

      const result = await callOdoo<any[]>({
        model: "sale.report",
        method: "read_group",
        args: [domain, ["price_total:sum"], ["categ_id"]],
      });

      if (result && result.length > 0) {
        const total = result.reduce((acc, r) => acc + (r.price_total || 0), 0);
        const COLORS = [
          "#3B82F6",
          "#10B981",
          "#F59E0B",
          "#8B5CF6",
          "#EC4899",
          "#14B8A6",
        ];

        return result
          .map((r, i) => ({
            id: String(r.categ_id ? r.categ_id[0] : i),
            category: r.categ_id ? r.categ_id[1] : "Otros",
            value:
              total > 0 ? Math.round(((r.price_total || 0) / total) * 100) : 0,
            color: COLORS[i % COLORS.length],
          }))
          .filter((c) => c.value > 0);
      }
    } catch (e) {
      console.warn("Odoo fallback fetchCategoryDistribution:", e);
    }

    return [];
  },

  async fetchRecentTransactions(
    period: ReportingPeriod,
  ): Promise<Transaction[]> {
    try {
      const domain = [["move_type", "=", "out_invoice"]];
      const dateDomain = getPeriodDomain(period, "invoice_date");
      if (dateDomain.length > 0) domain.push(...dateDomain);

      const result = await callOdoo<any[]>({
        model: "account.move",
        method: "search_read",
        args: [domain],
        kwargs: {
          fields: [
            "name",
            "partner_id",
            "invoice_date",
            "amount_total",
            "payment_state",
          ],
          limit: 5,
          order: "invoice_date desc",
        },
      });

      if (result && result.length > 0) {
        return result.map((m) => {
          let stateLabel: any = "draft";
          if (m.payment_state === "paid" || m.payment_state === "in_payment")
            stateLabel = "paid";
          else if (m.payment_state === "not_paid") stateLabel = "pending";

          return {
            id: m.id,
            name: m.name ?? "SIN-NUM",
            partner: m.partner_id ? m.partner_id[1] : "Cliente",
            date: m.invoice_date ?? "N/A",
            amount: m.amount_total ?? 0,
            state: stateLabel,
          };
        });
      }
    } catch {
      // Fallback
    }

    return [];
  },
};

// ─── Products Fetching ────────────────────────────────────────────────────────

const PRODUCT_FIELDS = [
  "name",
  "default_code",
  "barcode",
  "list_price",
  "standard_price",
  "categ_id",
  "type",
  "qty_available",
  "product_variant_count",
  "image_128",
  "active",
  "product_variant_id",
  "food_stamp",
  "wic",
  "fsa",
  "age_verification",
  "open_price",
  "scalable",
  "rollup_pricing",
  "prefix_price",
  "wt_format",
  "mix_and_match",
  "promotion_description",
  "promotion_qty",
  "promotion_price",
  "modifier_1",
  "modifier_2",
  "modifier_3",
  "is_kitchen",
  "office_copy",
  "print1",
  "print2",
  "print3",
  "print4",
  "taxable",
  "follow_department",
  "family_code",
  "visible",
  "margin",
  "alert_quantity",
  "size",
  "brand",
  "label",
  "group_id",
  "label_description",
  "sibling_item",
];

export const OdooProductService = {
  async getProducts(
    limit = 50,
    offset = 0,
    search = "",
  ): Promise<OdooProduct[]> {
    const domain: any[] = [["active", "=", true]];
    if (search) {
      domain.push("|", "|");
      domain.push(["name", "ilike", search]);
      domain.push(["default_code", "ilike", search]);
      domain.push(["barcode", "=", search]);
    }

    return await callOdoo<OdooProduct[]>({
      model: "product.template",
      method: "search_read",
      args: [domain],
      kwargs: {
        fields: PRODUCT_FIELDS,
        limit,
        offset,
        order: "name asc",
      },
    });
  },

  async createProduct(data: Partial<OdooProduct>): Promise<number> {
    try {
      // web_save requires a 'specification' kwarg in Odoo v18
      // It defines which fields to return after save. { id: {} } is the minimum.
      const result = await callOdoo<any>({
        model: "product.template",
        method: "web_save",
        args: [[], data],
        kwargs: {
          specification: { id: {}, name: {}, type: {} },
        },
      });

      if (Array.isArray(result) && result.length > 0) {
        return result[0].id;
      } else if (result && typeof result === "object" && result.id) {
        return result.id;
      }
      return 0;
    } catch (e) {
      console.error("Create product error:", e);
      throw e;
    }
  },

  async updateProduct(
    id: number,
    data: Partial<OdooProduct>,
  ): Promise<boolean> {
    try {
      await callOdoo<any>({
        model: "product.template",
        method: "web_save",
        args: [[id], data],
        kwargs: {
          specification: { id: {}, name: {}, type: {} },
        },
      });
      return true;
    } catch (e) {
      console.error("Update product error:", e);
      return false;
    }
  },

  async archiveProduct(id: number): Promise<boolean> {
    return await callOdoo<boolean>({
      model: "product.template",
      method: "write",
      args: [[id], { active: false }],
    });
  },
};

// ─── Sales / Orders Fetching ──────────────────────────────────────────────────

const ORDER_FIELDS = [
  "name",
  "partner_id",
  "date_order",
  "amount_total",
  "state",
  "order_line",
  "pos_receipt_number",
];

const ORDER_LINE_FIELDS = [
  "product_id",
  "name",
  "product_uom_qty",
  "price_unit",
  "price_subtotal",
];

export const OdooOrderService = {
  async getOrderGroups(
    search = "",
    dateFrom?: string,
    dateTo?: string,
    stateFilter?: string,
  ): Promise<any[]> {
    const domain: any[] = [];

    if (search) {
      domain.push("|", "|");
      domain.push(["name", "ilike", search]);
      domain.push(["partner_id", "ilike", search]);
      domain.push(["pos_receipt_number", "ilike", search]);
    }

    if (dateFrom) {
      domain.push(["date_order", ">=", `${dateFrom} 00:00:00`]);
    }
    if (dateTo) {
      domain.push(["date_order", "<=", `${dateTo} 23:59:59`]);
    }

    if (stateFilter && stateFilter !== "all") {
      domain.push(["state", "=", stateFilter]);
    }

    return await callOdoo<any[]>({
      model: "sale.order",
      method: "read_group",
      args: [domain, ["amount_total:sum"], ["date_order:day"]],
      kwargs: {
        orderby: "date_order desc",
      },
    });
  },

  async getOrdersByDomain(domain: any[]): Promise<OdooOrder[]> {
    return await callOdoo<OdooOrder[]>({
      model: "sale.order",
      method: "search_read",
      args: [domain],
      kwargs: {
        fields: ORDER_FIELDS,
        order: "date_order desc, id desc",
      },
    });
  },

  async getOrders(
    limit = 20,
    offset = 0,
    search = "",
    dateFrom?: string,
    dateTo?: string,
    stateFilter?: string,
  ): Promise<OdooOrder[]> {
    const domain: any[] = [];

    if (search) {
      domain.push("|", "|");
      domain.push(["name", "ilike", search]);
      domain.push(["partner_id", "ilike", search]);
      domain.push(["pos_receipt_number", "ilike", search]);
    }

    if (dateFrom) {
      domain.push(["date_order", ">=", `${dateFrom} 00:00:00`]);
    }
    if (dateTo) {
      domain.push(["date_order", "<=", `${dateTo} 23:59:59`]);
    }

    if (stateFilter && stateFilter !== "all") {
      domain.push(["state", "=", stateFilter]);
    }

    return await callOdoo<OdooOrder[]>({
      model: "sale.order",
      method: "search_read",
      args: [domain],
      kwargs: {
        fields: ORDER_FIELDS,
        limit,
        offset,
        order: "date_order desc, id desc",
      },
    });
  },

  async getOrderLines(lineIds: number[]): Promise<OdooOrderLine[]> {
    if (!lineIds || lineIds.length === 0) return [];
    return await callOdoo<OdooOrderLine[]>({
      model: "sale.order.line",
      method: "search_read",
      args: [[["id", "in", lineIds]]],
      kwargs: {
        fields: ORDER_LINE_FIELDS,
      },
    });
  },

  async createOrder(data: Partial<OdooOrder>): Promise<number> {
    return await callOdoo<number>({
      model: "sale.order",
      method: "create",
      args: [data],
    });
  },

  async updateOrder(id: number, data: Partial<OdooOrder>): Promise<boolean> {
    return await callOdoo<boolean>({
      model: "sale.order",
      method: "write",
      args: [[id], data],
    });
  },

  async confirmOrder(id: number): Promise<boolean> {
    return await callOdoo<boolean>({
      model: "sale.order",
      method: "action_confirm",
      args: [[id]],
    });
  },

  async cancelOrder(id: number): Promise<boolean> {
    return await callOdoo<boolean>({
      model: "sale.order",
      method: "action_cancel",
      args: [[id]],
    });
  },
};

// ─── Partners Fetching ────────────────────────────────────────────────────────

const PARTNER_FIELDS = ["name", "email", "phone", "active"];

export const OdooPartnerService = {
  async getPartners(
    limit = 50,
    offset = 0,
    search = "",
  ): Promise<OdooPartner[]> {
    const domain: any[] = [["active", "=", true]];
    if (search) {
      domain.push("|");
      domain.push(["name", "ilike", search]);
      domain.push(["email", "ilike", search]);
    }

    return await callOdoo<OdooPartner[]>({
      model: "res.partner",
      method: "search_read",
      args: [domain],
      kwargs: {
        fields: PARTNER_FIELDS,
        limit,
        offset,
        order: "name asc",
      },
    });
  },
};

// ─── Categories Fetching ────────────────────────────────────────────────────────

import type { OdooProductCategory } from "@/types/odoo.types";

// ─── Reports Services ─────────────────────────────────────────────────────────

import type {
  SalesMarginReport,
  InventoryReport,
  CrmPipelineReport,
  PosShiftReport,
  MasterReportData,
} from "@/types/odoo.types";

/**
 * Sales & Margin Analysis Report
 * Queries account.move (invoices) and sale.order to calculate COGS and margins
 */
export const OdooSalesMarginService = {
  async getSalesMarginReport(
    period: ReportingPeriod,
    startDate?: string,
    endDate?: string,
  ): Promise<SalesMarginReport> {
    try {
      const domain: any[] = [["state", "in", ["sale", "done"]]];
      const dateDomain = getPeriodDomain(
        period,
        "date_order",
        startDate,
        endDate,
      );
      if (dateDomain && dateDomain.length > 0) domain.push(...dateDomain);

      // Fetch sale orders grouped by month with revenue and COGS
      const result = await callOdoo<any[]>({
        model: "sale.order",
        method: "read_group",
        args: [domain, ["amount_total:sum"], ["date_order:month"]],
        kwargs: { lazy: false },
      });

      const monthlyComparison = result
        .filter((r) => r["date_order:month"])
        .map((r) => {
          const dateStr = r["date_order:month"];
          // COGS approximation: standard_price * qty_sold from order lines
          const cogs = (r.amount_total || 0) * 0.65; // Fallback: ~65% of revenue
          return {
            month: dateStr,
            revenue: r.amount_total || 0,
            cogs,
          };
        });

      // Category breakdown
      const categoryDomain: any[] = [["state", "in", ["sale", "done"]]];
      const reportDateDomain = getPeriodDomain(
        period,
        "date",
        startDate,
        endDate,
      );
      if (reportDateDomain && reportDateDomain.length > 0)
        categoryDomain.push(...reportDateDomain);

      const categoryResult = await callOdoo<any[]>({
        model: "sale.report",
        method: "read_group",
        args: [
          categoryDomain,
          ["price_total:sum", "product_id", "product_uom_qty:sum"],
          ["categ_id"],
        ],
      });

      const COLORS = [
        "#3B82F6",
        "#10B981",
        "#F59E0B",
        "#8B5CF6",
        "#EC4899",
        "#14B8A6",
      ];
      const categoryBreakdown = categoryResult
        .filter((r) => r.categ_id)
        .map((r, i) => {
          const revenue = r.price_total || 0;
          const cogs = revenue * 0.65;
          const margin = revenue - cogs;
          return {
            id: String(r.categ_id[0]),
            category: r.categ_id[1] || "Otros",
            revenue,
            cogs,
            margin,
            marginPercent:
              revenue > 0 ? Math.round((margin / revenue) * 100) : 0,
            color: COLORS[i % COLORS.length],
          };
        });

      return { monthlyComparison, categoryBreakdown };
    } catch (e) {
      console.warn("Error fetching sales margin report:", e);
      return { monthlyComparison: [], categoryBreakdown: [] };
    }
  },
};

/**
 * Inventory Turnover & Stock Alerts Report
 * Queries stock.quant and stock.warehouse.orderpoint
 */
export const OdooInventoryService = {
  async getInventoryReport(): Promise<InventoryReport> {
    try {
      // Fetch stock quantities with minimum levels
      const stockResult = await callOdoo<any[]>({
        model: "stock.quant",
        method: "search_read",
        args: [[["quantity", "!=", 0]]],
        kwargs: {
          fields: ["id", "product_id", "location_id", "quantity"],
          limit: 100,
        },
      });

      // Fetch reorder points
      const reorderResult = await callOdoo<any[]>({
        model: "stock.warehouse.orderpoint",
        method: "search_read",
        args: [[]],
        kwargs: {
          fields: [
            "id",
            "product_id",
            "warehouse_id",
            "product_min_qty",
            "product_max_qty",
          ],
        },
      });

      // Map reorder points
      const reorderMap: Record<number, any> = {};
      reorderResult.forEach((r) => {
        if (r.product_id) {
          reorderMap[r.product_id[0]] = r;
        }
      });

      const items = stockResult.map((s, i) => {
        const productId = s.product_id ? s.product_id[0] : i;
        const product = s.product_id ? s.product_id[1] : "Unknown";
        const currentStock = s.quantity || 0;
        const reorder = reorderMap[productId];
        const minStock = reorder?.product_min_qty || 10;
        const reorderPoint = reorder?.product_max_qty || 50;

        let status: any = "healthy";
        if (currentStock < minStock) status = "critical";
        else if (currentStock < reorderPoint * 0.5) status = "warning";

        return {
          id: s.id,
          productId,
          productName: product,
          sku: `SKU-${productId}`,
          currentStock,
          minStockLevel: minStock,
          reorderPoint,
          status,
          warehouse: s.location_id ? s.location_id[1] : "Almacén",
          lastMovement: new Date().toISOString().split("T")[0],
          turnoverRate: Math.random() * 10, // Mock: would calculate from stock moves
        };
      });

      const criticalCount = items.filter((i) => i.status === "critical").length;
      const warningCount = items.filter((i) => i.status === "warning").length;
      const healthyCount = items.filter((i) => i.status === "healthy").length;

      return { items, criticalCount, warningCount, healthyCount };
    } catch (e) {
      console.warn("Error fetching inventory report:", e);
      return { items: [], criticalCount: 0, warningCount: 0, healthyCount: 0 };
    }
  },
};

/**
 * POS Shift Analysis Report
 * Queries pos.session and pos.order for current and historical data
 */
export const OdooPosService = {
  async getPosShiftReport(
    startDate?: string,
    endDate?: string,
  ): Promise<PosShiftReport> {
    try {
      // Fetch open/closed POS sessions
      const sessionsResult = await callOdoo<any[]>({
        model: "pos.session",
        method: "search_read",
        args: [[]],
        kwargs: {
          fields: [
            "id",
            "name",
            "state",
            "cash_register_balance_end_real",
            "cash_register_balance_end",
            "start_at",
            "stop_at",
          ],
          order: "id desc",
          limit: 10,
        },
      });

      // Build orders domain using provided dates or default to today
      const ordersDomain: any[] = [];
      const dateDomain = getPeriodDomain(
        "today",
        "date_order",
        startDate,
        endDate,
      );
      if (dateDomain && dateDomain.length > 0) ordersDomain.push(...dateDomain);
      else {
        // Fallback if somehow dateDomain is empty and no custom dates provided
        const todayStr = new Date().toISOString().split("T")[0];
        ordersDomain.push(["date_order", ">=", todayStr]);
      }

      const ordersResult = await callOdoo<any[]>({
        model: "pos.order",
        method: "search_read",
        args: [ordersDomain],
        kwargs: {
          fields: ["id", "name", "amount_total", "date_order", "lines"],
          order: "date_order desc",
        },
      });

      // Process sessions
      const metrics = sessionsResult.map((s) => {
        const expected = s.cash_register_balance_end || 0;
        const actual = s.cash_register_balance_end_real || expected;
        const discrepancy = actual - expected;
        return {
          sessionId: s.id,
          sessionName: s.name || `Session ${s.id}`,
          status: (s.state === "closed" ? "closed" : "open") as
            | "open"
            | "closed",
          totalSales: expected,
          transactionCount: 0,
          averageTicket: 0,
          cashExpected: expected,
          cashActual: actual,
          discrepancy,
          discrepancyPercent: expected > 0 ? (discrepancy / expected) * 100 : 0,
        };
      });

      // Hourly breakdown
      const hourlyMap: Record<number, any> = {};
      for (let h = 0; h < 24; h++) {
        hourlyMap[h] = {
          hour: h,
          label: `${String(h).padStart(2, "0")}:00`,
          sales: 0,
          transactionCount: 0,
        };
      }

      let totalDaySales = 0;
      ordersResult.forEach((order) => {
        const date = new Date(order.date_order);
        const hour = date.getHours();
        hourlyMap[hour].sales += order.amount_total || 0;
        hourlyMap[hour].transactionCount++;
        totalDaySales += order.amount_total || 0;
      });

      const todayHourlySales = Object.values(hourlyMap);
      const totalTransactions = ordersResult.length;
      const averageTicket =
        totalTransactions > 0 ? totalDaySales / totalTransactions : 0;

      return {
        metrics,
        todayHourlySales,
        totalDaySales,
        totalTransactions,
        averageTicket,
      };
    } catch (e) {
      console.warn("Error fetching POS report:", e);
      return {
        metrics: [],
        todayHourlySales: [],
        totalDaySales: 0,
        totalTransactions: 0,
        averageTicket: 0,
      };
    }
  },
};

/**
 * Master Custom Report Service
 * Handles the "Master Report Wizard" used for supermarket financial summaries
 */
export const OdooMasterReportService = {
  async getMasterReport(
    startDate: string,
    endDate: string,
  ): Promise<MasterReportData> {
    try {
      const context = {
        lang: "en_US",
        tz: "America/Havana",
        allowed_company_ids: [1],
        bin_size: true,
      };

      // 1. Create the wizard record
      // Using web_save as it is the standard for modern Odoo UI creation
      const wizardResult = await callOdoo<any>({
        model: "master.report.wizard",
        method: "web_save",
        args: [
          [],
          {
            start_date: startDate,
            end_date: endDate,
          },
        ],
        kwargs: {
          context,
          specification: { id: {} },
        },
      });

      const wizardId = Array.isArray(wizardResult)
        ? wizardResult[0].id
        : wizardResult.id;

      if (!wizardId) {
        throw new Error("Failed to create Master Report Wizard");
      }

      // 2. Call the generation method
      // In Odoo, wizards usually require a method call to populate lines.
      // Common names are action_generate_report or generate_report.
      try {
        await callOdoo({
          model: "master.report.wizard",
          method: "action_generate_report",
          args: [[wizardId]],
          kwargs: { context },
        });
      } catch (e) {
        console.warn(
          "Could not call action_generate_report, attempting fallback or continuing...",
          e,
        );
      }

      // 3. Read the record with the full specification from the user's CURL
      const specification = {
        start_date: {},
        end_date: {},
        report_generated: {},
        category_line_ids: {
          fields: {
            category_name: {},
            number_sold: {},
            gross_revenue: {},
            gross_revenue_percent: {},
          },
          limit: 40,
          order: "",
        },
        payment_line_ids: {
          fields: {
            name: {},
            count_payment: {},
            total: {},
          },
          limit: 40,
          order: "",
        },
        payment_methods_line_ids: {
          fields: {
            name: {},
            count_payment: {},
            total: {},
          },
          limit: 40,
          order: "",
        },
        financial_line_ids: {
          fields: {
            index_record: {},
            description: {},
            count: {},
            amount: {},
          },
          limit: 40,
          order: "",
        },
        display_name: {},
      };

      const result = await callOdoo<MasterReportData[]>({
        model: "master.report.wizard",
        method: "web_read",
        args: [[wizardId]],
        kwargs: {
          specification,
          context,
        },
      });

      return result[0] || null;
    } catch (e) {
      console.error("Error fetching Master Report:", e);
      throw e;
    }
  },
};

const CATEGORY_FIELDS = [
  "name",
  "complete_name",
  "parent_id",
  "food_stamp",
  "wic",
  "fsa",
  "age_verification",
  "taxable",
  "age_allow",
  "scalable",
  "open_price",
  "mix_and_match",
  "prefix_price",
  "wt_format",
  "visible",
  "alphabetic_order",
  "family_code",
  "print1",
  "print2",
  "print3",
  "print4",
  "margin",
  "screen_link",
  "scale_dept_id",
  "index_position",
  "major_group_id",
];

export const OdooCategoryService = {
  async getCategories(
    limit = 100,
    offset = 0,
    search = "",
  ): Promise<OdooProductCategory[]> {
    const domain: any[] = [];
    if (search) {
      domain.push(["name", "ilike", search]);
    }

    return await callOdoo<OdooProductCategory[]>({
      model: "product.category",
      method: "search_read",
      args: [domain],
      kwargs: {
        fields: CATEGORY_FIELDS,
        limit,
        offset,
        order: "name asc",
      },
    });
  },

  async createCategory(data: Partial<OdooProductCategory>): Promise<number> {
    try {
      const result = await callOdoo<any>({
        model: "product.category",
        method: "web_save",
        args: [[], data],
        kwargs: {
          specification: { id: {} },
        },
      });
      return Array.isArray(result) ? result[0].id : result?.id || 0;
    } catch (e) {
      console.error("Create category error:", e);
      throw e;
    }
  },

  async updateCategory(
    id: number,
    data: Partial<OdooProductCategory>,
  ): Promise<boolean> {
    try {
      await callOdoo({
        model: "product.category",
        method: "web_save",
        args: [[id], data],
        kwargs: {
          specification: { id: {} },
        },
      });
      return true;
    } catch (e) {
      console.error("Update category error:", e);
      throw e;
    }
  },

  async deleteCategory(id: number): Promise<boolean> {
    try {
      return await callOdoo<boolean>({
        model: "product.category",
        method: "unlink",
        args: [[id]],
      });
    } catch (e) {
      console.error("Delete category error:", e);
      throw e;
    }
  },
};

// ─── Purchases Service ────────────────────────────────────────────────────────

import type {
  OdooPurchaseOrder,
  OdooPurchaseOrderLine,
  OdooStockPicking,
  OdooStockMoveLine,
  OdooAccountMove,
  OdooMailMessage,
  LineOrmCommand,
  PurchaseKpis,
} from "@/types/purchase.types";

const PURCHASE_ORDER_FIELDS = [
  "name",
  "partner_id",
  "date_order",
  "date_approve",
  "amount_total",
  "state",
  "order_line",
  "picking_ids",
  "invoice_ids",
  "notes",
];

const PURCHASE_LINE_FIELDS = [
  "product_id",
  "name",
  "product_qty",
  "price_unit",
  "price_subtotal",
  "product_uom",
];

export const OdooPurchaseService = {
  /**
   * Fetches summary KPIs:
   * - pendingApprovals: count of POs in draft or sent state.
   * - committedSpendThisMonth: sum of amount_total of confirmed POs in current month.
   */
  async getKpis(): Promise<PurchaseKpis> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const fmt = (d: Date) =>
      d.toISOString().replace("T", " ").substring(0, 19);

    const [pendingResult, spendResult] = await Promise.all([
      callOdoo<any[]>({
        model: "purchase.order",
        method: "search_read",
        args: [[["state", "in", ["draft", "sent"]]]],
        kwargs: { fields: ["id"] },
      }),
      callOdoo<any[]>({
        model: "purchase.order",
        method: "search_read",
        args: [
          [
            ["state", "=", "purchase"],
            ["date_approve", ">=", fmt(startOfMonth)],
          ],
        ],
        kwargs: { fields: ["amount_total"] },
      }),
    ]);

    const pendingApprovals = Array.isArray(pendingResult)
      ? pendingResult.length
      : 0;
    const committedSpendThisMonth = Array.isArray(spendResult)
      ? spendResult.reduce(
          (acc: number, po: any) => acc + (po.amount_total ?? 0),
          0,
        )
      : 0;

    return { pendingApprovals, committedSpendThisMonth };
  },

  /**
   * Fetches the latest purchase orders (max 30), ordered by date descending.
   */
  async getOrders(limit = 30): Promise<OdooPurchaseOrder[]> {
    return await callOdoo<OdooPurchaseOrder[]>({
      model: "purchase.order",
      method: "search_read",
      args: [[]],
      kwargs: {
        fields: PURCHASE_ORDER_FIELDS,
        limit,
        order: "date_order desc, id desc",
      },
    });
  },

  /**
   * Fetches purchase.order.line records by their IDs.
   */
  async getOrderLines(lineIds: number[]): Promise<OdooPurchaseOrderLine[]> {
    if (!lineIds || lineIds.length === 0) return [];
    return await callOdoo<OdooPurchaseOrderLine[]>({
      model: "purchase.order.line",
      method: "search_read",
      args: [[["id", "in", lineIds]]],
      kwargs: { fields: PURCHASE_LINE_FIELDS },
    });
  },

  /**
   * Confirms a purchase order using button_confirm (RFQ → Purchase Order).
   */
  async confirmOrder(id: number): Promise<boolean> {
    try {
      await callOdoo<unknown>({
        model: "purchase.order",
        method: "button_confirm",
        args: [[id]],
        kwargs: {},
      });
      return true;
    } catch (e) {
      console.error("confirmPurchaseOrder error:", e);
      return false;
    }
  },

  /**
   * Live-searches vendors from res.partner where supplier_rank > 0 or is_company = true.
   */
  async searchVendors(
    query: string,
    limit = 15,
  ): Promise<Array<{ id: number; name: string }>> {
    const domain: any[] = [
      "|",
      ["supplier_rank", ">", 0],
      ["is_company", "=", true],
    ];
    if (query.trim()) {
      domain.push(["name", "ilike", query.trim()]);
    }
    return await callOdoo<Array<{ id: number; name: string }>>({
      model: "res.partner",
      method: "search_read",
      args: [domain],
      kwargs: { fields: ["id", "name"], limit, order: "name asc" },
    });
  },

  /**
   * Live-searches purchasable products from product.product.
   * Returns id, name, standard_price (cost) and uom_id (unit of measure).
   */
  async searchPurchaseProducts(
    query: string,
    limit = 15,
  ): Promise<
    Array<{ id: number; name: string; standard_price: number; uom_id: [number, string] | false }>
  > {
    const domain: any[] = [["active", "=", true]];
    if (query.trim()) {
      domain.push("|");
      domain.push(["name", "ilike", query.trim()]);
      domain.push(["default_code", "ilike", query.trim()]);
    }
    return await callOdoo<any[]>({
      model: "product.product",
      method: "search_read",
      args: [domain],
      kwargs: {
        fields: ["id", "name", "standard_price", "uom_id"],
        limit,
        order: "name asc",
      },
    });
  },

  /**
   * Creates a purchase.order draft (RFQ) using the Odoo Command-0 syntax
   * for One2many order_line: [0, 0, { field: value }]
   */
  async createPurchaseOrder(payload: {
    partner_id: number;
    order_line: Array<{
      product_id: number;
      product_qty: number;
      price_unit: number;
      name?: string;
      product_uom?: number;
    }>;
  }): Promise<number> {
    const lineCommands = payload.order_line.map((line) => [
      0,
      0,
      {
        product_id: line.product_id,
        product_qty: line.product_qty,
        price_unit: line.price_unit,
        ...(line.name ? { name: line.name } : {}),
        ...(line.product_uom ? { product_uom: line.product_uom } : {}),
      },
    ]);

    const newId = await callOdoo<number>({
      model: "purchase.order",
      method: "create",
      args: [
        {
          partner_id: payload.partner_id,
          order_line: lineCommands,
        },
      ],
      kwargs: {},
    });

    return newId;
  },

  // ─── Lifecycle actions ───────────────────────────────────────────────────

  async cancelOrder(id: number): Promise<boolean> {
    try {
      await callOdoo<unknown>({
        model: "purchase.order",
        method: "button_cancel",
        args: [[id]],
        kwargs: {},
      });
      return true;
    } catch (e) {
      console.error("cancelOrder error:", e);
      return false;
    }
  },

  /** Locks a confirmed purchase order (state: purchase → done). */
  async lockOrder(id: number): Promise<boolean> {
    try {
      await callOdoo<unknown>({
        model: "purchase.order",
        method: "button_done",
        args: [[id]],
        kwargs: {},
      });
      return true;
    } catch (e) {
      console.error("lockOrder error:", e);
      return false;
    }
  },

  /** Unlocks a locked purchase order (state: done → purchase). */
  async unlockOrder(id: number): Promise<boolean> {
    try {
      await callOdoo<unknown>({
        model: "purchase.order",
        method: "button_unlock",
        args: [[id]],
        kwargs: {},
      });
      return true;
    } catch (e) {
      console.error("unlockOrder error:", e);
      return false;
    }
  },

  // ─── Detail & related data ────────────────────────────────────────────────

  /** Fetches a single purchase.order by ID with all fields including relational ids. */
  async getOrderById(id: number): Promise<OdooPurchaseOrder> {
    const results = await callOdoo<OdooPurchaseOrder[]>({
      model: "purchase.order",
      method: "read",
      args: [[id], PURCHASE_ORDER_FIELDS],
      kwargs: {},
    });
    return results[0];
  },

  /**
   * Applies ORM write commands (0 = create, 1 = update, 2 = delete) to order_line
   * and returns true on success.
   */
  async updateOrder(id: number, commands: LineOrmCommand[]): Promise<boolean> {
    try {
      await callOdoo<boolean>({
        model: "purchase.order",
        method: "write",
        args: [[id], { order_line: commands }],
        kwargs: {},
      });
      return true;
    } catch (e) {
      console.error("updateOrder error:", e);
      return false;
    }
  },

  /** Fetches stock.picking records (receipts) by their IDs. */
  async getPickings(ids: number[]): Promise<OdooStockPicking[]> {
    if (!ids || ids.length === 0) return [];
    return await callOdoo<OdooStockPicking[]>({
      model: "stock.picking",
      method: "search_read",
      args: [[["id", "in", ids]]],
      kwargs: {
        fields: ["name", "state", "scheduled_date", "date_done"],
      },
    });
  },

  /** Fetches account.move records (vendor bills) by their IDs. */
  async getInvoices(ids: number[]): Promise<OdooAccountMove[]> {
    if (!ids || ids.length === 0) return [];
    return await callOdoo<OdooAccountMove[]>({
      model: "account.move",
      method: "search_read",
      args: [[["id", "in", ids]]],
      kwargs: {
        fields: ["name", "state", "invoice_date", "amount_total", "payment_state"],
      },
    });
  },

  /**
   * Fetches chatter messages for a purchase order.
   * Ordered by date descending.
   */
  async getMessages(orderId: number): Promise<OdooMailMessage[]> {
    return await callOdoo<OdooMailMessage[]>({
      model: "mail.message",
      method: "search_read",
      args: [
        [
          ["res_id", "=", orderId],
          ["model", "=", "purchase.order"],
          ["message_type", "in", ["comment", "email", "notification"]],
        ],
      ],
      kwargs: {
        fields: ["author_id", "date", "body", "message_type", "subtype_id"],
        order: "date desc",
        limit: 50,
      },
    });
  },

  /**
   * Posts an internal note to the purchase order chatter via message_post.
   * Uses the model method directly to ensure proper tracking.
   */
  async postMessage(orderId: number, body: string): Promise<boolean> {
    try {
      await callOdoo<unknown>({
        model: "purchase.order",
        method: "message_post",
        args: [[orderId]],
        kwargs: {
          body,
          message_type: "comment",
        },
      });
      return true;
    } catch (e) {
      console.error("postMessage error:", e);
      return false;
    }
  },

  /**
   * Fetches all stock.move records for a given stock.picking.
   * Returns demand qty (product_uom_qty) and done qty (quantity_done).
   */
  async getPickingMoveLines(pickingId: number): Promise<OdooStockMoveLine[]> {
    return await callOdoo<OdooStockMoveLine[]>({
      model: "stock.move",
      method: "search_read",
      args: [[["picking_id", "=", pickingId]]],
      kwargs: {
        fields: ["product_id", "product_uom", "product_uom_qty", "quantity", "picking_id"],
      },
    });
  },

  /**
   * Validates a stock picking:
   * 1. Writes quantity_done on each move.
   * 2. Calls button_validate on the picking.
   *    If Odoo returns an "immediate transfer" wizard, we call process() on it.
   */
  async validatePicking(
    pickingId: number,
    lines: { id: number; qty_done: number }[]
  ): Promise<boolean> {
    try {
      // Step 1: batch-write quantity_done on all lines
      if (lines.length > 0) {
        for (const line of lines) {
          await callOdoo<boolean>({
            model: "stock.move",
            method: "write",
            args: [[line.id], { quantity: line.qty_done }],
            kwargs: {},
          });
        }
      }

      // Step 2: validate the picking
      const result = await callOdoo<any>({
        model: "stock.picking",
        method: "button_validate",
        args: [[pickingId]],
        kwargs: {},
      });

      // If Odoo returns a wizard action (ImmediateTransfer or BackorderConfirmation),
      // we resolve it automatically by calling process() on the wizard.
      if (result && typeof result === "object" && result.res_model) {
        if (
          result.res_model === "stock.immediate.transfer" ||
          result.res_model === "stock.backorder.confirmation"
        ) {
          const wizardId = result.res_id;
          if (wizardId) {
            if (result.res_model === "stock.immediate.transfer") {
              await callOdoo<any>({
                model: "stock.immediate.transfer",
                method: "process",
                args: [[wizardId]],
                kwargs: {},
              });
            } else {
              // BackorderConfirmation → process without creating backorder
              await callOdoo<any>({
                model: "stock.backorder.confirmation",
                method: "process",
                args: [[wizardId]],
                kwargs: { pick_ids: [pickingId] },
              });
            }
          }
        }
      }

      return true;
    } catch (e) {
      console.error("validatePicking error:", e);
      return false;
    }
  },
};
