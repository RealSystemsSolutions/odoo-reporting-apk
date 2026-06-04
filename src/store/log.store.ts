import { create } from 'zustand';
import { Platform } from 'react-native';

const LOG_STORAGE_KEY = 'app_debug_logs';
const MAX_ENTRIES = 500;

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
}

interface LogState {
  entries: LogEntry[];
  addLog: (level: LogLevel, context: string, message: string, data?: Record<string, unknown>) => void;
  clearLogs: () => void;
  loadPersistedLogs: () => void;
  exportLogs: () => string;
}

const persistToStorage = (entries: LogEntry[]) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
    } catch {}
  }
};

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],

  loadPersistedLogs: () => {
    if (Platform.OS !== 'web') return;
    try {
      const raw = localStorage.getItem(LOG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LogEntry[];
        set({ entries: parsed });
      }
    } catch {}
  },

  addLog: (level, context, message, data) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
    };
    const next = [...get().entries, entry].slice(-MAX_ENTRIES);
    set({ entries: next });
    persistToStorage(next);
  },

  clearLogs: () => {
    set({ entries: [] });
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(LOG_STORAGE_KEY); } catch {}
    }
  },

  exportLogs: () => {
    const { entries } = get();
    const systemInfo: Record<string, unknown> = {
      platform: Platform.OS,
      exportedAt: new Date().toISOString(),
    };
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      systemInfo.userAgent = navigator.userAgent;
      systemInfo.language = navigator.language;
      systemInfo.cookiesEnabled = navigator.cookieEnabled;
    }
    if (typeof window !== 'undefined' && window.screen) {
      systemInfo.screen = `${window.screen.width}x${window.screen.height}`;
    }
    return JSON.stringify({ systemInfo, logs: entries }, null, 2);
  },
}));
