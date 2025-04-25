import { ILogStorage, LogEntry } from '@ai-agent/multi-logger/types';

export class WebStorage implements ILogStorage {
    private logs: LogEntry[] = [];
    private maxLogs: number;
    private rotationInterval: number;
    private rotationTimer?: number;

    constructor(maxLogs: number = 1000, rotationInterval: number = 60000) {
        this.maxLogs = maxLogs;
        this.rotationInterval = rotationInterval;
        this.startRotation();
    }

    async log(entry: LogEntry): Promise<void> {
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    async getLogs(): Promise<LogEntry[]> {
        return [...this.logs];
    }

    async clear(): Promise<void> {
        this.logs = [];
    }

    private startRotation(): void {
        if (this.rotationInterval > 0) {
            this.rotationTimer = window.setInterval(() => {
                this.clear();
            }, this.rotationInterval);
        }
    }

    stopRotation(): void {
        if (this.rotationTimer) {
            window.clearInterval(this.rotationTimer);
        }
    }
} 