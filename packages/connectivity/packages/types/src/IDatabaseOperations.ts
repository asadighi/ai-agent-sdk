/**
 * Represents a document reference in the database
 */
export interface IDocumentReference {
    id: string;
    path: string;
}

/**
 * Represents a document snapshot from the database
 */
export interface IDocumentSnapshot {
    id: string;
    exists: boolean;
    data: () => Record<string, unknown> | undefined;
}

/**
 * Represents a database error
 */
export interface IDatabaseError {
    code: string;
    message: string;
    stack?: string;
}

export interface IDatabaseOperations {
    /**
     * Sets up a listener for connection state changes
     * @param onNext Callback for successful connection
     * @param onError Callback for connection errors
     * @returns Unsubscribe function
     */
    setupConnectionListener(
        onNext: (snapshot: IDocumentSnapshot) => void,
        onError: (error: IDatabaseError) => void
    ): () => void;

    /**
     * Gets a reference to the connection status document
     */
    getConnectionStatusRef(): IDocumentReference;
} 