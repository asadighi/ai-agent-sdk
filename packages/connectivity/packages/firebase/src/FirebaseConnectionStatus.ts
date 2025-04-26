import { Firestore, onSnapshot, enableNetwork, collection, doc } from 'firebase/firestore';
import { IConnectionStatus } from '@ai-agent/connectivity/types';
import { ILogger } from '@ai-agent/multi-logger/types';

export class FirebaseConnectionStatus implements IConnectionStatus {
    private isOnline: boolean = false;
    private subscribers: ((isOnline: boolean) => void)[] = [];
    private db: Firestore;
    private unsubscribe: (() => void) | null = null;
    private logger: ILogger;

    constructor(db: Firestore, logger: ILogger) {
        this.db = db;
        this.logger = logger;
        this.setupConnectionMonitoring();
    }

    private setupConnectionMonitoring(): void {
        // Use a dummy document to monitor connection state
        const dummyCollection = collection(this.db, '_connection_state');
        const dummyDoc = doc(dummyCollection, '_dummy');
        this.unsubscribe = onSnapshot(
            dummyDoc,
            () => this.handleOnline(),
            () => this.handleOffline()
        );
    }

    private async checkConnection(): Promise<void> {
        try {
            await enableNetwork(this.db);
            this.handleOnline();
        } catch (error) {
            this.handleOffline();
        }
    }

    private handleOnline(): void {
        if (!this.isOnline) {
            this.logger.info('Connection restored');
            this.isOnline = true;
            this.notifySubscribers(true);
        }
    }

    private handleOffline(): void {
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

    public cleanup(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
} 