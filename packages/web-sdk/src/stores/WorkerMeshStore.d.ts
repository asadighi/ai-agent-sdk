import { FirebaseMeshStore, Heartbeat, ElectionMessage, AgentStatus, AgentRole } from '@ai-agent/core-sdk';
export interface WorkerMeshStoreConfig {
    meshId: string;
    agentId: string;
    role: AgentRole;
    heartbeatWorkerUrl: string;
    electionWorkerUrl: string;
}
export declare class WorkerMeshStore {
    private meshStore;
    private heartbeatWorker;
    private electionWorker;
    private heartbeatCallbacks;
    private electionCallbacks;
    private meshId;
    private agentId;
    private role;
    private status;
    private unsubscribeHeartbeats;
    private unsubscribeElections;
    private currentAgentId;
    constructor(meshStore: FirebaseMeshStore, config: WorkerMeshStoreConfig);
    private initializeWorkers;
    initialize(): Promise<void>;
    private cleanupStaleAgents;
    cleanup(): Promise<void>;
    updateAgentStatus(status: AgentStatus): Promise<void>;
    updateAgentRole(role: AgentRole): Promise<void>;
    getAgentStatuses(): Promise<Map<string, {
        agentId: string;
        role: AgentRole;
        status: AgentStatus;
        lastSeen: number;
        fencingToken: string;
    }>>;
    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void;
    subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void;
}
//# sourceMappingURL=WorkerMeshStore.d.ts.map