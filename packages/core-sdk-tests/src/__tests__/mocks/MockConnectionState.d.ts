import { ConnectionState } from '@ai-agent/core-sdk';
import { Firestore } from 'firebase/firestore';
export declare class MockConnectionState extends ConnectionState {
    private mockIsOnline;
    constructor(db: Firestore);
    protected setupConnectionMonitoring(): void;
    protected checkConnection(): Promise<void>;
    protected cleanup(): void;
    setMockOnline(isOnline: boolean): void;
    getIsOnline(): boolean;
}
//# sourceMappingURL=MockConnectionState.d.ts.map