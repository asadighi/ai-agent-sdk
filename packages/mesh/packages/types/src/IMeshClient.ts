import { Agent, AgentRole, AgentStatus, Heartbeat } from './agent';
import { ElectionMessage } from './election';

export interface IMeshClient {
    registerAgent(agentId: string, role: AgentRole): Promise<void>;
    updateAgentStatus(agentId: string, status: AgentStatus): Promise<void>;
    updateHeartbeat(agentId: string, heartbeat: Heartbeat): Promise<void>;
    getAgentStatuses(): Promise<Map<string, AgentStatus>>;
    subscribeToHeartbeats(callback: (heartbeat: Heartbeat) => void): () => void;
    subscribeToElectionMessages(callback: (message: ElectionMessage) => void): () => void;
    sendElectionMessage(message: ElectionMessage): Promise<void>;
    cleanup(): Promise<void>;
    getLeader(meshId: string): Promise<Agent | null>;
    getAgentCount(meshId: string): Promise<number>;
    updateAgent(agent: {
        meshId: string;
        agentId: string;
        role: AgentRole;
        status: AgentStatus;
    }): Promise<void>;
    getAgents(meshId: string): Promise<Map<string, Agent>>;
} 