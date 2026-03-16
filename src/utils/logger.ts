/**
 * Sistema de logging centralizado
 * Configurável via variável de ambiente ENABLE_LOGS
 */

import { env } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private enabled: boolean;

  constructor() {
    this.enabled = env.ENABLE_LOGS === 'true';
  }

  private log(level: LogLevel, context: string, message: string, data?: unknown) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, data !== undefined ? data : '');
        break;
      case 'info':
        console.log(prefix, message, data !== undefined ? data : '');
        break;
      case 'warn':
        console.warn(prefix, message, data !== undefined ? data : '');
        break;
      case 'error':
        console.error(prefix, message, data !== undefined ? data : '');
        break;
    }
  }

  debug(context: string, message: string, data?: unknown) {
    this.log('debug', context, message, data);
  }

  info(context: string, message: string, data?: unknown) {
    this.log('info', context, message, data);
  }

  warn(context: string, message: string, data?: unknown) {
    this.log('warn', context, message, data);
  }

  error(context: string, message: string, data?: unknown) {
    this.log('error', context, message, data);
  }
}

export const logger = new Logger();
