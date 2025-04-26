import { collection, doc, setDoc, addDoc, onSnapshot, serverTimestamp, Firestore as FirebaseWebFirestore, Transaction, runTransaction, query, where, orderBy, limit, writeBatch, updateDoc, getDocs, DocumentReference, CollectionReference, getFirestore, WriteBatch, DocumentData, QueryDocumentSnapshot, getDoc, disableNetwork, enableNetwork, initializeFirestore, FirestoreSettings, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { initializeApp, getApps, getApp, FirebaseApp, deleteApp, FirebaseOptions } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { AgentRole, MemoryScope, Heartbeat, ElectionMessage, PresenceStatus, AgentStatus, AgentConfig, Agent } from './types.js';
import { validateRole, validateAgentConfig, validateMemoryScope, ValidationError } from './validation.js';
import { IMeshStore } from './meshStore.js';
import { IFirebaseConfig } from './firebaseConfig.js';
import { Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import type { ILogger } from '@ai-agent/multi-logger/types';

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

// Wrapper class to abstract Firestore operations
class FirestoreWrapper {
    private db: FirebaseWebFirestore;

    constructor(db: FirebaseWebFirestore) {
        this.db = db;
    }

    collection(path: string): CollectionReference<DocumentData> {
        return collection(this.db, path);
    }

    doc(path: string): DocumentReference<DocumentData> {
        return doc(this.db, path);
    }

    batch(): WriteBatch {
        return writeBatch(this.db);
    }

    runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
        return runTransaction(this.db, updateFunction);
    }

    serverTimestamp(): any {
        return serverTimestamp();
    }

    getDb(): FirebaseWebFirestore {
        return this.db;
    }
}

export class FirebaseMeshStore implements IMeshStore {
    private static instance: FirebaseMeshStore | null = null;
    private app!: FirebaseApp;
    private db!: FirebaseWebFirestore;
    private auth: Auth | null = null;
    private heartbeatSubscriptions: Map<string, () => void> = new Map();
    private electionSubscriptions: Map<string, () => void> = new Map();
    private heartbeats: Map<string, Map<string, Heartbeat>> = new Map();
    private elections: Map<string, Map<string, ElectionMessage>> = new Map();
    private agents: Map<string, Map<string, PresenceStatus>> = new Map();
    private rateLimiter: RateLimiter = new RateLimiter(60000, 60);
    private registeredAgents: Set<string> = new Set();
    private logger: ILogger;
    private isOffline: boolean = false;
    private lastCleanupTime: Map<string, number> = new Map(); // Track last cleanup time per mesh
    private currentAgentId: string = '';

    private constructor(config: IFirebaseConfig, agentId: string, logger: ILogger) {
        if (FirebaseMeshStore.instance) {
            return FirebaseMeshStore.instance;
        }

        this.app = initializeApp(config);
        this.logger = logger;
        
        // Configure Firestore with offline persistence
        const settings: FirestoreSettings = {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        };
        
        this.db = initializeFirestore(this.app, settings);
        this.currentAgentId = agentId;

        FirebaseMeshStore.instance = this;
    }

    public static getInstance(config: IFirebaseConfig, agentId: string, logger: ILogger): FirebaseMeshStore {
        if (!FirebaseMeshStore.instance) {
            FirebaseMeshStore.instance = new FirebaseMeshStore(config, agentId, logger);
        }
        return FirebaseMeshStore.instance;
    }

    private ensureFirestore(): FirebaseWebFirestore {
        if (!this.db) {
            throw new Error('Firestore is not initialized');
        }
        return this.db;
    }

    private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            if (error.code === 'unavailable' || error.message?.includes('unavailable')) {
                this.handleOffline();
                throw error;
            }
            throw error;
        }
    }

    private async checkAgentExists(meshId: string, agentId: string): Promise<boolean> {
        const agentRef = doc(this.db, 'meshes', meshId, 'agents', agentId);
        const docSnap = await getDoc(agentRef);
        return docSnap.exists();
    }

    async registerAgent(agent: { meshId: string; agentId: string; role: AgentRole; status: AgentStatus }): Promise<{ meshId: string; agentId: string }> {
        const agentKey = `${agent.meshId}-${agent.agentId}`;
        
        if (this.registeredAgents.has(agentKey)) {
            this.logger.warn(`Agent ${agent.agentId} already registered in mesh ${agent.meshId}`);
            return { meshId: agent.meshId, agentId: agent.agentId };
        }

        const exists = await this.checkAgentExists(agent.meshId, agent.agentId);
        if (exists) {
            this.logger.warn(`Agent ${agent.agentId} already exists in mesh ${agent.meshId}`);
            return { meshId: agent.meshId, agentId: agent.agentId };
        }

        return this.withRetry(async () => {
            const agentRef = doc(this.db, 'meshes', agent.meshId, 'agents', agent.agentId);
            await setDoc(agentRef, {
                ...agent,
                lastSeen: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            
            this.registeredAgents.add(agentKey);
            this.logger.info(`Successfully registered agent ${agent.agentId} in mesh ${agent.meshId}`);
            
            return { meshId: agent.meshId, agentId: agent.agentId };
        }, 'registerAgent');
    }

    async updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void> {
        return this.withRetry(async () => {
            try {
                // Get the current agent's role
                const currentAgentRef = doc(this.db, 'meshes', meshId, 'agents', agentId);
                const currentAgentDoc = await getDoc(currentAgentRef);
                const currentAgentData = currentAgentDoc.data();

                // Get the requesting agent's role
                const requestingAgentRef = doc(this.db, 'meshes', meshId, 'agents', this.currentAgentId);
                const requestingAgentDoc = await getDoc(requestingAgentRef);
                const requestingAgentData = requestingAgentDoc.data();

                // Validation rules:
                // 1. Only managers can modify other nodes' status
                // 2. Workers can only modify their own status
                if (requestingAgentData?.role !== AgentRole.Manager && 
                    this.currentAgentId !== agentId) {
                    this.logger.warn(`[MESH] Agent ${this.currentAgentId} (${requestingAgentData?.role}) attempted to modify status of agent ${agentId} without permission`);
                    throw new Error('Permission denied: Only managers can modify other nodes');
                }

                await updateDoc(currentAgentRef, {
                    status,
                    lastUpdated: serverTimestamp()
                });
            } catch (error) {
                this.logger.error('[MESH] Error updating agent status:', error);
                throw error;
            }
        }, 'updateAgentStatus');
    }

    async updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void> {
        return this.withRetry(async () => {
            try {
                const agentRef = doc(this.db, 'meshes', meshId, 'agents', heartbeat.agentId);
                
                // Check if agent exists before updating heartbeat
                const exists = await this.checkAgentExists(meshId, heartbeat.agentId);
                if (!exists) {
                    this.logger.warn(`[MESH] Agent ${heartbeat.agentId} not found in mesh ${meshId}, registering...`);
                    // Register the agent if it doesn't exist
                    await this.registerAgent({
                        meshId,
                        agentId: heartbeat.agentId,
                        role: heartbeat.role,
                        status: heartbeat.status
                    });
                }

                // Get current agent data to check fencing token
                const currentDoc = await getDoc(agentRef);
                const currentData = currentDoc.data();
                const currentFencingToken = currentData?.fencingToken || '';
                const currentHeartbeat = currentData?.heartbeat || {};

                // Only update if the fencing token is newer or if this is a new agent
                if (!currentFencingToken || heartbeat.fencingToken > currentFencingToken) {
                    const now = Date.now();
                    await updateDoc(agentRef, {
                        heartbeat: {
                            timestamp: now,
                            role: heartbeat.role,
                            status: heartbeat.status,
                            term: heartbeat.term,
                            fencingToken: heartbeat.fencingToken
                        },
                        lastSeen: now,
                        role: heartbeat.role,
                        status: heartbeat.status
                    });
                } else {
                    this.logger.warn(`[MESH] Agent ${heartbeat.agentId} has stale fencing token (current: ${currentFencingToken}, new: ${heartbeat.fencingToken}), ignoring heartbeat`);
                }
            } catch (error) {
                this.logger.error('[MESH] Error updating heartbeat:', error);
                // Don't throw the error, just log it
                return;
            }
        }, 'updateHeartbeat');
    }

    public async getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>> {
        return this.withRetry(async () => {
            const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
            const snapshot = await getDocs(agentsRef);
            const statuses = new Map<string, PresenceStatus>();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const lastSeen = data.lastSeen || Date.now();
                
                statuses.set(doc.id, {
                    agentId: doc.id,
                    role: data.role,
                    status: data.status,
                    lastSeen,
                    fencingToken: data.fencingToken || ''
                });
            });
            
            return statuses;
        }, 'getAgentStatuses');
    }

    public async cleanupStaleAgents(meshId: string, agentIds?: Set<string>): Promise<void> {
        return this.withRetry(async () => {
            try {
                // Check if we've cleaned up this mesh recently (within 1 minute)
                const now = Date.now();
                const lastCleanup = this.lastCleanupTime.get(meshId) || 0;
                if (now - lastCleanup < 60 * 1000) {
                    return; // Skip cleanup if we've done it recently
                }

                const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
                const batch = writeBatch(this.db);
                const fiveMinutesAgo = now - 5 * 60 * 1000;
                
                if (agentIds) {
                    // Clean up specific agents
                    for (const agentId of agentIds) {
                        const agentRef = doc(agentsRef, agentId);
                        batch.update(agentRef, {
                            status: AgentStatus.Offline,
                            updatedAt: now,
                            lastSeen: now
                        });
                    }
                } else {
                    // Clean up all stale agents
                    const q = query(
                        agentsRef,
                        where('lastSeen', '<', fiveMinutesAgo),
                        where('status', '==', AgentStatus.Active)
                    );
                    
                    const snapshot = await getDocs(q);
                    const agentsToCleanup = new Set<string>();
                    
                    snapshot.forEach(doc => {
                        const agentRef = doc.ref;
                        const data = doc.data();
                        const lastSeen = data.lastSeen || 0;
                        
                        // Only cleanup if the agent hasn't been seen in 5 minutes
                        if (now - lastSeen > 5 * 60 * 1000) {
                            agentsToCleanup.add(doc.id);
                            batch.update(agentRef, {
                                status: AgentStatus.Offline,
                                updatedAt: now,
                                lastSeen: now
                            });
                        }
                    });
                    
                    if (agentsToCleanup.size > 0) {
                        this.logger.info(`Marked ${agentsToCleanup.size} stale agents as offline in mesh ${meshId}`);
                    }
                }
                
                await batch.commit();
                this.lastCleanupTime.set(meshId, now);
            } catch (error) {
                this.logger.error('Error cleaning up stale agents:', error);
            }
        }, 'cleanupStaleAgents');
    }

    public subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void {
        const unsubscribe = onSnapshot(collection(this.db, `meshes/${meshId}/agents`), (snapshot) => {
            const heartbeats = new Map<string, Heartbeat>();
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.heartbeat) {
                    const timestamp = data.heartbeat.timestamp;
                    const timestampMillis = timestamp?.toMillis 
                        ? timestamp.toMillis() 
                        : timestamp?.seconds 
                            ? timestamp.seconds * 1000 
                            : Date.now();

                    heartbeats.set(doc.id, {
                        agentId: doc.id,
                        timestamp: timestampMillis,
                        role: data.heartbeat.role,
                        status: data.heartbeat.status,
                        term: data.heartbeat.term || 0,
                        fencingToken: data.heartbeat.fencingToken || ''
                    });
                }
            });

            callback(heartbeats);
        });

        this.heartbeatSubscriptions.set(meshId, unsubscribe);

        return () => {
            unsubscribe();
            this.heartbeatSubscriptions.delete(meshId);
        };
    }

    public subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void {
        const messagesRef = collection(this.db, 'meshes', meshId, 'election_messages');
        const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
            const messages = new Map<string, ElectionMessage>();
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                let message: ElectionMessage;
                
                switch (data.type) {
                    case 'request_vote':
                        message = {
                            type: 'request_vote',
                            term: data.term || 0,
                            candidateId: data.candidateId,
                            lastLogIndex: data.lastLogIndex || 0,
                            lastLogTerm: data.lastLogTerm || 0,
                            timestamp: data.timestamp?.toDate() || new Date()
                        };
                        break;
                    case 'vote':
                        message = {
                            type: 'vote',
                            term: data.term || 0,
                            candidateId: data.candidateId,
                            voterId: data.voterId,
                            granted: data.granted,
                            timestamp: data.timestamp?.toDate() || new Date()
                        };
                        break;
                    case 'initial_leader':
                        message = {
                            type: 'initial_leader',
                            term: data.term || 0,
                            leaderId: data.leaderId,
                            timestamp: data.timestamp?.toDate() || new Date()
                        };
                        break;
                    default:
                        return;
                }
                messages.set(doc.id, message);
            });

            callback(messages);
        });

        this.electionSubscriptions.set(meshId, unsubscribe);

        return () => {
            unsubscribe();
            this.electionSubscriptions.delete(meshId);
        };
    }

    public async updateAgentRole(meshId: string, agentId: string, role: AgentRole): Promise<void> {
        return this.withRetry(async () => {
            const agentRef = doc(this.db, 'meshes', meshId, 'agents', agentId);
            await updateDoc(agentRef, { role });
        }, 'updateAgentRole');
    }

    public async emitEvent(event: { meshId: string; agentId: string; type: string; data: any; scope: MemoryScope }): Promise<string> {
        return this.withRetry(async () => {
            const eventsRef = collection(this.db, 'meshes', event.meshId, 'events');
            const docRef = await addDoc(eventsRef, {
                ...event,
                timestamp: serverTimestamp()
            });
            return docRef.id;
        }, 'emitEvent');
    }

    public async sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void> {
        return this.withRetry(async () => {
            const electionsRef = collection(this.db, 'meshes', meshId, 'elections');
            let docId: string;
            if (message.type === 'request_vote') {
                docId = message.candidateId;
            } else if (message.type === 'initial_leader') {
                docId = message.leaderId;
            } else {
                docId = 'unknown';
            }
            const electionRef = doc(electionsRef, docId);
            await setDoc(electionRef, {
                ...message,
                timestamp: serverTimestamp()
            });
        }, 'sendElectionMessage');
    }

    public async getElectionMessage(meshId: string): Promise<ElectionMessage | null> {
        return this.withRetry(async () => {
            const electionsRef = collection(this.db, 'meshes', meshId, 'elections');
            const querySnapshot = await getDocs(electionsRef);
            if (querySnapshot.empty) {
                return null;
            }
            // Get the most recent message
            const latestDoc = querySnapshot.docs.reduce((latest, current) => {
                const latestTime = latest.data().timestamp?.toDate() || new Date(0);
                const currentTime = current.data().timestamp?.toDate() || new Date(0);
                return currentTime > latestTime ? current : latest;
            });
            return latestDoc.data() as ElectionMessage;
        }, 'getElectionMessage');
    }

    public async updatePresenceStatus(meshId: string, statuses: PresenceStatus[]): Promise<void> {
        return this.withRetry(async () => {
            const batch = writeBatch(this.db);
            for (const status of statuses) {
                const agentRef = doc(this.db, 'meshes', meshId, 'agents', status.agentId);
                batch.update(agentRef, {
                    status: status.status,
                    lastSeen: serverTimestamp()
                });
            }
            await batch.commit();
        }, 'updatePresenceStatus');
    }

    public async getLeader(meshId: string): Promise<Agent | null> {
        return this.withRetry(async () => {
            const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
            const q = query(agentsRef, where('role', '==', AgentRole.Manager), where('status', '==', AgentStatus.Active));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                return null;
            }
            const doc = snapshot.docs[0];
            const data = doc.data();
            return {
                meshId,
                agentId: doc.id,
                role: data.role,
                status: data.status,
                lastHeartbeat: data.heartbeat?.timestamp?.toMillis() || Date.now()
            };
        }, 'getLeader');
    }

    public async getAgentCount(meshId: string): Promise<number> {
        return this.withRetry(async () => {
            const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
            const snapshot = await getDocs(agentsRef);
            return snapshot.size;
        }, 'getAgentCount');
    }

    public async updateAgent(meshId: string, agentId: string, update: { role: AgentRole; status: AgentStatus }): Promise<void> {
        return this.withRetry(async () => {
            try {
                // Get the current agent's role
                const currentAgentRef = doc(this.db, 'meshes', meshId, 'agents', agentId);
                const currentAgentDoc = await getDoc(currentAgentRef);
                const currentAgentData = currentAgentDoc.data();

                // Get the requesting agent's role
                const requestingAgentRef = doc(this.db, 'meshes', meshId, 'agents', this.currentAgentId);
                const requestingAgentDoc = await getDoc(requestingAgentRef);
                const requestingAgentData = requestingAgentDoc.data();

                // Validation rules:
                // 1. Only managers can modify other nodes' information
                // 2. Workers can only modify their own information
                if (requestingAgentData?.role !== AgentRole.Manager && 
                    this.currentAgentId !== agentId) {
                    this.logger.warn(`[MESH] Agent ${this.currentAgentId} (${requestingAgentData?.role}) attempted to modify agent ${agentId} without permission`);
                    throw new Error('Permission denied: Only managers can modify other nodes');
                }

                await updateDoc(currentAgentRef, {
                    role: update.role,
                    status: update.status,
                    lastUpdated: serverTimestamp()
                });
            } catch (error) {
                this.logger.error('[MESH] Error updating agent:', error);
                throw error;
            }
        }, 'updateAgent');
    }

    public async getAgents(meshId: string): Promise<Map<string, Agent>> {
        return this.withRetry(async () => {
            const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
            const snapshot = await getDocs(agentsRef);
            const agents = new Map<string, Agent>();
            snapshot.forEach(doc => {
                const data = doc.data();
                agents.set(doc.id, {
                    meshId,
                    agentId: doc.id,
                    role: data.role,
                    status: data.status,
                    lastHeartbeat: data.heartbeat?.timestamp?.toMillis() || Date.now()
                });
            });
            return agents;
        }, 'getAgents');
    }

    private handleOffline() {
        this.isOffline = true;
        this.logger.warn('Firestore is offline');
    }

    private handleOnline() {
        this.isOffline = false;
        this.logger.info('Firestore is back online');
    }

    async cleanup(): Promise<void> {
        try {
            // First, cleanup subscriptions
            for (const unsubscribe of this.heartbeatSubscriptions.values()) {
                unsubscribe();
            }
            for (const unsubscribe of this.electionSubscriptions.values()) {
                unsubscribe();
            }
            
            // Clear all maps and sets
            this.heartbeatSubscriptions.clear();
            this.electionSubscriptions.clear();
            this.heartbeats.clear();
            this.elections.clear();
            this.agents.clear();
            this.registeredAgents.clear();
            
            // Wait a short time to ensure all pending operations are complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Only cleanup Firebase app if we're the last instance
            if (this.app && getApps().length === 1) {
                // Delete the app (this will also clean up Firestore)
                await deleteApp(this.app);
            }
            
            // Reset singleton instance
            FirebaseMeshStore.instance = null;
        } catch (error) {
            this.logger.error('Error during cleanup:', error);
            throw error;
        }
    }

    public getFirestore(): FirebaseWebFirestore {
        return this.ensureFirestore();
    }
} 