import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { OdooUser, ReportingPeriod, DashboardData } from '@/types/odoo.types';
import { OdooDashboardService } from '@/services/odoo.service';

// ─── Keys for SecureStore ─────────────────────────────────────────────────────

const STORE_KEY_USER = 'odoo_user';

// ─── State shape ──────────────────────────────────────────────────────────────

interface AppState {
  /** Logged-in user + tenant info. null = not authenticated */
  user: OdooUser | null;
  /** Active reporting period chip */
  period: ReportingPeriod;
  /** Whether the store has been rehydrated from SecureStore */
  ready: boolean;

  // Actions
  login: (user: OdooUser) => Promise<void>;
  logout: () => Promise<void>;
  setPeriod: (period: ReportingPeriod) => void;
  /** Call once on app boot to restore session */
  rehydrate: () => Promise<void>;

  dashboardData: DashboardData | null;
  isLoadingDashboard: boolean;
  loadDashboardData: () => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set) => ({
  user: null,
  period: 'month',
  ready: false,
  dashboardData: null,
  isLoadingDashboard: false,

  login: async (user) => {
    await SecureStore.setItemAsync(STORE_KEY_USER, JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(STORE_KEY_USER);
    set({ user: null });
  },

  setPeriod: (period) => set({ period }),

  rehydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORE_KEY_USER);
      if (raw) {
        const user: OdooUser = JSON.parse(raw);
        set({ user, ready: true });
      } else {
        set({ ready: true });
      }
    } catch {
      set({ ready: true });
    }
  },

  loadDashboardData: async () => {
    const { period } = useAppStore.getState();
    set({ isLoadingDashboard: true });
    try {
      const data = await OdooDashboardService.getDashboardData(period);
      set({ dashboardData: data, isLoadingDashboard: false });
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
      set({ isLoadingDashboard: false });
    }
  },
}));
