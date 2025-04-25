import { Logger } from '@ai-agent/multi-logger';
export declare abstract class ConnectionState {
    protected isOnline: boolean;
    protected subscribers: ((isOnline: boolean) => void)[];
    protected logger: Logger;
    constructor();
    protected abstract setupConnectionMonitoring(): void;
    protected abstract checkConnection(): Promise<void>;
    protected abstract cleanup(): void;
    protected handleOnline(): void;
    protected handleOffline(): void;
    private notifySubscribers;
    subscribeToConnectionState(callback: (isOnline: boolean) => void): void;
    unsubscribeFromConnectionState(callback: (isOnline: boolean) => void): void;
    getIsOnline(): boolean;
}
//# sourceMappingURL=connection.d.ts.map