// ai-agent-sdk/index.ts
import { FirestoreClient } from './fireStoreClient.js';
import { FirebaseOptions } from 'firebase/app';

export { FirestoreClient } from './fireStoreClient.js';
export type { FirebaseOptions };

export const getFirestoreInstance = (config?: FirebaseOptions) => {
    return FirestoreClient.getInstance(config).getDb();
};

export * from './agent.js';
export * from './types.js';
export * from './validation.js';