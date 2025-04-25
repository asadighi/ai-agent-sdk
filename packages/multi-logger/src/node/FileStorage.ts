import { promises as fs } from 'fs';
import path from 'path';
import { ILogStorage, LogEntry } from '../types';

export class FileStorage implements ILogStorage {
    private readonly logDir: string;
    private readonly logFile: string;

    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(this.logDir, 'app.log');
    }

    async log(entry: LogEntry): Promise<void> {
        await this.ensureLogDirectory();
        await fs.appendFile(this.logFile, JSON.stringify(entry) + '\n');
    }

    async getLogs(): Promise<LogEntry[]> {
        await this.ensureLogDirectory();
        try {
            const data = await fs.readFile(this.logFile, 'utf-8');
            return data.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    async clear(): Promise<void> {
        await this.ensureLogDirectory();
        await fs.writeFile(this.logFile, '');
    }

    private async ensureLogDirectory(): Promise<void> {
        try {
            await fs.access(this.logDir);
        } catch {
            await fs.mkdir(this.logDir, { recursive: true });
        }
    }

    async addLog(log: LogEntry): Promise<void> {
        await this.ensureLogDirectory();
        const logs = await this.getLogs();
        logs.push(log);
        await fs.writeFile(this.logFile, JSON.stringify(logs, null, 2));
    }

    async rotateLogs(maxLogs: number = 1000): Promise<void> {
        const logs = await this.getLogs();
        if (logs.length > maxLogs) {
            const rotatedLogs = logs.slice(0, maxLogs);
            const currentLogs = logs.slice(maxLogs);
            const rotatedFile = path.join(this.logDir, `app.${Date.now()}.log`);
            await fs.writeFile(rotatedFile, JSON.stringify(rotatedLogs, null, 2));
            await fs.writeFile(this.logFile, JSON.stringify(currentLogs, null, 2));
        }
    }

    async getRotatedLogs(): Promise<LogEntry[][]> {
        await this.ensureLogDirectory();
        const files = await fs.readdir(this.logDir);
        const rotatedLogs: LogEntry[][] = [];
        for (const file of files) {
            if (file.startsWith('app.') && file.endsWith('.log') && file !== 'app.log') {
                const content = await fs.readFile(path.join(this.logDir, file), 'utf-8');
                rotatedLogs.push(JSON.parse(content));
            }
        }
        return rotatedLogs;
    }

    async cleanupOldLogs(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
        await this.ensureLogDirectory();
        const files = await fs.readdir(this.logDir);
        const currentTime = Date.now();
        for (const file of files) {
            if (file.startsWith('app.') && file.endsWith('.log') && file !== 'app.log') {
                const filePath = path.join(this.logDir, file);
                const stats = await fs.stat(filePath);
                if (currentTime - stats.mtimeMs > maxAge) {
                    await fs.unlink(filePath);
                }
            }
        }
    }
} 