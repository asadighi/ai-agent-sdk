import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../RateLimiter';
import { ILogger } from '@ai-agent/multi-logger/types';
import { RateLimiterOptions, RateLimiterStats } from '@ai-agent/connectivity/types';

describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;
    let mockLogger: ReturnType<typeof vi.fn>;
    const options: RateLimiterOptions = {
        timeWindow: 1000, // 1 second for faster tests
        maxOperations: 2, // Lower limit for easier testing
        retryAfter: 100 // 100ms retry
    };

    beforeEach(() => {
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            log: vi.fn(),
            getLogs: vi.fn(),
            clear: vi.fn()
        };
        rateLimiter = new RateLimiter(options, mockLogger);
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with provided logger and options', () => {
            expect(rateLimiter).toBeDefined();
        });
    });

    describe('rate limiting', () => {
        it('should allow operations within rate limit', async () => {
            const key = 'test-key';
            const result1 = await rateLimiter.checkLimit(key);
            const result2 = await rateLimiter.checkLimit(key);

            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('should block operations exceeding rate limit', async () => {
            const key = 'test-key';
            // Make operations up to the limit
            await rateLimiter.checkLimit(key);
            await rateLimiter.checkLimit(key);

            // This should trigger rate limiting
            const resultPromise = rateLimiter.checkLimit(key);
            await vi.advanceTimersByTimeAsync(options.retryAfter);
            const result = await resultPromise;

            expect(result).toBe(true);
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should reset rate limit after time window', async () => {
            const key = 'test-key';
            // Make operations up to the limit
            await rateLimiter.checkLimit(key);
            await rateLimiter.checkLimit(key);

            // Fast-forward time past the window
            await vi.advanceTimersByTimeAsync(options.timeWindow + 1);

            const result = await rateLimiter.checkLimit(key);
            expect(result).toBe(true);
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('should handle multiple keys independently', async () => {
            const key1 = 'key1';
            const key2 = 'key2';

            // Make operations up to the limit for key1
            await rateLimiter.checkLimit(key1);
            await rateLimiter.checkLimit(key1);

            // Key2 should still be allowed
            const result = await rateLimiter.checkLimit(key2);
            expect(result).toBe(true);
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('should return stats for specific operation type', async () => {
            await rateLimiter.checkLimit('test');
            const stats = rateLimiter.getStats('test') as RateLimiterStats;
            
            expect(stats.totalOperations).toBe(1);
            expect(stats.rateLimitedOperations).toBe(0);
        });

        it('should return all stats when no operation type is specified', async () => {
            await rateLimiter.checkLimit('test1');
            await rateLimiter.checkLimit('test2');
            
            const allStats = rateLimiter.getStats() as Map<string, RateLimiterStats>;
            expect(allStats instanceof Map).toBe(true);
            expect(allStats.size).toBe(2);
        });
    });

    describe('logging', () => {
        it('should log rate limit events', async () => {
            // Fill up the rate limit
            await rateLimiter.checkLimit('test');
            await rateLimiter.checkLimit('test');
            
            // This should trigger rate limiting
            const resultPromise = rateLimiter.checkLimit('test');
            await vi.advanceTimersByTimeAsync(options.retryAfter);
            await resultPromise;
            
            expect(mockLogger.warn).toHaveBeenCalled();
            const warnCall = mockLogger.warn.mock.calls[0][0];
            expect(warnCall).toContain('[RATE LIMIT]');
            expect(warnCall).toContain('test');
        });

        it('should log stats every 100 operations', async () => {
            // Perform 100 operations with time advancement between each
            for (let i = 0; i < 100; i++) {
                await rateLimiter.checkLimit('test');
                // Advance time past the window to avoid rate limiting
                await vi.advanceTimersByTimeAsync(options.timeWindow + 1);
            }
            
            expect(mockLogger.info).toHaveBeenCalled();
            const infoCall = mockLogger.info.mock.calls[0][0];
            expect(infoCall).toContain('[RATE LIMIT STATS]');
            expect(infoCall).toContain('100');
        });
    });
}); 