import { onSnapshot, enableNetwork, collection, doc } from 'firebase/firestore';
import { ConnectionState } from '@ai-agent/common-sdk';
export class FirebaseConnectionState extends ConnectionState {
    constructor(db) {
        super();
        this.unsubscribe = null;
        this.db = db;
        this.setupConnectionMonitoring();
    }
    setupConnectionMonitoring() {
        // Use a dummy document to monitor connection state
        const dummyCollection = collection(this.db, '_connection_state');
        const dummyDoc = doc(dummyCollection, '_dummy');
        this.unsubscribe = onSnapshot(dummyDoc, () => super.handleOnline(), () => super.handleOffline());
    }
    async checkConnection() {
        try {
            await enableNetwork(this.db);
            super.handleOnline();
        }
        catch (error) {
            super.handleOffline();
        }
    }
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}
//# sourceMappingURL=firebaseConnectionState.js.map