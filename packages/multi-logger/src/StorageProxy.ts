import { ILogStorage, LogEntry } from './types';

export class StorageProxy implements ILogStorage {
  private target: ILogStorage | null = null;
  private initializationPromise: Promise<void> | null = null;
  
  private async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = (async () => {
      if (!this.target) {
        if (typeof window !== 'undefined') {
          // Dynamic import ensures browser code is only loaded in browser
          const { BrowserStorage } = await import('./web/BrowserStorage');
          this.target = new BrowserStorage();
        } else {
          // Dynamic import ensures Node.js code is only loaded in Node
          const { FileStorage } = await import('./node/FileStorage');
          this.target = new FileStorage();
        }
      }
    })();
    
    return this.initializationPromise;
  }
  
  async log(entry: LogEntry): Promise<void> {
    await this.initialize();
    await this.target!.log(entry);
  }
  
  async getLogs(): Promise<LogEntry[]> {
    await this.initialize();
    return this.target!.getLogs();
  }
  
  async clear(): Promise<void> {
    await this.initialize();
    await this.target!.clear();
  }
} 