import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'success',
  show: (message, type = 'success') => set({ visible: true, message, type }),
  hide: () => set({ visible: false }),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
  warning: (message: string) => useToastStore.getState().show(message, 'warning'),
  info: (message: string) => useToastStore.getState().show(message, 'info'),
};