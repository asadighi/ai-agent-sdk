import { AgentInfo } from './agent';
import { ElectionConfig, ElectionState } from './election';

export interface IMeshClient {
    // Agent management
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getAgentInfo(): Promise<AgentInfo>;
    updateAgentInfo(info: Partial<AgentInfo>): Promise<void>;
    
    // Mesh network
    getConnectedAgents(): Promise<AgentInfo[]>;
    onAgentJoined(callback: (agent: AgentInfo) => void): void;
    onAgentLeft(callback: (agentId: string) => void): void;
    
    // Leader election
    startElection(config: ElectionConfig): Promise<void>;
    getElectionState(): Promise<ElectionState>;
    onLeaderChanged(callback: (leaderId: string | null) => void): void;
} 