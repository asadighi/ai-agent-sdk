// ai-agent-sdk/index.ts
import { Mesh } from './mesh.js';
import { Leader } from './leader.js';
import { Worker } from './worker.js';
import { Candidate } from './candidate.js';
import { Agent } from './agent.js';
import { MeshClient } from './meshClient.js';
import { FirebaseMeshStore } from './firebaseMeshStore.js';
import { IMeshStore } from './meshStore.js';
import { AgentRole, AgentStatus, ElectionMessage, PresenceStatus, LogLevel } from './types.js';
import { IFirebaseConfig } from './firebaseConfig.js';
import { ILogStorage, BrowserStorage, FileStorage } from './storage.js';
import { Logger, type LogEntry, type LoggerConfig } from '@ai-agent/multi-logger';

// Export all types
export * from './types.js';
export * from './validation.js';
export * from './meshClient.js';
export * from './firebaseMeshStore.js';
export * from './firebaseConfig.js';
export * from './storage.js';

// Export concrete implementations
export { Mesh, Leader, Worker, Candidate, Agent, MeshClient };
export { Logger, LogLevel, type LogEntry, type LoggerConfig };
export { ConnectionState } from './connectionState.js';

// Create and export a singleton instance of MeshClient
// Note: The actual Firebase config should be provided by the consuming application
export const getMeshClient = (config: IFirebaseConfig) => new MeshClient(config);

// Main entry point
export * from './browser.js';
export { FileStorage } from './node-storage.js';