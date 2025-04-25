"use strict";
/**
 * Core types for the multi-logger system.
 *
 * This package provides the core types and interfaces used by all logger implementations.
 *
 * Usage:
 * ```typescript
 * import { LogLevel, LogEntry, LoggerConfig, ILogger } from '@ai-agent/multi-logger/types';
 *
 * // Use the appropriate logger implementation:
 * // - For web environments: `WebLogger` from `@ai-agent/multi-logger/web`
 * // - For Node.js environments: `NodeLogger` from `@ai-agent/multi-logger/node`
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
//# sourceMappingURL=types.js.map