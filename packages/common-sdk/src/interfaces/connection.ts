import { Logger, LogLevel } from '@ai-agent/multi-logger';

export abstract class ConnectionState {
    protected isOnline: boolean = false;
    protected subscribers: ((isOnline: boolean) => void)[] = [];
    protected logger: Logger;

    constructor() {
        this.logger = new Logger({
            logLevel: LogLevel.INFO,
            logToConsole: true,
            maxLogs: 1000,
            rotationInterval: 60000
        });
    }

    protected abstract setupConnectionMonitoring(): void;
    protected abstract checkConnection(): Promise<void>;
    protected abstract cleanup(): void;

    protected handleOnline(): void {
        if (!this.isOnline) {
            this.logger.info('Connection restored');
            this.isOnline = true;
            this.notifySubscribers(true);
        }
    }

    protected handleOffline(): void {
        if (this.isOnline) {
            this.logger.info('Connection lost');
            this.isOnline = false;
            this.notifySubscribers(false);
        }
    }

    private notifySubscribers(isOnline: boolean): void {
        this.subscribers.forEach(callback => {
            try {
                callback(isOnline);
            } catch (error) {
                this.logger.error('Error in connection state subscriber:', error);
            }
        });
    }

    public subscribeToConnectionState(callback: (isOnline: boolean) => void): void {
        this.subscribers.push(callback);
        callback(this.isOnline);
    }

    public unsubscribeFromConnectionState(callback: (isOnline: boolean) => void): void {
        this.subscribers = this.subscribers.filter(sub => sub !== callback);
    }

    public getIsOnline(): boolean {
        return this.isOnline;
    }
} 