// ai-agent-sdk/browser.ts
import { Mesh } from './mesh.js';
import { Agent } from './agent.js';
import { AgentRole, AgentStatus, LogLevel, Heartbeat } from './types.js';
import { MeshClient } from './meshClient.js';
import { FirebaseMeshStore } from './firebaseMeshStore.js';
import type { IFirebaseConfig } from './firebaseConfig.js';
import { BrowserStorage } from './storage.js';
import { Logger } from './logger.js';

// Export all types and classes
export { 
    Mesh, 
    Agent, 
    MeshClient, 
    FirebaseMeshStore, 
    BrowserStorage,
    Logger
};

// Export types separately
export type { AgentRole, AgentStatus, LogLevel, Heartbeat, IFirebaseConfig };

// Export utility functions and other modules
export * from './leader.js';
export * from './memory.js';
export * from './types.js';
export * from './validation.js';
export * from './webWorker.js';

export const getMeshClient = (config: IFirebaseConfig) => {
    return new MeshClient(config);
}; 