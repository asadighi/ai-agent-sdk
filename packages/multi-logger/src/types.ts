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