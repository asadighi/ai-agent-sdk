/// <reference lib="dom" />

import { ILogStorage, LogEntry } from '../types';

declare global {
    interface Window {
        localStorage: Storage;
    }
}

export class BrowserStorage implements ILogStorage {
    private readonly STORAGE_KEY = 'logger_entries';

    constructor() {}

    async log(entry: LogEntry): Promise<void> {
        const entries = await this.getLogs();
        entries.push(entry);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    }

    async getLogs(): Promise<LogEntry[]> {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    async clear(): Promise<void> {
        localStorage.removeItem(this.STORAGE_KEY);
    }
} 