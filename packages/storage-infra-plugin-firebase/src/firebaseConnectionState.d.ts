import { Firestore } from 'firebase/firestore';
import { ConnectionState } from '@ai-agent/common-sdk';
export declare class FirebaseConnectionState extends ConnectionState {
    private db;
    private unsubscribe;
    constructor(db: Firestore);
    protected setupConnectionMonitoring(): void;
    protected checkConnection(): Promise<void>;
    protected cleanup(): void;
}
//# sourceMappingURL=firebaseConnectionState.d.ts.map