import { doc, getDoc } from 'firebase/firestore';
import { ConnectionState } from '@ai-agent/core-sdk';
export class BrowserConnectionState extends ConnectionState {
    constructor(db) {
        super(db);
        this.connectionCheckInterval = null;
        this.lastConnectionCheck = 0;
        this.CONNECTION_CHECK_INTERVAL = 5000; // 5 seconds
        this.MIN_RETRY_DELAY = 1000; // 1 second
        this.MAX_RETRY_DELAY = 30000; // 30 seconds
        this.currentRetryDelay = this.MIN_RETRY_DELAY;
        // Set initial state based on browser's online status
        this.isOnline = navigator.onLine;
        this.logger.info(`Initial connection state: ${this.isOnline ? 'online' : 'offline'}`);
    }
    static getInstance(db) {
        if (!BrowserConnectionState.instance) {
            BrowserConnectionState.instance = new BrowserConnectionState(db);
        }
        return BrowserConnectionState.instance;
    }
    setupConnectionMonitoring() {
        this.logger.info('Setting up network listeners');
        // Listen to browser's online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        // Start periodic connection check
        this.startConnectionCheck();
    }
    startConnectionCheck() {
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
    async checkConnection() {
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
        }
        catch (error) {
            this.logger.warn('Connection check failed:', error);
            // Increase retry delay with exponential backoff
            this.currentRetryDelay = Math.min(this.currentRetryDelay * 2, this.MAX_RETRY_DELAY);
        }
    }
    cleanup() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
        window.removeEventListener('online', () => this.handleOnline());
        window.removeEventListener('offline', () => this.handleOffline());
    }
}
//# sourceMappingURL=connectionState.js.map