import { Logger as MultiLogger, LogLevel, type LogEntry, type LoggerConfig } from '@ai-agent/multi-logger';

// Re-export everything from multi-logger
export { MultiLogger as Logger, LogLevel, type LogEntry, type LoggerConfig };

// Create a default logger instance for convenience
const defaultLogger = new MultiLogger({
    logLevel: LogLevel.INFO,
    logToConsole: true,
    maxLogs: 1000,
    rotationInterval: 24 * 60 * 60 * 1000 // 1 day
});

// Export convenience methods from the default instance
export const debug = defaultLogger.debug.bind(defaultLogger);
export const info = defaultLogger.info.bind(defaultLogger);
export const warn = defaultLogger.warn.bind(defaultLogger);
export const error = defaultLogger.error.bind(defaultLogger);

// Export the default logger instance
export default defaultLogger;

export interface LoggerInterface {
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
  log(level: string, message: string, metadata?: Record<string, unknown>): void;
} 