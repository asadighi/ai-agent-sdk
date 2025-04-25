import { IFirestoreClient, IFirestoreInstance, ICollectionReference, IDocumentReference, ITransaction } from './types.js';
import { AgentRole, MemoryScope, Heartbeat, ElectionMessage, PresenceStatus, AgentStatus } from '../types.js';
import { validateAgentConfig, validateMemoryScope, ValidationError } from '../validation.js';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp, query, where, orderBy, limit, writeBatch, DocumentReference, CollectionReference, WriteBatch, DocumentData, QueryDocumentSnapshot, runTransaction, getDocs } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { IFirebaseConfig } from '../firebaseConfig.js';
import { v4 as uuidv4 } from 'uuid';

export class FirestoreClient {
    private static instance: FirestoreClient | null = null;
    private app!: FirebaseApp;
    private db!: Firestore;
    private auth: Auth | null = null;

    constructor(config: IFirebaseConfig) {
        if (FirestoreClient.instance) {
            return FirestoreClient.instance;
        }

        this.app = initializeApp(config);
        this.db = getFirestore(this.app);
        FirestoreClient.instance = this;
    }

    static getInstance(config: IFirebaseConfig): FirestoreClient {
        if (!FirestoreClient.instance) {
            FirestoreClient.instance = new FirestoreClient(config);
        }
        return FirestoreClient.instance;
    }

    private ensureFirestore(): Firestore {
        if (!this.db) {
            throw new Error('Firestore is not initialized');
        }
        return this.db;
    }

    collection(path: string): CollectionReference<DocumentData> {
        return collection(this.ensureFirestore(), path);
    }

    doc(path: string): DocumentReference<DocumentData> {
        return doc(this.ensureFirestore(), path);
    }

    batch(): WriteBatch {
        return writeBatch(this.ensureFirestore());
    }

    serverTimestamp(): any {
        return serverTimestamp();
    }

    getDb(): Firestore {
        return this.ensureFirestore();
    }
}

export class FirebaseFirestoreClient implements IFirestoreClient {
    private static instance: FirebaseFirestoreClient | null = null;
    private app!: FirebaseApp;
    private db!: Firestore;
    private auth: Auth | null = null;
    private heartbeatSubscriptions: Map<string, () => void> = new Map();
    private electionSubscriptions: Map<string, () => void> = new Map();
    private heartbeats: Map<string, Map<string, Heartbeat>> = new Map();
    private elections: Map<string, Map<string, ElectionMessage>> = new Map();
    private agents: Map<string, Map<string, PresenceStatus>> = new Map();

    constructor(config: IFirebaseConfig) {
        if (FirebaseFirestoreClient.instance) {
            return FirebaseFirestoreClient.instance;
        }

        this.app = initializeApp(config);
        this.db = getFirestore(this.app);
        FirebaseFirestoreClient.instance = this;
    }

    static getInstance(config: IFirebaseConfig): FirebaseFirestoreClient {
        if (!FirebaseFirestoreClient.instance) {
            FirebaseFirestoreClient.instance = new FirebaseFirestoreClient(config);
        }
        return FirebaseFirestoreClient.instance;
    }

    private ensureFirestore(): Firestore {
        if (!this.db) {
            throw new Error('Firestore is not initialized');
        }
        return this.db;
    }

    collection(path: string): CollectionReference<DocumentData> {
        return collection(this.ensureFirestore(), path);
    }

    doc(path: string): DocumentReference<DocumentData> {
        return doc(this.ensureFirestore(), path);
    }

    batch(): WriteBatch {
        return writeBatch(this.ensureFirestore());
    }

    serverTimestamp(): any {
        return serverTimestamp();
    }

    getDb(): Firestore {
        return this.ensureFirestore();
    }

