# AI Agent SDK Logging System

The AI Agent SDK implements a robust logging system with support for both browser and file-based storage, featuring efficient log rotation and cleanup mechanisms.

## Core Features

- Multiple storage backends (Browser/File)
- Size-based log sharding
- Automatic log rotation
- Time-based log filtering
- Automatic cleanup of old logs
- Configurable log levels

## Log Entry Structure

Each log entry contains:
```typescript
{
    timestamp: number;      // Unix timestamp in milliseconds
    level: LogLevel;        // Debug, Info, Warn, Error
    message: string;        // Log message
    data?: any;            // Optional additional data
}
```

## Storage Implementation

### Browser Storage

Uses `localStorage` with size-based sharding:

1. **Storage Keys**:
   - Current logs: `ai-agent-logs` (configurable)
   - Rotated chunks: `ai-agent-logs-rotated-{index}`
   - Chunk index: `ai-agent-logs-chunk-index`

2. **Chunk Management**:
   - Fixed chunk size: 1000 logs
   - Sequential chunk indexing
   - Automatic chunk creation during rotation

3. **Operations**:
   - `getLogs()`: Retrieves current logs
   - `addLog()`: Adds new log to current storage
   - `rotateLogs(maxLogs)`: Moves older logs to rotated storage
   - `getLogHistory(startTime?, endTime?)`: Retrieves all logs with optional time filtering
   - `cleanupOldLogs(maxAge)`: Removes logs older than specified age

### File Storage

Uses the filesystem with similar sharding strategy:

1. **File Structure**:
   - Log chunks: `logs-{index}.json`
   - Each chunk contains up to 1000 logs
   - Chunks stored in configured directory

2. **Operations**:
   Same as browser storage, but implemented using filesystem operations

## Log Rotation Process

1. **Trigger**:
   - When current logs exceed `maxLogs`
   - When manually triggered

2. **Process**:
   ```
   Current Logs [1000 entries] → Rotation → Current [200 latest] + Rotated [800 oldest]
   ```

3. **Sharding**:
   ```
   Rotated [800] → Chunk 1 [400] + Chunk 2 [400]
   ```

## Performance Considerations

1. **Memory Management**:
   - Fixed chunk size (1000 logs) prevents memory issues
   - Older logs stored in separate chunks
   - Chunks loaded only when needed

2. **Storage Efficiency**:
   - JSON storage format
   - Automatic cleanup of empty chunks
   - Time-based filtering without loading all logs

3. **Browser Limitations**:
   - localStorage size limits (typically 5-10MB)
   - Automatic chunk management prevents exceeding limits

## Usage Example

```typescript
import { Logger, LogLevel, BrowserStorage } from '@ai-agent/sdk';

// Initialize logger
const logger = new Logger({
    logLevel: LogLevel.Info,
    logToConsole: true,
    maxLogs: 1000,
    rotationInterval: 60000  // 1 minute
});

// Log messages
logger.info('Operation started', { operationId: 123 });
logger.error('Operation failed', { error: 'Network timeout' });

// View logs
const logs = await logger.getLogs();
const recentLogs = await logger.getLogHistory(
    Date.now() - 3600000,  // Last hour
    Date.now()
);

// Cleanup old logs
await logger.cleanupOldLogs(24 * 60 * 60 * 1000);  // Remove logs older than 24h
```

## Best Practices

1. **Log Levels**:
   - DEBUG: Detailed debugging information
   - INFO: General operational information
   - WARN: Warning messages for potential issues
   - ERROR: Error conditions requiring attention

2. **Log Rotation**:
   - Set appropriate `maxLogs` based on memory constraints
   - Consider storage limitations in browser environments
   - Regular cleanup of old logs

3. **Performance**:
   - Use appropriate log levels to control verbosity
   - Implement regular log rotation
   - Clean up old logs periodically

4. **Storage Selection**:
   - Browser Storage: For web applications
   - File Storage: For Node.js applications
   - Custom Storage: Implement `ILogStorage` interface for custom backends 