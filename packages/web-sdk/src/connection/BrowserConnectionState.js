import { ConnectionState } from '@ai-agent/core-sdk';
import { collection, doc, setDoc } from 'firebase/firestore';
export class BrowserConnectionState extends ConnectionState {
    constructor(db) {
        super(db);
        this.unsubscribes = [];
        this.setupConnectionMonitoring();
    }
    setupConnectionMonitoring() {
        // Monitor online/offline state
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        // Initial connection check
        this.checkConnection();
    }
    async checkConnection() {
        try {
            // Try to write a small document to check connection
            const testCollection = collection(this.db, 'connection-test');
            const testDoc = doc(testCollection, 'test');
            await setDoc(testDoc, { timestamp: Date.now() });
            this.handleOnline();
        }
        catch (error) {
            this.handleOffline();
        }
    }
    cleanup() {
        // Remove event listeners
        window.removeEventListener('online', () => this.handleOnline());
        window.removeEventListener('offline', () => this.handleOffline());
        // Clean up any other subscriptions
        this.unsubscribes.forEach(unsubscribe => unsubscribe());
        this.unsubscribes = [];
    }
}
//# sourceMappingURL=BrowserConnectionState.js.map