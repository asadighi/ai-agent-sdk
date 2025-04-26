import { ILogger } from '@ai-agent/multi-logger/types';
import { IConnectionStatus, IDatabaseOperations } from '@ai-agent/connectivity/types';

export class FirebaseConnectionStatus implements IConnectionStatus {
    private isOnline: boolean = false;
    private subscribers: Set<(isOnline: boolean) => void> = new Set();
    private unsubscribe?: () => void;

    constructor(
        private readonly operations: IDatabaseOperations,
        private readonly logger: ILogger
    ) {
        this.setupConnectionListener();
    }

    private setupConnectionListener(): void {
        this.unsubscribe = this.operations.setupConnectionListener(
            () => {
                this.isOnline = true;
                this.logger.info('Connection restored');
                this.notifySubscribers();
            },
            () => {
                this.isOnline = false;
                this.logger.info('Connection lost');
                this.notifySubscribers();
            }
        );
    }

    private notifySubscribers(): void {
        this.subscribers.forEach(callback => {
            try {
                callback(this.isOnline);
            } catch (error) {
                this.logger.error('Error in connection state subscriber', { error });
            }
        });
    }

    public getIsOnline(): boolean {
        return this.isOnline;
    }

    public subscribeToConnectionState(callback: (isOnline: boolean) => void): void {
        this.subscribers.add(callback);
        // Notify immediately with current state
        try {
            callback(this.isOnline);
        } catch (error) {
            this.logger.error('Error in connection state subscriber', { error });
        }
    }

    public unsubscribeFromConnectionState(callback: (isOnline: boolean) => void): void {
        this.subscribers.delete(callback);
    }

    public cleanup(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
        this.subscribers.clear();
    }
} 