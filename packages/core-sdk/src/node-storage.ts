import { LogLevel, ILogStorage } from './storage.js';
import path from 'path';
import fs from 'fs';

export class FileStorage implements ILogStorage {
    private readonly logDir: string;
    private readonly MAX_CHUNK_SIZE = 1000; // Maximum logs per chunk

    constructor(logDir: string) {
        this.logDir = logDir;
    }

    private getChunkPath(chunkIndex: number): string {
        return path.join(this.logDir, `logs-${chunkIndex}.json`);
    }

    private async getChunkIndex(): Promise<number> {
        const files = await fs.promises.readdir(this.logDir);
        const chunkFiles = files.filter(file => file.startsWith('logs-') && file.endsWith('.json'));
        if (chunkFiles.length === 0) return 0;
        const indices = chunkFiles.map(file => parseInt(file.replace('logs-', '').replace('.json', '')));
        return Math.max(...indices);
    }

    async getLogs(): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>> {
        const chunkIndex = await this.getChunkIndex();
        const chunkPath = this.getChunkPath(chunkIndex);
        try {
            const data = await fs.promises.readFile(chunkPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async getRotatedLogs(): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>> {
        const allLogs: Array<{ timestamp: number; level: LogLevel; message: string; data?: any }> = [];
        
        // Get all rotated logs from chunks except the current one
        const files = await fs.promises.readdir(this.logDir);
        const chunkFiles = files.filter(file => file.startsWith('logs-') && file.endsWith('.json'));
        const currentChunkIndex = await this.getChunkIndex();
        
        for (const file of chunkFiles) {
            const chunkIndex = parseInt(file.replace('logs-', '').replace('.json', ''));
            if (chunkIndex < currentChunkIndex) {
                const chunkPath = path.join(this.logDir, file);
                const data = await fs.promises.readFile(chunkPath, 'utf-8');
                const logs = JSON.parse(data);
                allLogs.push(...logs);
            }
        }

        return allLogs;
    }

    async addLog(log: { timestamp: number; level: LogLevel; message: string; data?: any }): Promise<void> {
        const logs = await this.getLogs();
        logs.push(log);
        const chunkIndex = await this.getChunkIndex();
        const chunkPath = this.getChunkPath(chunkIndex);
        await fs.promises.writeFile(chunkPath, JSON.stringify(logs));
    }

    async clearLogs(): Promise<void> {
        const files = await fs.promises.readdir(this.logDir);
        const chunkFiles = files.filter(file => file.startsWith('logs-') && file.endsWith('.json'));
        await Promise.all(chunkFiles.map(file => fs.promises.unlink(path.join(this.logDir, file))));
    }

    async rotateLogs(maxLogs: number): Promise<void> {
        const logs = await this.getLogs();
        if (logs.length > maxLogs) {
            const rotatedLogs = logs.slice(0, -maxLogs);
            const currentLogs = logs.slice(-maxLogs);
            
            // Get current chunk index
            let chunkIndex = await this.getChunkIndex();
            
            // Split rotated logs into chunks
            for (let i = 0; i < rotatedLogs.length; i += this.MAX_CHUNK_SIZE) {
                const chunk = rotatedLogs.slice(i, i + this.MAX_CHUNK_SIZE);
                const chunkPath = this.getChunkPath(chunkIndex);
                await fs.promises.writeFile(chunkPath, JSON.stringify(chunk));
                chunkIndex++;
            }
            
            // Update current logs
            const currentChunkPath = this.getChunkPath(chunkIndex);
            await fs.promises.writeFile(currentChunkPath, JSON.stringify(currentLogs));
        }
    }

    async getLogHistory(startTime?: number, endTime?: number): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>> {
        const allLogs: Array<{ timestamp: number; level: LogLevel; message: string; data?: any }> = [];
        
        // Get current logs
        const currentLogs = await this.getLogs();
        allLogs.push(...currentLogs);

        // Get rotated logs from all chunks
        const files = await fs.promises.readdir(this.logDir);
        const chunkFiles = files.filter(file => file.startsWith('logs-') && file.endsWith('.json'));
        for (const file of chunkFiles) {
            const chunkPath = path.join(this.logDir, file);
            const data = await fs.promises.readFile(chunkPath, 'utf-8');
            const logs = JSON.parse(data);
            allLogs.push(...logs);
        }

        // Filter by time range if specified
        return allLogs.filter(log => {
            if (startTime && log.timestamp < startTime) return false;
            if (endTime && log.timestamp > endTime) return false;
            return true;
        });
    }

    async cleanupOldLogs(maxAge: number): Promise<void> {
        const now = Date.now();
        const files = await fs.promises.readdir(this.logDir);
        const chunkFiles = files.filter(file => file.startsWith('logs-') && file.endsWith('.json'));
        
        for (const file of chunkFiles) {
            const chunkPath = path.join(this.logDir, file);
            const data = await fs.promises.readFile(chunkPath, 'utf-8');
            const logs = JSON.parse(data);
            const filteredLogs = logs.filter((log: { timestamp: number }) => now - log.timestamp <= maxAge);
            
            if (filteredLogs.length === 0) {
                await fs.promises.unlink(chunkPath);
            } else if (filteredLogs.length !== logs.length) {
                await fs.promises.writeFile(chunkPath, JSON.stringify(filteredLogs));
            }
        }
    }

    async log(entry: { timestamp: number; level: LogLevel; message: string; data?: any }): Promise<void> {
        await this.addLog(entry);
    }

    async clear(): Promise<void> {
        await this.clearLogs();
    }
} 