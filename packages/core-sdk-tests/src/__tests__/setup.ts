import { container } from '@ai-agent/core-sdk';
import { MockConnectionState } from './mocks/connectionState';
import { vi } from 'vitest';
import dotenv from 'dotenv';
import { Firestore } from 'firebase/firestore';

// Load environment variables
dotenv.config();

// Create mock Firestore database
const mockDb = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn().mockReturnValue(() => {})
};

// Register mock connection state with container
container.register('ConnectionState', {
  useValue: new MockConnectionState(),
});

// Create test configuration
export const testConfig = {
  meshId: 'test-mesh',
  agentId: 'test-agent',
  firebaseConfig: {
    apiKey: process.env.FIREBASE_API_KEY || 'test-api-key',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'test-auth-domain',
    projectId: process.env.FIREBASE_PROJECT_ID || 'test-project-id',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'test-storage-bucket',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'test-sender-id',
    appId: process.env.FIREBASE_APP_ID || 'test-app-id',
  },
  db: mockDb as Firestore,
};

// Export the mock client
export const meshClient = {
  db: mockDb,
  connectionState: new MockConnectionState()
};