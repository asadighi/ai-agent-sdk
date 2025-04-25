import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Logger, LogLevel } from '@ai-agent/multi-logger';
class RateLimiter {
    constructor(windowMs = 60000, maxOperations = 60) {
        this.operations = new Map();
        this.stats = new Map();
        this.windowMs = windowMs;
        this.maxOperations = maxOperations;
    }
    getOrCreateStats(operationType) {
        if (!this.stats.has(operationType)) {
            this.stats.set(operationType, {
                totalOperations: 0,
                rateLimitedOperations: 0,
                lastRateLimitTime: null,
                averageWaitTime: 0,
                totalWaitTime: 0
            });
        }
        return this.stats.get(operationType);
    }
    logRateLimitEvent(operationType, waitTime) {
        const stats = this.getOrCreateStats(operationType);
        stats.rateLimitedOperations++;
        stats.lastRateLimitTime = Date.now();
        stats.totalWaitTime += waitTime;
        stats.averageWaitTime = stats.totalWaitTime / stats.rateLimitedOperations;
        console.warn(`[RATE LIMIT] Operation "${operationType}" was rate limited:
- Wait time: ${waitTime}ms
- Total rate limited operations: ${stats.rateLimitedOperations}
- Average wait time: ${Math.round(stats.averageWaitTime)}ms
- Last rate limit: ${new Date(stats.lastRateLimitTime).toISOString()}`);
    }
    logOperationStats(operationType) {
        const stats = this.getOrCreateStats(operationType);
        stats.totalOperations++;
        // Log stats every 100 operations
        if (stats.totalOperations % 100 === 0) {
            console.info(`[RATE LIMIT STATS] Operation "${operationType}":
- Total operations: ${stats.totalOperations}
- Rate limited operations: ${stats.rateLimitedOperations}
- Rate limit percentage: ${((stats.rateLimitedOperations / stats.totalOperations) * 100).toFixed(2)}%
- Average wait time: ${Math.round(stats.averageWaitTime)}ms`);
        }
    }
    getStats(operationType) {
        if (operationType) {
            return this.stats.get(operationType);
        }
        return Object.fromEntries(this.stats);
    }
    async checkLimit(operationType) {
        const now = Date.now();
        const operations = this.operations.get(operationType) || [];
        // Remove operations outside the time window
        const recentOperations = operations.filter(time => now - time < this.windowMs);
        if (recentOperations.length >= this.maxOperations) {
            const oldestOperation = recentOperations[0];
            const waitTime = this.windowMs - (now - oldestOperation);
            if (waitTime > 0) {
                this.logRateLimitEvent(operationType, waitTime);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.checkLimit(operationType);
            }
        }
        recentOperations.push(now);
        this.operations.set(operationType, recentOperations);
        this.logOperationStats(operationType);
        return true;
    }
}
export class FirebaseMeshStore {
    constructor(config, agentId) {
        this.auth = null;
        this.heartbeatSubscriptions = new Map();
        this.electionSubscriptions = new Map();
        this.heartbeats = new Map();
        this.elections = new Map();
        this.agents = new Map();
        this.rateLimiter = new RateLimiter(60000, 60);
        this.registeredAgents = new Set();
        this.logger = new Logger({
            logLevel: LogLevel.INFO,
            logToConsole: true,
            maxLogs: 1000,
            rotationInterval: 60000
        });
        this.isOffline = false;
        this.lastCleanupTime = new Map();
        this.currentAgentId = '';
        this.currentAgentId = agentId;
        this.initializeFirebase(config);
    }
    initializeFirebase(config) {
        // Initialize Firebase app
        if (getApps().length === 0) {
            this.app = initializeApp(config);
        }
        else {
            this.app = getApp();
        }
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
    }
    static getInstance(config, agentId) {
        if (!FirebaseMeshStore.instance) {
            FirebaseMeshStore.instance = new FirebaseMeshStore(config, agentId);
        }
        return FirebaseMeshStore.instance;
    }
}
FirebaseMeshStore.instance = null;
//# sourceMappingURL=firebaseMeshStore.js.map