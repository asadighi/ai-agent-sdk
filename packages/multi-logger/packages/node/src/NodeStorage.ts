import { ILogStorage, LogEntry } from '@ai-agent/multi-logger/types';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export class NodeStorage implements ILogStorage {
    private maxLogs: number;
    private rotationInterval: number;
    private rotationTimer?: NodeJS.Timeout;
    private logFile: string;
    private recentLogs: LogEntry[] = [];
    private recentLogsMaxSize: number = 100;

    constructor(maxLogs: number = 1000, rotationInterval: number = 60000, logFile: string = 'logs.json') {
        this.maxLogs = maxLogs;
        this.rotationInterval = rotationInterval;
        this.logFile = logFile;
        this.initializeLogFile();
        this.startRotation();
    }

    async log(entry: LogEntry): Promise<void> {
        // Keep recent logs in memory for quick access
        this.recentLogs.push(entry);
        if (this.recentLogs.length > this.recentLogsMaxSize) {
            this.recentLogs.shift();
        }

        // Append to file with proper JSON formatting
        const logLine = JSON.stringify(entry) + '\n';
        await fs.promises.appendFile(this.logFile, logLine);
    }

    async getLogs(): Promise<LogEntry[]> {
        try {
            // First try to read from file
            const logs: LogEntry[] = [];
            const fileStream = fs.createReadStream(this.logFile);
            
            for await (const line of this.createLineStream(fileStream)) {
                if (line.trim()) {
                    try {
                        const entry = JSON.parse(line);
                        logs.push(entry);
                    } catch (e) {
                        console.error('Error parsing log line:', e);
                    }
                }
            }

            // Apply max logs limit
            if (logs.length > this.maxLogs) {
                return logs.slice(-this.maxLogs);
            }

            return logs;
        } catch (error) {
            console.error('Error reading logs:', error);
            return [];
        }
    }

    async clear(): Promise<void> {
        this.recentLogs = [];
        await fs.promises.writeFile(this.logFile, '');
    }

    private startRotation(): void {
        if (this.rotationInterval > 0) {
            this.rotationTimer = setInterval(() => {
                this.clear();
            }, this.rotationInterval);
        }
    }

    stopRotation(): void {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        }
    }

    private initializeLogFile(): void {
        try {
            if (!fs.existsSync(this.logFile)) {
                fs.writeFileSync(this.logFile, '');
            }
        } catch (error) {
            console.error('Error initializing log file:', error);
        }
    }

    private async *createLineStream(readable: Readable): AsyncGenerator<string> {
        let buffer = '';
        for await (const chunk of readable) {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                yield line;
            }
        }
        if (buffer) {
            yield buffer;
        }
    }
} 