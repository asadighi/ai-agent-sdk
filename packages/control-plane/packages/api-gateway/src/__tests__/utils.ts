import { ILogger, LogLevel, LogEntry } from '@ai-agent/multi-logger/types';

export function createTestLogger(): ILogger {
    return {
        log: async (message: string, level?: LogLevel) => {
            // No-op for tests
        },
        debug: async (message: string, data?: any) => {
            // No-op for tests
        },
        info: async (message: string, data?: any) => {
            // No-op for tests
        },
        warn: async (message: string, data?: any) => {
            // No-op for tests
        },
        error: async (message: string, data?: any) => {
            // No-op for tests
        },
        getLogs: async (): Promise<LogEntry[]> => {
            return [];
        },
        clear: async (): Promise<void> => {
            // No-op for tests
        }
    };
} 