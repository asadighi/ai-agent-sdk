import { Firestore } from 'firebase/firestore';
import { ConnectionState } from '@ai-agent/core-sdk';
export declare class BrowserConnectionState extends ConnectionState {
    private static instance;
    private connectionCheckInterval;
    private lastConnectionCheck;
    private readonly CONNECTION_CHECK_INTERVAL;
    private readonly MIN_RETRY_DELAY;
    private readonly MAX_RETRY_DELAY;
    private currentRetryDelay;
    private constructor();
    static getInstance(db: Firestore): BrowserConnectionState;
    protected setupConnectionMonitoring(): void;
    private startConnectionCheck;
    protected checkConnection(): Promise<void>;
    protected cleanup(): void;
}
//# sourceMappingURL=connectionState.d.ts.map