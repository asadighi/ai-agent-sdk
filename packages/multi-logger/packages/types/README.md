# @ai-agent/multi-logger

A multi-target logger package for both Node.js and web environments.

## Features

- Support for both Node.js and web environments
- Multiple storage backends (Browser/File)
- Size-based log sharding
- Automatic log rotation
- Time-based log filtering
- Automatic cleanup of old logs
- Configurable log levels

## Installation

```bash
npm install @ai-agent/multi-logger
```

## Usage

### Node.js Environment

```typescript
import { NodeLogger, FileStorage } from '@ai-agent/multi-logger';

// Create a logger with default file storage
const logger = new NodeLogger({
    logLevel: 'info',
    logToConsole: true,
    maxLogs: 1000,
    rotationInterval: 60000,
    logDir: './logs' // Optional, defaults to './logs'
});

// Or with custom storage
const customStorage = new FileStorage('./custom-logs');
const logger = new NodeLogger({
    storage: customStorage
});

// Use the logger
await logger.info('Hello, world!');
await logger.error('Something went wrong', { error: 'details' });
```

### Web Environment

```typescript
import { WebLogger, BrowserStorage } from '@ai-agent/multi-logger';

// Create a logger with default browser storage
const logger = new WebLogger({
    logLevel: 'info',
    logToConsole: true,
    maxLogs: 1000,
    rotationInterval: 60000,
    storageKey: 'my-app-logs' // Optional, defaults to 'ai-agent-logs'
});

// Or with custom storage
const customStorage = new BrowserStorage('custom-storage-key');
const logger = new WebLogger({
    storage: customStorage
});

// Use the logger
await logger.info('Hello, world!');
await logger.error('Something went wrong', { error: 'details' });
```

## API

### Logger Configuration

```typescript
interface LoggerConfig {
    logLevel?: LogLevel;           // Default: 'info'
    logToConsole?: boolean;        // Default: true
    maxLogs?: number;              // Default: 1000
    rotationInterval?: number;     // Default: 60000 (1 minute)
    storage?: ILogStorage;         // Default: platform-specific storage
}
```

### Log Levels

```typescript
enum LogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error'
}
```

### Storage Interface

```typescript
interface ILogStorage {
    getLogs(): Promise<LogEntry[]>;
    addLog(log: LogEntry): Promise<void>;
    clearLogs(): Promise<void>;
    rotateLogs(maxLogs: number): Promise<void>;
    getRotatedLogs(): Promise<LogEntry[]>;
    getLogHistory(startTime?: number, endTime?: number): Promise<LogEntry[]>;
    cleanupOldLogs(maxAge: number): Promise<void>;
}
```

### Log Entry Structure

```typescript
interface LogEntry {
    timestamp: number;      // Unix timestamp in milliseconds
    level: LogLevel;        // Debug, Info, Warn, Error
    message: string;        // Log message
    data?: any;            // Optional additional data
}
```

## License

MIT 