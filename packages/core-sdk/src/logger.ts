import { LogLevel, type LogEntry, type LoggerConfig, type ILogger } from '@ai-agent/multi-logger/types';
import { container, Tokens } from '@ai-agent/di-container';

// Re-export everything from multi-logger
export { LogLevel, type LogEntry, type LoggerConfig, type ILogger };

/**
 * Gets the logger instance from the dependency injection container.
 * This should be used by all core-sdk components that need logging.
 * 
 * @throws Error if no logger has been registered in the container
 */
export function getLogger(): ILogger {
    return container.get<ILogger>(Tokens.Logger);
}

// Export convenience methods that delegate to the injected logger
export const debug = (message: string, data?: any): Promise<void> => getLogger().debug(message, data);
export const info = (message: string, data?: any): Promise<void> => getLogger().info(message, data);
export const warn = (message: string, data?: any): Promise<void> => getLogger().warn(message, data);
export const error = (message: string, data?: any): Promise<void> => getLogger().error(message, data);

export interface LoggerInterface {
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
  log(level: string, message: string, metadata?: Record<string, unknown>): void;
} 