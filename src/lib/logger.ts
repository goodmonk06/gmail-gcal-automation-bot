/**
 * Structured Logging Utility
 *
 * Provides context-aware logging with different levels.
 * Can be extended to use Winston, Pino, or cloud logging services.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service?: string;
  ruleId?: number;
  messageId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private context: LogContext = {};
  private minLevel: LogLevel = 'info';

  constructor(defaultContext?: LogContext) {
    if (defaultContext) {
      this.context = { ...defaultContext };
    }

    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && this.isValidLevel(envLevel)) {
      this.minLevel = envLevel as LogLevel;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger({ ...this.context, ...context });
    child.minLevel = this.minLevel;
    return child;
  }

  /**
   * Set default context for all logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetail = error instanceof Error
      ? { message: error.message, stack: error.stack, code: (error as any).code }
      : undefined;

    this.log('error', message, context, errorDetail);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: { message: string; stack?: string; code?: string }
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = error;
    }

    this.output(entry);
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  /**
   * Output log entry (can be overridden for different outputs)
   */
  private output(entry: LogEntry): void {
    const formatted = this.format(entry);

    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * Format log entry for output
   */
  private format(entry: LogEntry): string {
    if (process.env.LOG_FORMAT === 'json') {
      return JSON.stringify(entry);
    }

    // Human-readable format
    const parts = [
      entry.timestamp,
      `[${entry.level.toUpperCase()}]`,
      entry.message,
    ];

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.error) {
      parts.push('\n  Error:', entry.error.message);
      if (entry.error.stack) {
        parts.push('\n  Stack:', entry.error.stack);
      }
    }

    return parts.join(' ');
  }

  /**
   * Check if string is valid log level
   */
  private isValidLevel(level: string): level is LogLevel {
    return ['debug', 'info', 'warn', 'error'].includes(level);
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

export function getLogger(context?: LogContext): Logger {
  if (!globalLogger) {
    globalLogger = new Logger({ service: 'gmail-gcal-bot' });
  }

  if (context) {
    return globalLogger.child(context);
  }

  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}
