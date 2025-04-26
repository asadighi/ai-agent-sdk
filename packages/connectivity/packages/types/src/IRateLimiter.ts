
export interface RateLimiterStats {
    totalOperations: number;
    rateLimitedOperations: number;
    lastRateLimitTime: number | null;
    averageWaitTime: number;
    totalWaitTime: number;
}

export interface RateLimiterOptions {
    maxOperations: number;
    timeWindow: number;
    retryAfter: number;
} 

export interface IRateLimiter {
    getStats(operationType?: string): RateLimiterStats | Map<string, RateLimiterStats>;
    checkLimit(operationType: string): Promise<boolean>;
}