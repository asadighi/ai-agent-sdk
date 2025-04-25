import { config } from 'dotenv';
import { vi } from 'vitest';
import { MeshClient, ConnectionState } from '@ai-agent/core-sdk';

// Load environment variables
config();

// Mock only the browser-specific ConnectionState
vi.mock('@ai-agent/core-sdk', async () => {
    const actual = await vi.importActual('@ai-agent/core-sdk') as Record<string, unknown>;
    const mockConnectionState = {
        getInstance: () => ({
            subscribeToConnectionState: vi.fn(),
            unsubscribeFromConnectionState: vi.fn(),
            getIsOnline: () => true
        })
    };

    return {
        ...actual,
        ConnectionState: mockConnectionState
    };
});

// Create test configuration
const testConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test-auth-domain',
    projectId: 'test-project-id',
    storageBucket: 'test-storage-bucket',
    messagingSenderId: 'test-messaging-sender-id',
    appId: 'test-app-id'
};

// Export test client with real SDK implementation but mocked connectivity
export const meshClient = MeshClient.getInstance(testConfig);