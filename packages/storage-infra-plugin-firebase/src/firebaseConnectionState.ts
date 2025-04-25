import { Firestore, onSnapshot, enableNetwork, collection, doc } from 'firebase/firestore';
import { ConnectionState } from '@ai-agent/common-sdk';
import { Logger, LogLevel } from '@ai-agent/multi-logger';

export class FirebaseConnectionState extends ConnectionState {
    private db: Firestore;
    private unsubscribe: (() => void) | null = null;

    constructor(db: Firestore) {
        super();
        this.db = db;
        this.setupConnectionMonitoring();
    }

    protected setupConnectionMonitoring(): void {
        // Use a dummy document to monitor connection state
        const dummyCollection = collection(this.db, '_connection_state');
        const dummyDoc = doc(dummyCollection, '_dummy');
        this.unsubscribe = onSnapshot(
            dummyDoc,
            () => super.handleOnline(),
            () => super.handleOffline()
        );
    }

    protected async checkConnection(): Promise<void> {
        try {
            await enableNetwork(this.db);
            super.handleOnline();
        } catch (error) {
            super.handleOffline();
        }
    }

    protected cleanup(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
} 