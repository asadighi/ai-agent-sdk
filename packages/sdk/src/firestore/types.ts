import { AgentRole, MemoryScope, Heartbeat, ElectionMessage, PresenceStatus, AgentStatus } from '../types.js';

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

// Define internal types for Firestore operations
export interface IFirestoreInstance {
    collection(path: string): ICollectionReference;
    doc(path: string): IDocumentReference;
    batch(): IBatch;
    runTransaction<T>(updateFunction: (transaction: ITransaction) => Promise<T>): Promise<T>;
    FieldValue: {
        serverTimestamp(): any;
    };
}

export interface ICollectionReference {
    doc(id?: string): IDocumentReference;
    get(): Promise<IQuerySnapshot>;
    onSnapshot(onNext: (snapshot: IQuerySnapshot) => void): () => void;
}

export interface IDocumentReference {
    id: string;
    get(): Promise<IDocumentSnapshot>;
    set(data: any, options?: { merge?: boolean }): Promise<void>;
    update(data: any): Promise<void>;
    collection(path: string): ICollectionReference;
}

export interface IQuerySnapshot {
    forEach(callback: (doc: IDocumentSnapshot) => void): void;
}

export interface IDocumentSnapshot {
    id: string;
    data(): any;
    exists: boolean;
}

export interface IBatch {
    set(ref: IDocumentReference, data: any, options?: { merge?: boolean }): void;
    commit(): Promise<void>;
}

export interface ITransaction {
    get(ref: IDocumentReference): Promise<IDocumentSnapshot>;
    set(ref: IDocumentReference, data: any): void;
} 