import { IMeshStore } from '@ai-agent/common-sdk';
import { IFirebaseConfig } from './firebaseConfig';
export declare class FirebaseMeshStore implements IMeshStore {
    private static instance;
    private app;
    private db;
    private auth;
    private heartbeatSubscriptions;
    private electionSubscriptions;
    private heartbeats;
    private elections;
    private agents;
    private rateLimiter;
    private registeredAgents;
    private logger;
    private isOffline;
    private lastCleanupTime;
    private currentAgentId;
    private constructor();
    private initializeFirebase;
    static getInstance(config: IFirebaseConfig, agentId: string): FirebaseMeshStore;
}
//# sourceMappingURL=firebaseMeshStore.d.ts.map