import { IRateLimiter, RateLimiterStats, RateLimiterOptions } from '@ai-agent/connectivity/types';
import { ILogger } from '@ai-agent/multi-logger/types';

export class RateLimiter implements IRateLimiter {
    private operations: Map<string, number[]> = new Map();
    private readonly windowMs: number;
    private readonly maxOperations: number;
    private readonly retryAfter: number;
    private stats: Map<string, RateLimiterStats> = new Map();
    private options: RateLimiterOptions;
    private logger: ILogger;

    constructor(options: RateLimiterOptions, logger: ILogger) {
        if (!logger) {
            throw new Error('Logger is required');
        }
        this.options = options;
        this.windowMs = options.timeWindow;
        this.maxOperations = options.maxOperations;
        this.retryAfter = options.retryAfter;
        this.logger = logger;
    }

    private getOrCreateStats(operationType: string) {
        if (!this.stats.has(operationType)) {
            this.stats.set(operationType, {
                totalOperations: 0,
                rateLimitedOperations: 0,
                lastRateLimitTime: null,
                averageWaitTime: 0,
                totalWaitTime: 0
            });
        }
        return this.stats.get(operationType)!;
    }

    private logRateLimitEvent(operationType: string, waitTime: number) {
        const stats = this.getOrCreateStats(operationType);
        stats.rateLimitedOperations++;
        stats.lastRateLimitTime = Date.now();
        stats.totalWaitTime += waitTime;
        stats.averageWaitTime = stats.totalWaitTime / stats.rateLimitedOperations;

        this.logger.warn(`[RATE LIMIT] Operation "${operationType}" was rate limited:
- Wait time: ${waitTime}ms
- Total rate limited operations: ${stats.rateLimitedOperations}
- Average wait time: ${Math.round(stats.averageWaitTime)}ms
- Last rate limit: ${new Date(stats.lastRateLimitTime).toISOString()}`);
    }

    private logOperationStats(operationType: string) {
        const stats = this.getOrCreateStats(operationType);
        stats.totalOperations++;

        // Log stats every 100 operations
        if (stats.totalOperations % 100 === 0) {
            this.logger.info(`[RATE LIMIT STATS] Operation "${operationType}":
- Total operations: ${stats.totalOperations}
- Rate limited operations: ${stats.rateLimitedOperations}
- Rate limit percentage: ${((stats.rateLimitedOperations / stats.totalOperations) * 100).toFixed(2)}%
- Average wait time: ${Math.round(stats.averageWaitTime)}ms`);
        }
    }

    getStats(operationType?: string): RateLimiterStats | Map<string, RateLimiterStats> {
        if (operationType) {
            const stats = this.stats.get(operationType);
            if (!stats) {
                throw new Error(`No stats found for operation type: ${operationType}`);
            }
            return stats;
        }
        return new Map(this.stats);
    }

    async checkLimit(operationType: string): Promise<boolean> {
        const now = Date.now();
        let operations = this.operations.get(operationType) || [];
        
        // Remove operations outside the time window
        operations = operations.filter(time => now - time < this.windowMs);
        
        if (operations.length >= this.maxOperations) {
            const oldestOperation = operations[0];
            const waitTime = Math.min(this.retryAfter, this.windowMs - (now - oldestOperation));
            
            if (waitTime > 0) {
                this.logRateLimitEvent(operationType, waitTime);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                // After waiting, clean up old operations again
                operations = operations.filter(time => Date.now() - time < this.windowMs);
            }
        }
        
        // Add the new operation
        operations.push(Date.now());
        this.operations.set(operationType, operations);
        this.logOperationStats(operationType);
        return true;
    }
}