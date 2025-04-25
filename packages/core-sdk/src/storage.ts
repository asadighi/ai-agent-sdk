import { LogLevel } from './types.js';

// Only import Node.js modules if we're in a Node.js environment
let path: typeof import('path') | null = null;
let fs: typeof import('fs') | null = null;

// Initialize Node.js modules in a non-top-level context
const initializeNodeModules = async () => {
    if (typeof window === 'undefined') {
        try {
            path = await import('path');
            fs = await import('fs');
        } catch (error) {
            console.warn('Failed to import Node.js modules:', error);
        }
    }
};

// Initialize modules immediately but don't await the result
initializeNodeModules().catch(console.error);

export { LogLevel };

export interface ILogStorage {
    getLogs(): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>>;
    addLog(log: { timestamp: number; level: LogLevel; message: string; data?: any }): Promise<void>;
    clearLogs(): Promise<void>;
    rotateLogs(maxLogs: number): Promise<void>;
    getRotatedLogs(): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>>;
    getLogHistory(startTime?: number, endTime?: number): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>>;
    cleanupOldLogs(maxAge: number): Promise<void>;
    log(entry: { timestamp: number; level: LogLevel; message: string; data?: any }): Promise<void>;
    clear(): Promise<void>;
}

export class BrowserStorage implements ILogStorage {
    private readonly storageKey: string;
    private readonly rotatedLogsPrefix: string;
    private readonly MAX_CHUNK_SIZE = 1000; // Maximum logs per chunk
    private readonly CHUNK_INDEX_KEY: string;

    constructor(storageKey: string = 'ai-agent-logs') {
        this.storageKey = storageKey;
        this.rotatedLogsPrefix = `${storageKey}-rotated-`;
        this.CHUNK_INDEX_KEY = `${storageKey}-chunk-index`;
    }

    private getChunkKey(chunkIndex: number): string {
        return `${this.rotatedLogsPrefix}${chunkIndex}`;
    }

    private async getChunkIndex(): Promise<number> {
        const index = localStorage.getItem(this.CHUNK_INDEX_KEY);
        return index ? parseInt(index) : 0;
    }

    private async updateChunkIndex(index: number): Promise<void> {
        localStorage.setItem(this.CHUNK_INDEX_KEY, index.toString());
    }

    async getLogs(): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>> {
        const logs = localStorage.getItem(this.storageKey);
        return logs ? JSON.parse(logs) : [];
    }

    async getRotatedLogs(): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>> {
        const logs = localStorage.getItem(this.rotatedLogsPrefix);
        return logs ? JSON.parse(logs) : [];
    }

    async getLogHistory(startTime?: number, endTime?: number): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>> {
        const allLogs: Array<{ timestamp: number; level: LogLevel; message: string; data?: any }> = [];
        
        // Get current logs
        const currentLogs = await this.getLogs();
        allLogs.push(...currentLogs);

        // Get rotated logs from all chunks
        const chunkIndex = await this.getChunkIndex();
        for (let i = 0; i <= chunkIndex; i++) {
            const chunkKey = this.getChunkKey(i);
            const chunk = localStorage.getItem(chunkKey);
            if (chunk) {
                const logs = JSON.parse(chunk);
                allLogs.push(...logs);
            }
        }

        // Filter by time range if specified
        return allLogs.filter(log => {
            if (startTime && log.timestamp < startTime) return false;
            if (endTime && log.timestamp > endTime) return false;
            return true;
        });
    }

    async addLog(log: { timestamp: number; level: LogLevel; message: string; data?: any }): Promise<void> {
        const logs = await this.getLogs();
        logs.push(log);
        localStorage.setItem(this.storageKey, JSON.stringify(logs));
    }

    async clearLogs(): Promise<void> {
        localStorage.removeItem(this.storageKey);
        const chunkIndex = await this.getChunkIndex();
        for (let i = 0; i <= chunkIndex; i++) {
            localStorage.removeItem(this.getChunkKey(i));
        }
        localStorage.removeItem(this.CHUNK_INDEX_KEY);
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
                const chunkKey = this.getChunkKey(chunkIndex);
                localStorage.setItem(chunkKey, JSON.stringify(chunk));
                chunkIndex++;
            }
            
            // Update chunk index
            await this.updateChunkIndex(chunkIndex - 1);
            
