import { create } from 'zustand';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: string;
}

interface ConfirmState {
  visible: boolean;
  config: ConfirmConfig | null;
  _resolve: ((value: boolean) => void) | null;
  show: (config: ConfirmConfig) => Promise<boolean>;
  _answer: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  visible: false,
  config: null,
  _resolve: null,
  show: (config) =>
    new Promise<boolean>((resolve) => {
      set({ visible: true, config, _resolve: resolve });
    }),
  _answer: (value) => {
    get()._resolve?.(value);
    set({ visible: false, config: null, _resolve: null });
  },
}));

export const confirm = (config: ConfirmConfig) => useConfirmStore.getState().show(config);