import { vi } from 'vitest';

// Mock Firestore instance
export const mockFirestore = {
    collection: vi.fn().mockImplementation((path: string) => ({
        id: path.split('/').pop(),
        path,
        parent: null,
        type: 'collection'
    })),
    doc: vi.fn().mockImplementation((path: string) => ({
        id: path.split('/').pop(),
        path,
        parent: {
            id: path.split('/').slice(-2, -1)[0],
            path: path.split('/').slice(0, -1).join('/'),
            type: 'collection'
        },
        type: 'document'
    }))
};

// Mock functions
export const mockOnSnapshot = vi.fn();
export const mockEnableNetwork = vi.fn();
export const mockUnsubscribe = vi.fn();

// Mock exports
export const Firestore = vi.fn().mockImplementation(() => mockFirestore);
export const getFirestore = vi.fn().mockReturnValue(mockFirestore);
export const onSnapshot = mockOnSnapshot;
export const collection = mockFirestore.collection;
export const doc = mockFirestore.doc;
export const enableNetwork = mockEnableNetwork; 