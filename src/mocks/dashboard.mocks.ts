import type { DashboardData } from '@/types/odoo.types';

export const MOCK_DASHBOARD: DashboardData = {
  // ── KPIs ──────────────────────────────────────────────────────────────────
  kpis: [
    {
      id: 'sales',
      label: 'Ventas Totales',
      value: 248_750,
      unit: '$',
      change: 12.4,
      icon: 'trending-up',
      accentColor: '#3B82F6',
    },
    {
      id: 'ticket',
      label: 'Ticket Promedio',
      value: 1_845,
      unit: '$',
      change: 3.2,
      icon: 'receipt',
      accentColor: '#10B981',
    },
    {
      id: 'clients',
      label: 'Clientes Nuevos',
      value: 134,
      unit: '#',
      change: -5.1,
      icon: 'people',
      accentColor: '#F59E0B',
    },
    {
      id: 'pending',
      label: 'Facturas Pendientes',
      value: 23,
      unit: '#',
      change: -18.0,
      icon: 'document-text',
      accentColor: '#EF4444',
    },
  ],

  // ── Sales evolution (30 days) ─────────────────────────────────────────────
  salesEvolution: [
    { date: '01 Feb', amount: 7200 },
    { date: '02 Feb', amount: 8100 },
    { date: '03 Feb', amount: 6500 },
    { date: '04 Feb', amount: 9400 },
    { date: '05 Feb', amount: 11200 },
    { date: '06 Feb', amount: 10300 },
    { date: '07 Feb', amount: 8900 },
    { date: '08 Feb', amount: 12100 },
    { date: '09 Feb', amount: 9800 },
    { date: '10 Feb', amount: 13400 },
    { date: '11 Feb', amount: 14200 },
    { date: '12 Feb', amount: 10600 },
    { date: '13 Feb', amount: 9100 },
    { date: '14 Feb', amount: 15300 },
    { date: '15 Feb', amount: 16800 },
    { date: '16 Feb', amount: 12400 },
    { date: '17 Feb', amount: 11200 },
    { date: '18 Feb', amount: 13900 },
    { date: '19 Feb', amount: 17200 },
    { date: '20 Feb', amount: 15600 },
    { date: '21 Feb', amount: 14100 },
    { date: '22 Feb', amount: 16400 },
    { date: '23 Feb', amount: 18900 },
    { date: '24 Feb', amount: 17300 },
    { date: '25 Feb', amount: 19100 },
    { date: '26 Feb', amount: 20400 },
    { date: '27 Feb', amount: 21800 },
  ],

  // ── Top 5 products ────────────────────────────────────────────────────────
  topProducts: [
    { id: 'p1', name: 'Servicio Premium Mensual', qty: 312, revenue: 93600 },
    { id: 'p2', name: 'Consultoría Técnica (Hr)', qty: 248, revenue: 74400 },
    { id: 'p3', name: 'Licencia Enterprise', qty: 87, revenue: 43500 },
    { id: 'p4', name: 'Soporte Extendido', qty: 145, revenue: 29000 },
    { id: 'p5', name: 'Implementación Inicial', qty: 34, revenue: 20400 },
  ],

  // ── Category distribution ─────────────────────────────────────────────────
  categoryDistribution: [
    { id: 'c1', category: 'Servicios', value: 45, color: '#3B82F6' },
    { id: 'c2', category: 'Productos', value: 28, color: '#10B981' },
    { id: 'c3', category: 'Licencias', value: 17, color: '#F59E0B' },
    { id: 'c4', category: 'Soporte', value: 10, color: '#8B5CF6' },
  ],

  // ── Recent transactions ───────────────────────────────────────────────────
  recentTransactions: [
    {
      id: 1,
      name: 'INV/2025/00412',
      partner: 'Acme Corp S.A.',
      date: '27 Feb 2025',
      amount: 12_400,
      state: 'paid',
    },
    {
      id: 2,
      name: 'INV/2025/00411',
      partner: 'Tech Solutions Ltd.',
      date: '26 Feb 2025',
      amount: 8_900,
      state: 'pending',
    },
    {
      id: 3,
      name: 'INV/2025/00409',
      partner: 'Global Ventures Inc.',
      date: '25 Feb 2025',
      amount: 3_250,
      state: 'overdue',
    },
    {
      id: 4,
      name: 'INV/2025/00408',
      partner: 'StartUp Hub',
      date: '24 Feb 2025',
      amount: 21_000,
      state: 'paid',
    },
    {
      id: 5,
      name: 'INV/2025/00407',
      partner: 'Retail Plus',
      date: '23 Feb 2025',
      amount: 1_180,
      state: 'draft',
    },
  ],
};
