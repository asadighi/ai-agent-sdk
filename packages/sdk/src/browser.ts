// ai-agent-sdk/browser.ts
export * from './agent.js';
export * from './fireStoreClient.js';
export * from './leader.js';
export * from './memory.js';
export * from './types.js';
export * from './validation.js';
export * from './webWorker.js';
import { FirestoreClient } from './fireStoreClient.js';

export const getFirestoreInstance = () => {
    return FirestoreClient.getInstance().getDb();
}; 