import { vi } from 'vitest';
export class MockConnectionState {
    constructor() {
        this._isOnline = true;
        this._subscribers = [];
        this.subscribeToConnectionState = vi.fn().mockImplementation((callback) => {
            this._subscribers.push(callback);
            callback(this._isOnline);
        });
        this.unsubscribeFromConnectionState = vi.fn().mockImplementation((callback) => {
            this._subscribers = this._subscribers.filter(sub => sub !== callback);
        });
        // Initialize with default online state
    }
    get isOnline() {
        return this._isOnline;
    }
    // Test helper methods
    setMockOnline(online) {
        this._isOnline = online;
        this._subscribers.forEach(callback => callback(online));
    }
}
module.exports = { MockConnectionState };
//# sourceMappingURL=connectionState.js.map