            // Update current logs
            localStorage.setItem(this.storageKey, JSON.stringify(currentLogs));
        }
    }

    async cleanupOldLogs(maxAge: number): Promise<void> {
        const now = Date.now();
        const chunkIndex = await this.getChunkIndex();
        
        for (let i = 0; i <= chunkIndex; i++) {
            const chunkKey = this.getChunkKey(i);
            const chunk = localStorage.getItem(chunkKey);
            if (chunk) {
                const logs = JSON.parse(chunk);
                const filteredLogs = logs.filter((log: { timestamp: number }) => now - log.timestamp <= maxAge);
                
                if (filteredLogs.length === 0) {
                    localStorage.removeItem(chunkKey);
                } else if (filteredLogs.length !== logs.length) {
                    localStorage.setItem(chunkKey, JSON.stringify(filteredLogs));
                }
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

export class FileStorage implements ILogStorage {
    private readonly logDir: string;
    private readonly MAX_CHUNK_SIZE = 1000; // Maximum logs per chunk

    constructor(logDir: string) {
        if (typeof window !== 'undefined') {
            throw new Error('FileStorage is not available in browser environments. Use BrowserStorage instead.');
        }
        this.logDir = logDir;
    }

    private async ensureNodeModules(): Promise<void> {
        if (!path || !fs) {
            await initializeNodeModules();
            if (!path || !fs) {
                throw new Error('Node.js modules are not available. FileStorage can only be used in Node.js environments.');
            }
        }
    }

    private getChunkPath(chunkIndex: number): string {
        if (!path) throw new Error('path module not available');
        return path.join(this.logDir, `logs-${chunkIndex}.json`);
    }

    private async getChunkIndex(): Promise<number> {
        await this.ensureNodeModules();
        if (!fs) throw new Error('fs module not available');
        const files = await fs.promises.readdir(this.logDir);
        const chunkFiles = files.filter(file => file.startsWith('logs-') && file.endsWith('.json'));
        if (chunkFiles.length === 0) return 0;
        const indices = chunkFiles.map(file => parseInt(file.replace('logs-', '').replace('.json', '')));
        return Math.max(...indices);
    }

    async getLogs(): Promise<Array<{ timestamp: number; level: LogLevel; message: string; data?: any }>> {
        await this.ensureNodeModules();
        if (!fs) throw new Error('fs module not available');
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
        await this.ensureNodeModules();
        if (!fs) throw new Error('fs module not available');
        const allLogs: Array<{ timestamp: number; level: LogLevel; message: string; data?: any }> = [];
        
        // Get all rotated logs from chunks except the current one
        const files = await fs.promises.readdir(this.logDir);
        const chunkFiles = files.filter(file => file.startsWith('logs-') && file.endsWith('.json'));
        const currentChunkIndex = await this.getChunkIndex();
        
        for (const file of chunkFiles) {
            const chunkIndex = parseInt(file.replace('logs-', '').replace('.json', ''));
            if (chunkIndex < currentChunkIndex) {
                const chunkPath = path ? path.join(this.logDir, file) : file;
                const data = await fs.promises.readFile(chunkPath, 'utf-8');
                const logs = JSON.parse(data);
                allLogs.push(...logs);
            }
        }

        return allLogs;
    }

    async addLog(log: { timestamp: number; level: LogLevel; message: string; data?: any }): Promise<void> {
        await this.ensureNodeModules();
        if (!fs) throw new Error('fs module not available');
        const logs = await this.getLogs();
        logs.push(log);
        const chunkIndex = await this.getChunkIndex();
        const chunkPath = this.getChunkPath(chunkIndex);
        await fs.promises.writeFile(chunkPath, JSON.stringify(logs));
    }

    async clearLogs(): Promise<void> {
        await this.ensureNodeModules();
        if (!fs || !path) throw new Error('Node.js modules not available');
        const files = await fs.promises.readdir(this.logDir);
        const chunkFiles = files.filter(file => file.startsWith('logs-') && file.endsWith('.json'));
        
        // Use non-null assertion since we've already checked above
        const fsModule = fs!;
        const pathModule = path!;
        
        await Promise.all(chunkFiles.map(file => 
            fsModule.promises.unlink(pathModule.join(this.logDir, file))
        ));
    }

    async rotateLogs(maxLogs: number): Promise<void> {
        await this.ensureNodeModules();
        if (!fs) throw new Error('fs module not available');
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
        await this.ensureNodeModules();
        if (!fs || !path) throw new Error('Node.js modules not available');
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
        await this.ensureNodeModules();
        if (!fs || !path) throw new Error('Node.js modules not available');
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

// Export a factory function to create the appropriate storage instance
export function createStorage(storageKey?: string): ILogStorage {
    if (typeof window === 'undefined') {
        throw new Error('FileStorage is not available in browser environments. Use BrowserStorage instead.');
    }
    return new BrowserStorage(storageKey);
} 