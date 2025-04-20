import { IFirestoreClient, IFirestoreInstance, ICollectionReference, IDocumentReference, ITransaction } from './types.js';
import { AgentRole, MemoryScope, Heartbeat, ElectionMessage, PresenceStatus, AgentStatus } from '../types.js';
import { validateAgentConfig, validateMemoryScope, ValidationError } from '../validation.js';
import * as admin from 'firebase-admin';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export class FirebaseFirestoreClient implements IFirestoreClient {
    private static instance: FirebaseFirestoreClient;
    private heartbeatSubscriptions: Map<string, () => void> = new Map();
    private electionSubscriptions: Map<string, () => void> = new Map();
    private heartbeats: Map<string, Map<string, Heartbeat>> = new Map();
    private elections: Map<string, Map<string, ElectionMessage>> = new Map();
    private agents: Map<string, Map<string, PresenceStatus>> = new Map();
    private isAdmin: boolean;
    private firestore!: IFirestoreInstance;

    private constructor() {
        this.isAdmin = process.env.NODE_ENV === 'test';
        this.initializeFirestore();
    }

    private initializeFirestore() {
        if (this.isAdmin) {
            // Initialize Admin SDK for tests
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId: process.env.FIREBASE_PROJECT_ID
                });
            }
            this.firestore = admin.firestore() as unknown as IFirestoreInstance;
        } else {
            // Initialize Web SDK for production
            const firebaseConfig = {
                apiKey: process.env.FIREBASE_API_KEY,
                authDomain: process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.FIREBASE_APP_ID
            };

            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
            this.firestore = getFirestore(app) as unknown as IFirestoreInstance;
        }
    }

    public static getInstance(): FirebaseFirestoreClient {
        if (!FirebaseFirestoreClient.instance) {
            FirebaseFirestoreClient.instance = new FirebaseFirestoreClient();
        }
        return FirebaseFirestoreClient.instance;
    }

    private getServerTimestamp() {
        return this.isAdmin
            ? (this.firestore as any).FieldValue.serverTimestamp()
            : (this.firestore as any).FieldValue.serverTimestamp();
    }

    async registerAgent(config: { meshId: string; agentId: string; role: AgentRole }) {
        try {
            const validatedConfig = validateAgentConfig(config);
            console.log('Creating mesh and agent with config:', validatedConfig);

            const meshRef = this.firestore.collection('meshes').doc(validatedConfig.meshId);
            const agentRef = meshRef.collection('agents').doc(validatedConfig.agentId);

            await this.firestore.runTransaction(async (transaction: ITransaction) => {
                const meshDoc = await transaction.get(meshRef);
                if (!meshDoc.exists) {
                    transaction.set(meshRef, {
                        createdAt: this.getServerTimestamp(),
                        updatedAt: this.getServerTimestamp()
                    });
                }

                transaction.set(agentRef, {
                    role: validatedConfig.role,
                    createdAt: this.getServerTimestamp(),
                    updatedAt: this.getServerTimestamp()
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

    async emitEvent(event: { meshId: string; agentId: string; type: string; data: any; scope: string }) {
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

            const meshRef = this.firestore.collection('meshes').doc(event.meshId);
            const eventsRef = meshRef.collection('events');
            const eventRef = eventsRef.doc();

            await eventRef.set({
                type: event.type,
                data: event.data,
                scope: validatedScope,
                agentId: event.agentId,
                createdAt: this.getServerTimestamp(),
                updatedAt: this.getServerTimestamp()
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

    async updateHeartbeat(meshId: string, heartbeat: Heartbeat) {
        try {
            const agentRef = this.firestore.collection('meshes').doc(meshId).collection('agents').doc(heartbeat.agentId);
            await agentRef.set({
                heartbeat: {
                    timestamp: heartbeat.timestamp,
                    role: heartbeat.role,
                    status: heartbeat.status
                },
                updatedAt: this.getServerTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating heartbeat:', error);
            throw error;
        }
    }

    async updatePresenceStatus(meshId: string, statuses: PresenceStatus[]) {
        try {
            const batch = this.firestore.batch();
            
            for (const status of statuses) {
                const agentRef = this.firestore.collection('meshes').doc(meshId).collection('agents').doc(status.agentId);
                batch.set(agentRef, {
                    presence: {
                        lastSeen: status.lastSeen,
                        role: status.role,
                        status: status.status
                    },
                    updatedAt: this.getServerTimestamp()
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
            const agentRef = this.firestore.collection('meshes').doc(meshId).collection('agents').doc(agentId);
            await agentRef.set({
                role,
                updatedAt: this.getServerTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating agent role:', error);
            throw error;
        }
    }

    async sendElectionMessage(meshId: string, message: ElectionMessage) {
        try {
            const electionsRef = this.firestore.collection('meshes').doc(meshId).collection('elections');
            const electionRef = electionsRef.doc(message.from);
            await electionRef.set(message);
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                console.warn(`[MESH] Permission denied when sending election message: ${error.message}`);
            } else {
                console.error(`[MESH] Error sending election message: ${error.message}`);
            }
        }
    }

    async updateAgentStatus(meshId: string, agentId: string, status: AgentStatus) {
        try {
            const agentRef = this.firestore.collection('meshes').doc(meshId).collection('agents').doc(agentId);
            await agentRef.set({
                status,
                updatedAt: this.getServerTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating agent status:', error);
            throw error;
        }
    }

    async getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>> {
        try {
            const agentsRef = this.firestore.collection('meshes').doc(meshId).collection('agents');
            const snapshot = await agentsRef.get();
            const statuses = new Map<string, PresenceStatus>();
            
            snapshot.forEach((doc: any) => {
                const data = doc.data();
                statuses.set(doc.id, {
                    agentId: doc.id,
                    status: data.status,
                    lastSeen: data.updatedAt?.toDate() || new Date(),
                    role: data.role || AgentRole.Worker,
                    term: data.term || 0,
                    fencingToken: data.fencingToken || Date.now().toString()
                });
            });
            
            return statuses;
        } catch (error) {
            console.error('Error getting agent statuses:', error);
            throw error;
        }
    }

    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void {
        const agentsRef = this.firestore.collection('meshes').doc(meshId).collection('agents');
        const unsubscribe = agentsRef.onSnapshot((snapshot: any) => {
            const heartbeats = new Map<string, Heartbeat>();
            snapshot.forEach((doc: any) => {
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
        const electionsRef = this.firestore.collection('meshes').doc(meshId).collection('elections');
        const unsubscribe = electionsRef.onSnapshot((snapshot: any) => {
            const messages = new Map<string, ElectionMessage>();
            snapshot.forEach((doc: any) => {
                const data = doc.data();
                messages.set(doc.id, {
                    timestamp: data.timestamp?.toDate() || new Date(),
                    type: data.type,
                    candidateId: data.agentId
                });
            });
            callback(messages);
        });
        
        this.electionSubscriptions.set(meshId, unsubscribe);
        return unsubscribe;
    }

    async cleanup() {
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