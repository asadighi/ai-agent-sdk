import { Logger } from './Logger';
import { LogLevel } from './types';
import type { LoggerConfig, LogEntry, ILogStorage } from './types';

export { Logger } from './Logger';
export { LogLevel } from './types';
export type { LoggerConfig, LogEntry, ILogStorage } from './types';
export { StorageProxy } from './StorageProxy';

// Re-export the appropriate storage implementation based on the environment
export * from './web'; 