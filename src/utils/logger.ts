import { useLogStore } from '@/store/log.store';
import type { LogLevel } from '@/store/log.store';

const log = (level: LogLevel, context: string, message: string, data?: Record<string, unknown>) => {
  useLogStore.getState().addLog(level, context, message, data);
  const tag = `[${context}]`;
  if (level === 'error') console.error(tag, message, data ?? '');
  else if (level === 'warn') console.warn(tag, message, data ?? '');
  else console.log(tag, message, data ?? '');
};

export const logger = {
  info:  (context: string, message: string, data?: Record<string, unknown>) => log('info',  context, message, data),
  warn:  (context: string, message: string, data?: Record<string, unknown>) => log('warn',  context, message, data),
  error: (context: string, message: string, data?: Record<string, unknown>) => log('error', context, message, data),
  debug: (context: string, message: string, data?: Record<string, unknown>) => log('debug', context, message, data),
};
