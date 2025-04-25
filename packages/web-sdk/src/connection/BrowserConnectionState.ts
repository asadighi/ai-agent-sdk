import { ConnectionState } from '@ai-agent/core-sdk';
import { Firestore } from 'firebase/firestore';
import { collection, doc, setDoc } from 'firebase/firestore';

export class BrowserConnectionState extends ConnectionState {
    private unsubscribes: (() => void)[] = [];

    constructor(db: Firestore) {
        super(db);
        this.setupConnectionMonitoring();
    }

    protected setupConnectionMonitoring(): void {
        // Monitor online/offline state
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Initial connection check
        this.checkConnection();
    }

    protected async checkConnection(): Promise<void> {
        try {
            // Try to write a small document to check connection
            const testCollection = collection(this.db, 'connection-test');
            const testDoc = doc(testCollection, 'test');
            await setDoc(testDoc, { timestamp: Date.now() });
            this.handleOnline();
        } catch (error) {
            this.handleOffline();
        }
    }

    protected cleanup(): void {
        // Remove event listeners
        window.removeEventListener('online', () => this.handleOnline());
        window.removeEventListener('offline', () => this.handleOffline());

        // Clean up any other subscriptions
        this.unsubscribes.forEach(unsubscribe => unsubscribe());
        this.unsubscribes = [];
    }
} 