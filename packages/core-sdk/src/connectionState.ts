import { Firestore, onSnapshot, doc, getDoc, setDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { Logger, LogLevel } from '@ai-agent/multi-logger';

export class ConnectionState {
    private static instance: ConnectionState;
    private db: Firestore;
    private isOnline: boolean = false;
    private subscribers: ((isOnline: boolean) => void)[] = [];
    private logger: Logger;
    private connectionCheckInterval: NodeJS.Timeout | null = null;
    private lastConnectionCheck: number = 0;
    private readonly CONNECTION_CHECK_INTERVAL = 5000; // 5 seconds
    private readonly MIN_RETRY_DELAY = 1000; // 1 second
    private readonly MAX_RETRY_DELAY = 30000; // 30 seconds
    private currentRetryDelay: number = this.MIN_RETRY_DELAY;

    private constructor(db: Firestore) {
        this.db = db;
        this.logger = new Logger({
            logLevel: LogLevel.INFO,
            logToConsole: true,
            maxLogs: 1000,
            rotationInterval: 60000
        });

        // Set initial state based on browser's online status
        this.isOnline = navigator.onLine;
        this.logger.info(`Initial connection state: ${this.isOnline ? 'online' : 'offline'}`);

        // Set up network listeners
        this.setupNetworkListeners();
    }

    public static getInstance(db: Firestore): ConnectionState {
        if (!ConnectionState.instance) {
            ConnectionState.instance = new ConnectionState(db);
        }
        return ConnectionState.instance;
    }

    private setupNetworkListeners(): void {
        this.logger.info('Setting up network listeners');

        // Listen to browser's online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Start periodic connection check
        this.startConnectionCheck();
    }

    private startConnectionCheck(): void {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }

        this.connectionCheckInterval = setInterval(async () => {
            if (!this.isOnline) {
                // If we're offline, try to reconnect with exponential backoff
                await this.checkConnection();
            }
        }, this.CONNECTION_CHECK_INTERVAL);
    }

    private async checkConnection(): Promise<void> {
        const now = Date.now();
        if (now - this.lastConnectionCheck < this.currentRetryDelay) {
            return; // Skip if we haven't waited long enough
        }

        this.lastConnectionCheck = now;
        
        try {
            // Try a simple read operation to check connection
            const testDoc = doc(this.db, 'connection_test', 'test');
            await getDoc(testDoc);
            
            // If we get here, we're online
            this.handleOnline();
            this.currentRetryDelay = this.MIN_RETRY_DELAY; // Reset retry delay
        } catch (error) {
            this.logger.warn('Connection check failed:', error);
            // Increase retry delay with exponential backoff
            this.currentRetryDelay = Math.min(this.currentRetryDelay * 2, this.MAX_RETRY_DELAY);
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
        // Immediately notify with current state
        callback(this.isOnline);
    }

    public unsubscribeFromConnectionState(): void {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
        this.subscribers = [];
    }

    public getIsOnline(): boolean {
        return this.isOnline;
    }
} 