export interface AgentInfo {
    id: string;
    name: string;
    status: AgentStatus;
    capabilities: string[];
    metadata?: Record<string, unknown>;
}

export enum AgentStatus {
    ONLINE = 'ONLINE',
    OFFLINE = 'OFFLINE',
    BUSY = 'BUSY'
} 