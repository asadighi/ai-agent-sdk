import { collection, doc, setDoc, addDoc, onSnapshot, serverTimestamp, Firestore as FirebaseWebFirestore, Transaction, runTransaction, query, where, orderBy, limit, writeBatch, updateDoc, getDocs, DocumentReference, CollectionReference, getFirestore, WriteBatch, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { AgentRole, MemoryScope, Heartbeat, ElectionMessage, PresenceStatus, AgentStatus } from './types.js';
import { validateRole, validateAgentConfig, validateMemoryScope, ValidationError } from './validation.js';
import { initializeApp, getApps, getApp, FirebaseApp, deleteApp, FirebaseOptions } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Define our clean interface for Firestore operations
export interface IFirestoreClient {
    registerAgent(config: { meshId: string; agentId: string; role: AgentRole }): Promise<{ meshId: string; agentId: string }>;
    emitEvent(event: { meshId: string; agentId: string; type: string; data: any; scope: string }): Promise<string>;
    updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void>;
    updatePresenceStatus(meshId: string, statuses: PresenceStatus[]): Promise<void>;
    updateAgentRole(meshId: string, agentId: string, role: AgentRole): Promise<void>;
    sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void>;
    updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void>;
    getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>>;
    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void;
    subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void;
    cleanup(): Promise<void>;
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

// Implementation using Firebase
export class FirebaseFirestoreClient implements IFirestoreClient {
    private static instance: FirebaseFirestoreClient;
    private app: FirebaseApp;
    private firestore: FirestoreWrapper;
    private auth: Auth | null = null;
    private heartbeatSubscriptions: Map<string, () => void> = new Map();
    private electionSubscriptions: Map<string, () => void> = new Map();
    private heartbeats: Map<string, Map<string, Heartbeat>> = new Map();
    private elections: Map<string, Map<string, ElectionMessage>> = new Map();
    private agents: Map<string, Map<string, PresenceStatus>> = new Map();

    private constructor(firebaseConfig: FirebaseOptions) {
        try {
            // Initialize Firebase app
            if (getApps().length === 0) {
                this.app = initializeApp(firebaseConfig);
            } else {
                this.app = getApp();
            }

            // Initialize Firestore
            const firestoreInstance = getFirestore(this.app);
            if (!firestoreInstance) {
                throw new Error('Failed to initialize Firestore');
            }
            this.firestore = new FirestoreWrapper(firestoreInstance);
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            throw error;
        }
    }

    public static getInstance(config?: FirebaseOptions): FirebaseFirestoreClient {
        if (!FirebaseFirestoreClient.instance) {
            if (!config) {
                throw new Error('Firebase configuration is required for first initialization');
            }
            FirebaseFirestoreClient.instance = new FirebaseFirestoreClient(config);
        }
        return FirebaseFirestoreClient.instance;
    }

    private ensureFirestore(): FirestoreWrapper {
        if (!this.firestore) {
            throw new Error('Firestore is not initialized');
        }
        return this.firestore;
    }

    getDb(): FirebaseWebFirestore {
        return this.ensureFirestore().getDb();
    }

    async registerAgent(config: { meshId: string; agentId: string; role: AgentRole }) {
        try {
            const validatedConfig = validateAgentConfig(config);
            console.log('Creating mesh and agent with config:', validatedConfig);

            const db = this.ensureFirestore();
            const meshRef = doc(db.collection('meshes'), validatedConfig.meshId);
            const agentRef = doc(collection(meshRef, 'agents'), validatedConfig.agentId);

            await db.runTransaction(async (transaction) => {
                const meshDoc = await transaction.get(meshRef);
                if (!meshDoc.exists) {
                    transaction.set(meshRef, {
                        createdAt: db.serverTimestamp(),
                        updatedAt: db.serverTimestamp()
                    });
                }

                transaction.set(agentRef, {
                    role: validatedConfig.role,
                    createdAt: db.serverTimestamp(),
                    updatedAt: db.serverTimestamp()
                });
            });

            console.log('Successfully created mesh and agent');
            return { meshId: validatedConfig.meshId, agentId: validatedConfig.agentId };
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            console.error('Error creating mesh and agent:', error);
            throw error;
        }
    }

    async emitEvent(event: {
        meshId: string;
        agentId: string;
        type: string;
        data: any;
        scope: string;
    }) {
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

            const meshDocRef = doc(this.firestore.collection('meshes'), event.meshId);
            const eventsCollRef = collection(meshDocRef, 'events');
            const eventRef = doc(eventsCollRef);

            await setDoc(eventRef, {
                type: event.type,
                data: event.data,
                scope: validatedScope,
                agentId: event.agentId,
                createdAt: this.firestore.serverTimestamp(),
                updatedAt: this.firestore.serverTimestamp()
            });

            return eventRef.id;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            console.error('Error emitting event:', error);
            throw error;
        }
    }

    async updateHeartbeat(meshId: string, heartbeat: Heartbeat) {
        try {
            const meshRef = doc(this.firestore.collection('meshes'), meshId);
            const agentsRef = collection(meshRef, 'agents');
            const agentRef = doc(agentsRef, heartbeat.agentId);
            await setDoc(agentRef, {
                heartbeat: {
                    timestamp: heartbeat.timestamp,
                    role: heartbeat.role,
                    status: heartbeat.status
                },
                updatedAt: this.firestore.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating heartbeat:', error);
            throw error;
        }
    }

    async updatePresenceStatus(meshId: string, statuses: PresenceStatus[]) {
        try {
            const batch = this.firestore.batch();
            const meshRef = doc(this.firestore.collection('meshes'), meshId);
            const agentsRef = collection(meshRef, 'agents');
            
            for (const status of statuses) {
                const agentRef = doc(agentsRef, status.agentId);
                batch.set(agentRef, {
                    presence: {
                        lastSeen: status.lastSeen,
                        role: status.role,
                        status: status.status
                    },
                    updatedAt: this.firestore.serverTimestamp()
                }, { merge: true });
            }
            
            await batch.commit();
        } catch (error) {
            console.error('Error updating presence status:', error);
            throw error;
        }
    }

    async updateAgentRole(meshId: string, agentId: string, role: AgentRole) {
        try {
            const validatedRole = validateRole(role);
            const meshRef = doc(this.firestore.collection('meshes'), meshId);
            const agentsRef = collection(meshRef, 'agents');
            const agentRef = doc(agentsRef, agentId);
            await setDoc(agentRef, {
                role: validatedRole,
                updatedAt: this.firestore.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating agent role:', error);
            throw error;
        }
    }

    async sendElectionMessage(meshId: string, message: ElectionMessage) {
        try {
            const meshRef = doc(this.firestore.collection('meshes'), meshId);
            const electionsRef = collection(meshRef, 'elections');
            const electionRef = doc(electionsRef);
            await setDoc(electionRef, {
                ...message,
                createdAt: this.firestore.serverTimestamp()
            });
        } catch (error) {
            console.error('Error sending election message:', error);
            throw error;
        }
    }

    async updateAgentStatus(meshId: string, agentId: string, status: AgentStatus) {
        try {
            const meshRef = doc(this.firestore.collection('meshes'), meshId);
            const agentRef = doc(collection(meshRef, 'agents'), agentId);
            await setDoc(agentRef, {
                status,
                updatedAt: this.firestore.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating agent status:', error);
            throw error;
        }
    }

    async sendHeartbeat(meshId: string, agentId: string, role: AgentRole): Promise<void> {
        try {
            const heartbeat: Heartbeat = {
                agentId,
                role,
                timestamp: Date.now(),
                status: AgentStatus.Active,
                term: 0,
                fencingToken: Date.now().toString()
            };
            await this.updateHeartbeat(meshId, heartbeat);
        } catch (error) {
            console.error('Error sending heartbeat:', error);
            throw error;
        }
    }

    async getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>> {
        try {
            const meshRef = doc(this.firestore.collection('meshes'), meshId);
            const agentsRef = collection(meshRef, 'agents');
            const agentsSnapshot = await getDocs(agentsRef);
            const statuses = new Map<string, PresenceStatus>();
            
            agentsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data();
                if (data.presence) {
                    statuses.set(doc.id, {
                        agentId: doc.id,
                        lastSeen: data.presence.lastSeen,
                        role: data.presence.role,
                        status: data.presence.status,
                        term: data.presence.term || 0,
                        fencingToken: data.presence.fencingToken || Date.now().toString()
                    });
                }
            });
            
            return statuses;
        } catch (error) {
            console.error('Error getting agent statuses:', error);
            throw error;
        }
    }

    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void {
        const db = this.ensureFirestore();
        const meshRef = doc(db.collection('meshes'), meshId);
        const agentsRef = collection(meshRef, 'agents');
        const unsubscribe = onSnapshot(agentsRef, 
            (snapshot) => {
                const heartbeats = new Map<string, Heartbeat>();
                snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                    const data = doc.data();
                    if (data.heartbeat) {
                        // Convert Firestore timestamp to Date
                        const timestamp = data.heartbeat.timestamp;
                        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp || Date.now());
                        
                        heartbeats.set(doc.id, {
                            agentId: doc.id,
                            timestamp: date.getTime(),
                            role: data.heartbeat.role,
                            status: data.heartbeat.status,
                            term: data.heartbeat.term || 0,
                            fencingToken: data.heartbeat.fencingToken || Date.now().toString()
                        });
                    }
                });
                callback(heartbeats);
            });
        return () => unsubscribe();
    }

    subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void {
        const meshRef = doc(this.firestore.collection('meshes'), meshId);
        const electionsRef = collection(meshRef, 'elections');
        const unsubscribe = onSnapshot(electionsRef, 
            (snapshot) => {
                const messages = new Map<string, ElectionMessage>();
                snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                    const data = doc.data();
                    messages.set(doc.id, {
                        timestamp: new Date(data.timestamp),
                        type: data.type,
                        candidateId: data.candidateId,
                        from: data.from,
                        to: data.to,
                        term: data.term,
                        lastLogIndex: data.lastLogIndex,
                        lastLogTerm: data.lastLogTerm
                    });
                });
                callback(messages);
            });
        return () => unsubscribe();
    }

    async cleanup(): Promise<void> {
        if (this.app) {
            await deleteApp(this.app);
        }
        this.firestore = undefined as any;
        this.auth = null;
        this.heartbeatSubscriptions.clear();
        this.electionSubscriptions.clear();
        this.heartbeats.clear();
        this.elections.clear();
        this.agents.clear();
    }
}

// Export the interface as the default
export default IFirestoreClient;

// Export the implementation with the alias
export { FirebaseFirestoreClient as FirestoreClient }; 