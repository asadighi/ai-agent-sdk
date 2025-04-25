import { LogEntry, LogLevel, LoggerConfig, ILogStorage, ILogger } from '@ai-agent/multi-logger/types';
import { NodeStorage } from './NodeStorage';

export class NodeLogger implements ILogger {
    private storage: ILogStorage;
    private config: LoggerConfig;

    constructor(config: LoggerConfig = {}) {
        this.config = {
            ...config,
            level: config.level || config.logLevel || LogLevel.INFO
        };
        this.storage = config.storage || new NodeStorage(
            config.maxLogs,
            config.rotationInterval
        );
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
                const formattedMessage = `[${level}] ${message}`;
                switch (level) {
                    case LogLevel.DEBUG:
                        console.debug(formattedMessage);
                        break;
                    case LogLevel.INFO:
                        console.info(formattedMessage);
                        break;
                    case LogLevel.WARN:
                        console.warn(formattedMessage);
                        break;
                    case LogLevel.ERROR:
                        console.error(formattedMessage);
                        break;
                    default:
                        console.log(formattedMessage);
                }
            }
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
        return this.getLevelPriority(level) >= this.getLevelPriority(this.config.level!);
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