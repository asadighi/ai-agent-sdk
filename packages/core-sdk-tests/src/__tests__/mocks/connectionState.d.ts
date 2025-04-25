export declare class MockConnectionState {
    private _isOnline;
    private _subscribers;
    constructor();
    get isOnline(): boolean;
    subscribeToConnectionState: import("@vitest/spy").Mock<any, any>;
    unsubscribeFromConnectionState: import("@vitest/spy").Mock<any, any>;
    setMockOnline(online: boolean): void;
}
//# sourceMappingURL=connectionState.d.ts.map