    async registerAgent(config: { meshId: string; agentId: string; role: AgentRole }): Promise<{ meshId: string; agentId: string }> {
        try {
            const validatedConfig = validateAgentConfig(config);
            console.log('Creating mesh and agent with config:', validatedConfig);

            const meshRef = doc(this.db, 'meshes', validatedConfig.meshId);
            const agentRef = doc(this.db, 'meshes', validatedConfig.meshId, 'agents', validatedConfig.agentId);

            await runTransaction(this.db, async (transaction) => {
                const meshDoc = await transaction.get(meshRef);
                if (!meshDoc.exists()) {
                    transaction.set(meshRef, {
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }

                transaction.set(agentRef, {
                    role: validatedConfig.role,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });

            console.log('Successfully created mesh and agent');
            return { meshId: validatedConfig.meshId, agentId: validatedConfig.agentId };
        } catch (error) {
            if (error instanceof ValidationError) {
                console.error('Validation error:', error.message);
                throw error;
            }
            console.error('Error creating mesh and agent:', error);
            throw error;
        }
    }

    async emitEvent(event: { meshId: string; agentId: string; type: string; data: any; scope: string }): Promise<string> {
        try {
            if (!event.meshId) {
                throw new ValidationError('meshId is required');
            }
            if (!event.agentId) {
                throw new ValidationError('agentId is required');
            }
            if (!event.type) {
                throw new ValidationError('type is required');
            }
            if (!event.scope) {
                throw new ValidationError('scope is required');
            }

            const validatedScope = validateMemoryScope(event.scope);
            console.log('Emitting event with scope:', validatedScope);

            const eventsRef = collection(this.db, 'meshes', event.meshId, 'events');
            const eventRef = doc(eventsRef);

            await setDoc(eventRef, {
                type: event.type,
                data: event.data,
                scope: validatedScope,
                agentId: event.agentId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('Successfully emitted event');
            return eventRef.id;
        } catch (error) {
            if (error instanceof ValidationError) {
                console.error('Validation error:', error.message);
                throw error;
            }
            console.error('Error emitting event:', error);
            throw error;
        }
    }

    async updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void> {
        try {
            const agentRef = doc(this.db, 'meshes', meshId, 'agents', heartbeat.agentId);
            await setDoc(agentRef, {
                heartbeat: {
                    timestamp: heartbeat.timestamp,
                    role: heartbeat.role,
                    status: heartbeat.status
                },
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating heartbeat:', error);
            throw error;
        }
    }

    async updatePresenceStatus(meshId: string, statuses: PresenceStatus[]): Promise<void> {
        try {
            const batch = writeBatch(this.db);
            
            for (const status of statuses) {
                const agentRef = doc(this.db, 'meshes', meshId, 'agents', status.agentId);
                batch.set(agentRef, {
                    presence: {
                        lastSeen: status.lastSeen,
                        role: status.role,
                        status: status.status
                    },
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }

            await batch.commit();
        } catch (error) {
            console.error('Error updating presence status:', error);
            throw error;
        }
    }

    async updateAgentRole(meshId: string, agentId: string, role: AgentRole): Promise<void> {
        try {
            const agentRef = doc(this.db, 'meshes', meshId, 'agents', agentId);
            await setDoc(agentRef, {
                role,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating agent role:', error);
            throw error;
        }
    }

    async sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void> {
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
        await setDoc(electionRef, message);
    }

    async updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void> {
        try {
            const agentRef = doc(this.db, 'meshes', meshId, 'agents', agentId);
            await setDoc(agentRef, {
                status,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating agent status:', error);
            throw error;
        }
    }

    async getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>> {
        try {
            const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
            const snapshot = await getDocs(agentsRef);
            const statuses = new Map<string, PresenceStatus>();
            
            snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data();
                statuses.set(doc.id, {
                    agentId: doc.id,
                    role: data.role,
                    status: data.status,
                    lastSeen: data.updatedAt?.toDate() || new Date(),
                    fencingToken: data.fencingToken || uuidv4()
                });
            });
            
            return statuses;
        } catch (error) {
            console.error('Error getting agent statuses:', error);
            throw error;
        }
    }

    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void {
        const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
        const unsubscribe = onSnapshot(agentsRef, (snapshot) => {
            const heartbeats = new Map<string, Heartbeat>();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.heartbeat) {
                    heartbeats.set(doc.id, {
                        agentId: doc.id,
                        timestamp: data.heartbeat.timestamp?.toDate() || new Date(),
                        status: data.heartbeat.status,
                        role: data.heartbeat.role || AgentRole.Worker,
                        term: data.heartbeat.term || 0,
                        fencingToken: data.heartbeat.fencingToken || Date.now().toString()
                    });
                }
            });
            callback(heartbeats);
        });
        
        this.heartbeatSubscriptions.set(meshId, unsubscribe);
        return unsubscribe;
    }

    subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void {
        const electionsRef = collection(this.db, 'meshes', meshId, 'elections');
        const unsubscribe = onSnapshot(electionsRef, (snapshot) => {
            const messages = new Map<string, ElectionMessage>();
            snapshot.forEach((doc) => {
                const data = doc.data();
                let message: ElectionMessage;
                if (data.type === 'request_vote') {
                    message = {
                        type: 'request_vote',
                        term: data.term || 0,
                        candidateId: data.candidateId,
                        lastLogIndex: data.lastLogIndex || 0,
                        lastLogTerm: data.lastLogTerm || 0,
                        timestamp: data.timestamp?.toDate() || new Date()
                    };
                } else if (data.type === 'vote') {
                    message = {
                        type: 'vote',
                        term: data.term || 0,
                        candidateId: data.candidateId,
                        voterId: data.voterId,
                        granted: data.granted,
                        timestamp: data.timestamp?.toDate() || new Date()
                    };
                } else {
                    message = {
                        type: 'initial_leader',
                        term: data.term || 0,
                        leaderId: data.leaderId,
                        timestamp: data.timestamp?.toDate() || new Date()
                    };
                }
                messages.set(doc.id, message);
            });
            callback(messages);
        });
        
        this.electionSubscriptions.set(meshId, unsubscribe);
        return unsubscribe;
    }

    async cleanup(): Promise<void> {
        this.heartbeatSubscriptions.forEach(unsubscribe => unsubscribe());
        this.electionSubscriptions.forEach(unsubscribe => unsubscribe());
        this.heartbeatSubscriptions.clear();
        this.electionSubscriptions.clear();
        this.heartbeats.clear();
        this.elections.clear();
        this.agents.clear();
    }
}

// Export the interface as the default
export type { IFirestoreClient as default }; 