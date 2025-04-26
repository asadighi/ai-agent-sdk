import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FirebaseConnectionStatus } from '../FirebaseConnectionStatus';
import { IDatabaseOperations, IDocumentSnapshot, IDatabaseError } from '@ai-agent/connectivity/types';
import { ILogger } from '@ai-agent/multi-logger/types';

describe('FirebaseConnectionStatus', () => {
    let connectionStatus: FirebaseConnectionStatus;
    let mockOperations: IDatabaseOperations & {
        setupConnectionListener: ReturnType<typeof vi.fn>;
        getConnectionStatusRef: ReturnType<typeof vi.fn>;
    };
    let mockLogger: ILogger & {
        info: ReturnType<typeof vi.fn>;
        warn: ReturnType<typeof vi.fn>;
        error: ReturnType<typeof vi.fn>;
        debug: ReturnType<typeof vi.fn>;
        log: ReturnType<typeof vi.fn>;
        getLogs: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
    };
    let mockUnsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Setup mocks
        mockUnsubscribe = vi.fn();
        mockOperations = {
            setupConnectionListener: vi.fn().mockImplementation((
                onNext: (snapshot: IDocumentSnapshot) => void,
                onError: (error: IDatabaseError) => void
            ) => {
                return mockUnsubscribe;
            }),
            getConnectionStatusRef: vi.fn()
        };
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            log: vi.fn(),
            getLogs: vi.fn(),
            clear: vi.fn()
        };

        connectionStatus = new FirebaseConnectionStatus(mockOperations, mockLogger);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with provided dependencies', () => {
            expect(connectionStatus).toBeDefined();
            expect(mockOperations.setupConnectionListener).toHaveBeenCalled();
        });
    });

    describe('connection state', () => {
        it('should start in offline state', () => {
            expect(connectionStatus.getIsOnline()).toBe(false);
        });

        it('should update state when connection is restored', () => {
            const onNext = mockOperations.setupConnectionListener.mock.calls[0][0];
            
            onNext();
            expect(connectionStatus.getIsOnline()).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith('Connection restored');
        });

        it('should update state when connection is lost', () => {
            const onError = mockOperations.setupConnectionListener.mock.calls[0][1];
            
            onError();
            expect(connectionStatus.getIsOnline()).toBe(false);
            expect(mockLogger.info).toHaveBeenCalledWith('Connection lost');
        });
    });

    describe('subscribers', () => {
        it('should notify subscribers of current state on subscription', () => {
            const callback = vi.fn();
            connectionStatus.subscribeToConnectionState(callback);
            expect(callback).toHaveBeenCalledWith(false);
        });

        it('should notify all subscribers when connection state changes', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            
            connectionStatus.subscribeToConnectionState(callback1);
            connectionStatus.subscribeToConnectionState(callback2);
            
            const onNext = mockOperations.setupConnectionListener.mock.calls[0][0];
            onNext();
            
            expect(callback1).toHaveBeenCalledWith(true);
            expect(callback2).toHaveBeenCalledWith(true);
        });

        it('should handle subscriber errors gracefully', () => {
            const errorCallback = vi.fn().mockImplementation(() => {
                throw new Error('Test error');
            });
            
            connectionStatus.subscribeToConnectionState(errorCallback);
            const onNext = mockOperations.setupConnectionListener.mock.calls[0][0];
            
            expect(() => onNext()).not.toThrow();
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should allow unsubscribing from connection state', () => {
            const callback = vi.fn();
            connectionStatus.subscribeToConnectionState(callback);
            connectionStatus.unsubscribeFromConnectionState(callback);
            
            const onNext = mockOperations.setupConnectionListener.mock.calls[0][0];
            onNext();
            
            expect(callback).toHaveBeenCalledTimes(1); // Only the initial call
        });
    });

    describe('cleanup', () => {
        it('should cleanup resources when cleanup is called', () => {
            connectionStatus.cleanup();
            expect(mockUnsubscribe).toHaveBeenCalled();
        });
    });
}); 