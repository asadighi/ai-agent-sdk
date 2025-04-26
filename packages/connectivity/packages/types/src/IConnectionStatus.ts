export interface IConnectionStatus {
    /**
     * Subscribe to connection state changes
     * @param callback Function to be called when connection state changes
     */
    subscribeToConnectionState(callback: (isOnline: boolean) => void): void;

    /**
     * Unsubscribe from connection state changes
     * @param callback Function to unsubscribe
     */
    unsubscribeFromConnectionState(callback: (isOnline: boolean) => void): void;

    /**
     * Get the current connection state
     * @returns true if online, false if offline
     */
    getIsOnline(): boolean;
} 