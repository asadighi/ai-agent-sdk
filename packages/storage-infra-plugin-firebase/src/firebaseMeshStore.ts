import { initializeApp, getApps, getApp, FirebaseApp, deleteApp, FirebaseOptions } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
    collection,
    doc,
    setDoc,
    addDoc,
    onSnapshot,
    serverTimestamp,
    Firestore,
    Transaction,
    runTransaction,
    query,
    where,
    orderBy,
    limit,
    writeBatch,
    updateDoc,
    getDocs,
    DocumentReference,
    CollectionReference,
    getFirestore,
    WriteBatch,
    DocumentData,
    QueryDocumentSnapshot,
    getDoc,
    disableNetwork,
    enableNetwork,
    initializeFirestore,
    FirestoreSettings,
    persistentLocalCache,
    persistentMultipleTabManager,
    Timestamp
} from 'firebase/firestore';
import { AgentRole, MemoryScope, Heartbeat, ElectionMessage, PresenceStatus, AgentStatus, AgentConfig, Agent } from '@ai-agent/common-sdk';
import { validateRole, validateAgentConfig, validateMemoryScope, ValidationError } from '@ai-agent/common-sdk';
import { IMeshStore } from '@ai-agent/common-sdk';
import { IFirebaseConfig } from './firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Logger, LogLevel } from '@ai-agent/multi-logger';

class RateLimiter {
    private operations: Map<string, number[]> = new Map();
    private readonly windowMs: number;
    private readonly maxOperations: number;
    private stats: Map<string, {
        totalOperations: number;
        rateLimitedOperations: number;
        lastRateLimitTime: number | null;
        averageWaitTime: number;
        totalWaitTime: number;
    }> = new Map();

    constructor(windowMs: number = 60000, maxOperations: number = 60) {
        this.windowMs = windowMs;
        this.maxOperations = maxOperations;
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

        console.warn(`[RATE LIMIT] Operation "${operationType}" was rate limited:
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
            console.info(`[RATE LIMIT STATS] Operation "${operationType}":
- Total operations: ${stats.totalOperations}
- Rate limited operations: ${stats.rateLimitedOperations}
- Rate limit percentage: ${((stats.rateLimitedOperations / stats.totalOperations) * 100).toFixed(2)}%
- Average wait time: ${Math.round(stats.averageWaitTime)}ms`);
        }
    }

    getStats(operationType?: string) {
        if (operationType) {
            return this.stats.get(operationType);
        }
        return Object.fromEntries(this.stats);
    }

    async checkLimit(operationType: string): Promise<boolean> {
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

export class FirebaseMeshStore implements IMeshStore {
    private static instance: FirebaseMeshStore | null = null;
    private app!: FirebaseApp;
    private db!: Firestore;
    private auth: Auth | null = null;
    private heartbeatSubscriptions: Map<string, () => void> = new Map();
    private electionSubscriptions: Map<string, () => void> = new Map();
    private heartbeats: Map<string, Map<string, Heartbeat>> = new Map();
    private elections: Map<string, Map<string, ElectionMessage>> = new Map();
    private agents: Map<string, Map<string, PresenceStatus>> = new Map();
    private rateLimiter: RateLimiter = new RateLimiter(60000, 60);
    private registeredAgents: Set<string> = new Set();
    private logger: Logger = new Logger({
        logLevel: LogLevel.INFO,
        logToConsole: true,
        maxLogs: 1000,
        rotationInterval: 60000
    });
    private isOffline: boolean = false;
    private lastCleanupTime: Map<string, number> = new Map();
    private currentAgentId: string = '';

    private constructor(config: IFirebaseConfig, agentId: string) {
        this.currentAgentId = agentId;
        this.initializeFirebase(config);
    }

    private initializeFirebase(config: IFirebaseConfig): void {
        // Initialize Firebase app
        if (getApps().length === 0) {
            this.app = initializeApp(config);
        } else {
            this.app = getApp();
        }
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
    }

    public static getInstance(config: IFirebaseConfig, agentId: string): FirebaseMeshStore {
        if (!FirebaseMeshStore.instance) {
            FirebaseMeshStore.instance = new FirebaseMeshStore(config, agentId);
        }
        return FirebaseMeshStore.instance;
    }

    // ... rest of the implementation ...
} 