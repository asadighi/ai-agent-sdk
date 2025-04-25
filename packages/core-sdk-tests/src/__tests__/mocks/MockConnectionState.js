import { ConnectionState } from '@ai-agent/core-sdk';
export class MockConnectionState extends ConnectionState {
    constructor(db) {
        super(db);
        this.mockIsOnline = true;
    }
    setupConnectionMonitoring() {
        // No-op for tests
    }
    async checkConnection() {
        // No-op for tests
    }
    cleanup() {
        // No-op for tests
    }
    // Test helper methods
    setMockOnline(isOnline) {
        this.mockIsOnline = isOnline;
        if (isOnline) {
            this.handleOnline();
        }
        else {
            this.handleOffline();
        }
    }
    getIsOnline() {
        return this.mockIsOnline;
    }
}
//# sourceMappingURL=MockConnectionState.js.map