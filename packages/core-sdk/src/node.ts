// Re-export browser-compatible code
export * from './browser.js';

// Add Node.js specific exports
export { FileStorage } from './node-storage.js';
export { Logger } from './logger.js';

export * from './types.js';
export * from './storage.js';
export * from './node-storage.js';
export * from './firebaseMeshStore.js';
export * from './agent.js';
export * from './mesh.js'; 