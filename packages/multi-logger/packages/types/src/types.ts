/**
 * Core types for the multi-logger system.
 * 
 * This package provides the core types and interfaces used by all logger implementations.
 * 
 * Usage:
 * ```typescript
 * import { LogLevel, LogEntry, LoggerConfig, ILogger } from '@ai-agent/multi-logger/types';
 * 
 * // Use the appropriate logger implementation:
 * // - For web environments: `WebLogger` from `@ai-agent/multi-logger/web`
 * // - For Node.js environments: `NodeLogger` from `@ai-agent/multi-logger/node`
 * ```
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export interface LogEntry {
    message: string;
    level: LogLevel;
    timestamp: number;
    data?: any;
}

export interface LoggerConfig {
    level?: LogLevel;
    logLevel?: LogLevel;
    maxLogs?: number;
    logToConsole?: boolean;
    storage?: ILogStorage;
    rotationInterval?: number;  // Time in milliseconds between log rotations
}

export interface ILogStorage {
    log(entry: LogEntry): Promise<void>;
    getLogs(): Promise<LogEntry[]>;
    clear(): Promise<void>;
}

/**
 * Interface for logging functionality.
 * 
 * @remarks
 * This interface should not be implemented directly. Instead, use one of the existing implementations:
 * - For web environments: `WebLogger` from `@ai-agent/multi-logger/web`
 * - For Node.js environments: `NodeLogger` from `@ai-agent/multi-logger/node`
 * 
 * These implementations should be used through dependency injection to ensure proper platform-specific
 * behavior and maintainability.
 */
export interface ILogger {
    log(message: string, level?: LogLevel): Promise<void>;
    debug(message: string, data?: any): Promise<void>;
    info(message: string, data?: any): Promise<void>;
    warn(message: string, data?: any): Promise<void>;
    error(message: string, data?: any): Promise<void>;
    getLogs(): Promise<LogEntry[]>;
    clear(): Promise<void>;
} 