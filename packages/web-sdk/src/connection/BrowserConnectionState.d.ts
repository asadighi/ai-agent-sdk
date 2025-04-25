import { ConnectionState } from '@ai-agent/core-sdk';
import { Firestore } from 'firebase/firestore';
export declare class BrowserConnectionState extends ConnectionState {
    private unsubscribes;
    constructor(db: Firestore);
    protected setupConnectionMonitoring(): void;
    protected checkConnection(): Promise<void>;
    protected cleanup(): void;
}
//# sourceMappingURL=BrowserConnectionState.d.ts.map