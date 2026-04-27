import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { useAppStore } from '@/store/app.store';

let _instance: AxiosInstance | null = null;

/**
 * Returns an Axios instance configured for the current tenant's Odoo URL.
 * The baseURL is read dynamically from the Zustand store each time.
 */
export function getOdooClient(): AxiosInstance {
  const tenantUrl = useAppStore.getState().user?.tenant.url ?? '';

  if (!_instance || _instance.defaults.baseURL !== tenantUrl) {
    _instance = axios.create({
      baseURL: tenantUrl,
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    _instance.interceptors.request.use((config) => {
      const sessionId = useAppStore.getState().user?.sessionId;
      if (sessionId) {
        config.headers['Cookie'] = `session_id=${sessionId}`;
      }
      return config;
    });

    _instance.interceptors.response.use(
      (res) => res,
      (err) => {
        // Normalize Odoo JSON-RPC errors
        const odooError = err?.response?.data?.error;
        if (odooError) {
          return Promise.reject(new Error(odooError.data?.message ?? odooError.message));
        }
        return Promise.reject(err);
      }
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
  const { data } = await client.post('/web/dataset/call_kw', {
    jsonrpc: '2.0',
    method: 'call',
    id: Date.now(),
    params: {
      model: payload.model,
      method: payload.method,
      args: payload.args ?? [],
      kwargs: payload.kwargs ?? {},
    },
  });

  if (data.error) {
    throw new Error(data.error.data?.message ?? data.error.message);
  }

  return data.result as T;
}

// ─── Dashboard Data Fetching ──────────────────────────────────────────────────

import type { DashboardData, KpiData, SalesPoint, TopProduct, CategorySlice, Transaction, ReportingPeriod, OdooProduct } from '@/types/odoo.types';

function getPeriodDomain(period: ReportingPeriod, dateField: string = 'date_order'): any[] {
  const now = new Date();
  
  if (period === 'today') {
    const startOfDay = new Date(now.setUTCHours(0, 0, 0, 0)).toISOString().replace('T', ' ').substring(0, 19);
    return [dateField, '>=', startOfDay];
  } else if (period === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay());
    startOfWeek.setUTCHours(0, 0, 0, 0);
    const startStr = startOfWeek.toISOString().replace('T', ' ').substring(0, 19);
    return [dateField, '>=', startStr];
  } else if (period === 'month') {
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().replace('T', ' ').substring(0, 19);
    return [dateField, '>=', startOfMonth];
  }
  return [];
}

export const OdooDashboardService = {
  async getDashboardData(period: ReportingPeriod): Promise<DashboardData> {
    const p1 = this.fetchKpis(period);
    const p2 = this.fetchSalesEvolution(period);
    const p3 = this.fetchTopProducts(period);
    const p4 = this.fetchCategoryDistribution(period);
    const p5 = this.fetchRecentTransactions(period);

    const [kpis, salesEvolution, topProducts, categoryDistribution, recentTransactions] = await Promise.all([p1, p2, p3, p4, p5]);

    return {
      kpis,
      salesEvolution,
      topProducts,
      categoryDistribution,
      recentTransactions,
    };
  },

  async fetchKpis(period: ReportingPeriod): Promise<KpiData[]> {
    let totalSales = 0;
    let salesCount = 0;
    let newLeads = 0;
    
    try {
      const saleDomain = [['state', 'in', ['sale', 'done']]];
      let saleDateDomain = getPeriodDomain(period, 'date_order');
      if (saleDateDomain.length > 0) saleDomain.push(saleDateDomain);

      const salesResult = await callOdoo<any[]>({
        model: 'sale.order',
        method: 'read_group',
        args: [saleDomain, ['amount_total:sum'], []],
      });
      if (salesResult && salesResult.length > 0) {
        totalSales = salesResult[0].amount_total || 0;
        salesCount = salesResult[0].amount_total_count || 0;
      }

      // Try fetching CRM leads
      const leadDomain = [['type', '=', 'opportunity']];
      let leadDateDomain = getPeriodDomain(period, 'create_date');
      if (leadDateDomain.length > 0) leadDomain.push(leadDateDomain);

      const leadsResult = await callOdoo<any[]>({
        model: 'crm.lead',
        method: 'read_group',
        args: [leadDomain, ['id'], []],
      });
      if (leadsResult && leadsResult.length > 0) {
        newLeads = leadsResult[0].id_count || leadsResult[0].__count || 0;
      }
    } catch {
      // Fallback values if modules are missing
    }

    return [
      {
        id: '1',
        label: 'Ingresos Totales',
        value: totalSales,
        unit: '$',
        change: 0,
        icon: 'cash-outline',
        accentColor: '#3B82F6',
      },
      {
        id: '2',
        label: 'Ventas Cerradas',
        value: salesCount,
        unit: '#',
        change: 0,
        icon: 'trending-up',
        accentColor: '#10B981',
      },
      {
        id: '3',
        label: 'Margen Promedio',
        value: 0,
        unit: '%',
        change: 0,
        icon: 'pie-chart-outline',
        accentColor: '#F59E0B',
      },
      {
        id: '4',
        label: 'Nuevas Oportun.',
        value: newLeads,
        unit: '#',
        change: 0,
        icon: 'people-outline',
        accentColor: '#8B5CF6',
      },
    ];
  },

  async fetchSalesEvolution(period: ReportingPeriod): Promise<SalesPoint[]> {
    try {
      const domain = [['state', 'in', ['sale', 'done']]];
      const dateDomain = getPeriodDomain(period, 'date');
      if (dateDomain.length > 0) domain.push(dateDomain);

      const result = await callOdoo<any[]>({
        model: 'sale.report',
        method: 'read_group',
        args: [domain, ['price_total:sum'], ['date:day']],
      });

      if (result && result.length > 0) {
        return result.map(r => {
          // Odoo usually returns date:day as 'DD MMM YYYY' or similar, we format it briefly
          const dateStr = r['date:day'] || 'Desconocida';
          return {
            date: dateStr.substring(0, 6),
            amount: r.price_total || 0,
          };
        });
      }
    } catch (e) {
      console.warn('Odoo fallback fetchSalesEvolution:', e);
    }
    return [];
  },

  async fetchTopProducts(period: ReportingPeriod): Promise<TopProduct[]> {
    try {
      const domain = [['state', 'in', ['sale', 'done']]];
      const dateDomain = getPeriodDomain(period, 'date');
      if (dateDomain.length > 0) domain.push(dateDomain);

      const result = await callOdoo<any[]>({
        model: 'sale.report',
        method: 'read_group',
        args: [domain, ['price_total:sum', 'product_uom_qty:sum'], ['product_id']],
        kwargs: { orderby: 'price_total DESC', limit: 5 },
      });

      if (result && result.length > 0) {
        return result.map((r, i) => ({
          id: String(r.product_id ? r.product_id[0] : i),
          name: r.product_id ? r.product_id[1] : 'Desconocido',
          qty: r.product_uom_qty || 0,
          revenue: r.price_total || 0,
        }));
      }
    } catch (e) {
        console.warn('Odoo fallback fetchTopProducts:', e);
    }
    
    return [];
  },

  async fetchCategoryDistribution(period: ReportingPeriod): Promise<CategorySlice[]> {
    try {
      const domain = [['state', 'in', ['sale', 'done']]];
      const dateDomain = getPeriodDomain(period, 'date');
      if (dateDomain.length > 0) domain.push(dateDomain);

      const result = await callOdoo<any[]>({
        model: 'sale.report',
        method: 'read_group',
        args: [domain, ['price_total:sum'], ['categ_id']],
      });

      if (result && result.length > 0) {
        const total = result.reduce((acc, r) => acc + (r.price_total || 0), 0);
        const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
        
        return result.map((r, i) => ({
          id: String(r.categ_id ? r.categ_id[0] : i),
          category: r.categ_id ? r.categ_id[1] : 'Otros',
          value: total > 0 ? Math.round(((r.price_total || 0) / total) * 100) : 0,
          color: COLORS[i % COLORS.length],
        })).filter(c => c.value > 0);
      }
    } catch (e) {
      console.warn('Odoo fallback fetchCategoryDistribution:', e);
    }
    
    return [];
  },

  async fetchRecentTransactions(period: ReportingPeriod): Promise<Transaction[]> {
    try {
      const domain = [['move_type', '=', 'out_invoice']];
      const dateDomain = getPeriodDomain(period, 'invoice_date');
      if (dateDomain.length > 0) domain.push(dateDomain);

      const result = await callOdoo<any[]>({
        model: 'account.move',
        method: 'search_read',
        args: [domain],
        kwargs: {
          fields: ['name', 'partner_id', 'invoice_date', 'amount_total', 'payment_state'],
          limit: 5,
          order: 'invoice_date desc',
        },
      });

      if (result && result.length > 0) {
        return result.map(m => {
          let stateLabel: any = 'draft';
          if (m.payment_state === 'paid' || m.payment_state === 'in_payment') stateLabel = 'paid';
          else if (m.payment_state === 'not_paid') stateLabel = 'pending';

          return {
            id: m.id,
            name: m.name ?? 'SIN-NUM',
            partner: m.partner_id ? m.partner_id[1] : 'Cliente',
            date: m.invoice_date ?? 'N/A',
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
  'name', 'default_code', 'barcode', 'list_price', 
  'standard_price', 'categ_id', 'type', 
  'qty_available', 'product_variant_count', 'image_128', 'active'
];

export const OdooProductService = {
  async getProducts(limit = 50, offset = 0, search = ''): Promise<OdooProduct[]> {
    const domain: any[] = [['active', '=', true]];
    if (search) {
      domain.push('|');
      domain.push(['name', 'ilike', search]);
      domain.push(['default_code', 'ilike', search]);
    }
    
    return await callOdoo<OdooProduct[]>({
      model: 'product.product',
      method: 'search_read',
      args: [domain],
      kwargs: {
        fields: PRODUCT_FIELDS,
        limit,
        offset,
        order: 'name asc',
      },
    });
  },

  async createProduct(data: Partial<OdooProduct>): Promise<number> {
    // Return product ID
    return await callOdoo<number>({
      model: 'product.product',
      method: 'create',
      args: [data],
    });
  },

  async updateProduct(id: number, data: Partial<OdooProduct>): Promise<boolean> {
    return await callOdoo<boolean>({
      model: 'product.product',
      method: 'write',
      args: [[id], data],
    });
  },

  async archiveProduct(id: number): Promise<boolean> {
    return await callOdoo<boolean>({
      model: 'product.product',
      method: 'write',
      args: [[id], { active: false }],
    });
  },
};

// ─── Sales / Orders Fetching ──────────────────────────────────────────────────

const ORDER_FIELDS = [
  'name', 'partner_id', 'date_order', 'amount_total', 'state', 'order_line'
];

const ORDER_LINE_FIELDS = [
  'product_id', 'name', 'product_uom_qty', 'price_unit', 'price_subtotal'
];

export const OdooOrderService = {
  async getOrders(limit = 20, offset = 0, search = ''): Promise<OdooOrder[]> {
    const domain: any[] = [];
    if (search) {
      domain.push('|');
      domain.push(['name', 'ilike', search]);
      domain.push(['partner_id', 'ilike', search]);
    }
    
    return await callOdoo<OdooOrder[]>({
      model: 'sale.order',
      method: 'search_read',
      args: [domain],
      kwargs: {
        fields: ORDER_FIELDS,
        limit,
        offset,
        order: 'date_order desc, id desc',
      },
    });
  },

  async getOrderLines(lineIds: number[]): Promise<OdooOrderLine[]> {
    if (!lineIds || lineIds.length === 0) return [];
    return await callOdoo<OdooOrderLine[]>({
      model: 'sale.order.line',
      method: 'search_read',
      args: [[['id', 'in', lineIds]]],
      kwargs: {
        fields: ORDER_LINE_FIELDS,
      },
    });
  },

  async createOrder(data: Partial<OdooOrder>): Promise<number> {
    return await callOdoo<number>({
      model: 'sale.order',
      method: 'create',
      args: [data],
    });
  },

  async updateOrder(id: number, data: Partial<OdooOrder>): Promise<boolean> {
    return await callOdoo<boolean>({
      model: 'sale.order',
      method: 'write',
      args: [[id], data],
    });
  },

  async confirmOrder(id: number): Promise<boolean> {
    return await callOdoo<boolean>({
      model: 'sale.order',
      method: 'action_confirm',
      args: [[id]],
    });
  },

  async cancelOrder(id: number): Promise<boolean> {
    return await callOdoo<boolean>({
      model: 'sale.order',
      method: 'action_cancel',
      args: [[id]],
    });
  }
};

// ─── Partners Fetching ────────────────────────────────────────────────────────

const PARTNER_FIELDS = [
  'name', 'email', 'phone', 'active'
];

export const OdooPartnerService = {
  async getPartners(limit = 50, offset = 0, search = ''): Promise<OdooPartner[]> {
    const domain: any[] = [['active', '=', true]];
    if (search) {
      domain.push('|');
      domain.push(['name', 'ilike', search]);
      domain.push(['email', 'ilike', search]);
    }
    
    return await callOdoo<OdooPartner[]>({
      model: 'res.partner',
      method: 'search_read',
      args: [domain],
      kwargs: {
        fields: PARTNER_FIELDS,
        limit,
        offset,
        order: 'name asc',
      },
    });
  }
};
