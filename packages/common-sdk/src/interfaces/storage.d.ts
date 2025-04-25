import { AgentRole, AgentStatus } from './agent';
export interface IStorageClient {
    registerAgent(params: {
        meshId: string;
        agentId: string;
        role: AgentRole;
        status: AgentStatus;
    }): Promise<void>;
    updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void>;
    getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>>;
    updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void>;
    getHeartbeats(meshId: string): Promise<Map<string, Heartbeat>>;
    sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void>;
    cleanup(): Promise<void>;
}
export interface Heartbeat {
    agentId: string;
    timestamp: number;
    role: AgentRole;
    status: AgentStatus;
    term: number;
    fencingToken: string;
}
export interface PresenceStatus {
    agentId: string;
    role: AgentRole;
    status: AgentStatus;
    lastSeen: number;
}
export interface ElectionMessage {
    type: 'request_vote';
    term: number;
    candidateId: string;
    lastLogIndex: number;
    lastLogTerm: number;
}
//# sourceMappingURL=storage.d.ts.map