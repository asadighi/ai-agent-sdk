import { AgentRole, MemoryScope, Heartbeat, ElectionMessage, PresenceStatus, AgentStatus, AgentConfig } from './types.js';

export interface IMeshStore {
    // Agent Management
    registerAgent(config: AgentConfig): Promise<{ meshId: string; agentId: string }>;
    updateAgentRole(meshId: string, agentId: string, role: AgentRole): Promise<void>;
    updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void>;
    getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>>;

    // Event Management
    emitEvent(event: { meshId: string; agentId: string; type: string; data: any; scope: MemoryScope }): Promise<string>;

    // Heartbeat Management
    updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void>;
    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void;

    // Election Management
    sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void>;
    subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void;

    // Presence Management
    updatePresenceStatus(meshId: string, statuses: PresenceStatus[]): Promise<void>;

    // Cleanup
    cleanup(): Promise<void>;
} 