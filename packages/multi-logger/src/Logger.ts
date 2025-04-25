import { LogEntry, LogLevel, LoggerConfig, ILogStorage } from './types';
import { StorageProxy } from './StorageProxy';

export class Logger {
    private storage: ILogStorage;
    private config: LoggerConfig;

    constructor(config: LoggerConfig = {}) {
        this.config = config;
        this.storage = config.storage || new StorageProxy();
    }

    async log(message: string, level: LogLevel = LogLevel.INFO): Promise<void> {
        if (this.shouldLog(level)) {
            const entry: LogEntry = {
                message,
                level,
                timestamp: Date.now()
            };
            
            // Always log to storage
            await this.storage.log(entry);
            
            // Log to console if enabled
            if (this.config.logToConsole) {
                const consoleMethod = this.getConsoleMethod(level);
                const formattedMessage = `[${level}] ${message}`;
                consoleMethod(formattedMessage);
            }
        }
    }

    private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
        switch (level) {
            case LogLevel.DEBUG: return console.debug;
            case LogLevel.INFO: return console.info;
            case LogLevel.WARN: return console.warn;
            case LogLevel.ERROR: return console.error;
            default: return console.log;
        }
    }

    async debug(message: string, data?: any): Promise<void> {
        const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        await this.log(fullMessage, LogLevel.DEBUG);
    }

    async info(message: string, data?: any): Promise<void> {
        const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        await this.log(fullMessage, LogLevel.INFO);
    }

    async warn(message: string, data?: any): Promise<void> {
        const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        await this.log(fullMessage, LogLevel.WARN);
    }

    async error(message: string, data?: any): Promise<void> {
        const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        await this.log(fullMessage, LogLevel.ERROR);
    }

    async getLogs(): Promise<LogEntry[]> {
        return this.storage.getLogs();
    }

    async clear(): Promise<void> {
        await this.storage.clear();
    }

    private shouldLog(level: LogLevel): boolean {
        const configLevel = this.config.level || this.config.logLevel || LogLevel.INFO;
        return this.getLevelPriority(level) >= this.getLevelPriority(configLevel);
    }

    private getLevelPriority(level: LogLevel): number {
        switch (level) {
            case LogLevel.DEBUG: return 0;
            case LogLevel.INFO: return 1;
            case LogLevel.WARN: return 2;
            case LogLevel.ERROR: return 3;
            default: return 1;
        }
    }
} 