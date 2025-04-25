import { ConnectionState } from '@ai-agent/core-sdk';
import { Firestore } from 'firebase/firestore';

export class MockConnectionState extends ConnectionState {
    private mockIsOnline: boolean = true;

    constructor(db: Firestore) {
        super(db);
    }

    protected setupConnectionMonitoring(): void {
        // No-op for tests
    }

    protected async checkConnection(): Promise<void> {
        // No-op for tests
    }

    protected cleanup(): void {
        // No-op for tests
    }

    // Test helper methods
    setMockOnline(isOnline: boolean): void {
        this.mockIsOnline = isOnline;
        if (isOnline) {
            this.handleOnline();
        } else {
            this.handleOffline();
        }
    }

    getIsOnline(): boolean {
        return this.mockIsOnline;
    }
} 