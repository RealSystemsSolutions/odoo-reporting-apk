import { create } from "zustand";
import type {
  SalesMarginReport,
  InventoryReport,
  PosShiftReport,
  ReportingPeriod,
  MasterReportData,
} from "@/types/odoo.types";
import {
  OdooSalesMarginService,
  OdooInventoryService,
  OdooPosService,
  OdooMasterReportService,
} from "@/services/odoo.service";

// ─── State shape ──────────────────────────────────────────────────────────────

interface ReportsState {
  // Data
  salesMarginReport: SalesMarginReport | null;
  inventoryReport: InventoryReport | null;
  posShiftReport: PosShiftReport | null;
  masterReport: MasterReportData | null;

  // Loading flags
  isLoadingSalesMargin: boolean;
  isLoadingInventory: boolean;
  isLoadingPosShift: boolean;
  isLoadingMaster: boolean;

  // Period
  period: ReportingPeriod;
  // Optional custom date range (YYYY-MM-DD)
  startDate: string | null;
  endDate: string | null;

  // Actions
  setPeriod: (period: ReportingPeriod) => void;
  setDateRange: (start: string | null, end: string | null) => void;

  loadSalesMarginReport: () => Promise<void>;
  loadInventoryReport: () => Promise<void>;
  loadPosShiftReport: () => Promise<void>;
  loadMasterReport: () => Promise<void>;

  // Load all reports
  loadAllReports: () => Promise<void>;

  // Reset
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReportsStore = create<ReportsState>((set, get) => ({
  // Initial state
  salesMarginReport: null,
  inventoryReport: null,
  posShiftReport: null,
  masterReport: null,

  isLoadingSalesMargin: false,
  isLoadingInventory: false,
  isLoadingPosShift: false,
  isLoadingMaster: false,

  period: "month",
  startDate: null,
  endDate: null,

  // Actions
  setPeriod: (period) => set({ period }),
  setDateRange: (start, end) => set({ startDate: start, endDate: end }),

  loadSalesMarginReport: async () => {
    const { period, startDate, endDate } = get();
    set({ isLoadingSalesMargin: true });
    try {
      const data = await OdooSalesMarginService.getSalesMarginReport(
        period,
        startDate ?? undefined,
        endDate ?? undefined,
      );
      set({ salesMarginReport: data, isLoadingSalesMargin: false });
    } catch (e) {
      console.error("Error loading sales margin report:", e);
      set({ isLoadingSalesMargin: false });
    }
  },

  loadInventoryReport: async () => {
    set({ isLoadingInventory: true });
    try {
      const data = await OdooInventoryService.getInventoryReport();
      set({ inventoryReport: data, isLoadingInventory: false });
    } catch (e) {
      console.error("Error loading inventory report:", e);
      set({ isLoadingInventory: false });
    }
  },

  loadPosShiftReport: async () => {
    const { startDate, endDate } = get();
    set({ isLoadingPosShift: true });
    try {
      const data = await OdooPosService.getPosShiftReport(
        startDate ?? undefined,
        endDate ?? undefined,
      );
      set({ posShiftReport: data, isLoadingPosShift: false });
    } catch (e) {
      console.error("Error loading POS report:", e);
      set({ isLoadingPosShift: false });
    }
  },

  loadMasterReport: async () => {
    const { period, startDate, endDate } = get();

    let finalStart = startDate;
    let finalEnd = endDate;

    // If no custom dates, calculate based on period
    if (!finalStart || !finalEnd) {
      const now = new Date();
      if (period === "today") {
        finalStart = finalEnd = now.toISOString().split("T")[0];
      } else if (period === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        finalStart = start.toISOString().split("T")[0];
        finalEnd = now.toISOString().split("T")[0];
      } else if (period === "month") {
        finalStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        finalEnd = now.toISOString().split("T")[0];
      }
    }

    if (!finalStart || !finalEnd) return;

    set({ isLoadingMaster: true });
    try {
      const data = await OdooMasterReportService.getMasterReport(
        finalStart,
        finalEnd,
      );
      set({ masterReport: data, isLoadingMaster: false });
    } catch (e) {
      console.error("Error loading Master report:", e);
      set({ isLoadingMaster: false });
    }
  },

  loadAllReports: async () => {
    const {
      loadSalesMarginReport,
      loadInventoryReport,
      loadPosShiftReport,
      loadMasterReport,
    } = get();

    await Promise.all([
      loadSalesMarginReport(),
      loadInventoryReport(),
      loadPosShiftReport(),
      loadMasterReport(),
    ]);
  },

  reset: () =>
    set({
      salesMarginReport: null,
      inventoryReport: null,
      posShiftReport: null,
      masterReport: null,
      isLoadingSalesMargin: false,
      isLoadingInventory: false,
      isLoadingPosShift: false,
      isLoadingMaster: false,
    }),
}));
