export enum AgentRole {
    Manager = 'Manager',
    Worker = 'Worker'
}

export enum AgentStatus {
    Active = 'Active',
    Follower = 'Follower',
    Offline = 'Offline',
    Terminated = 'Terminated'
}

export enum MemoryScope {
    Private = 'private',
    Internal = 'internal',
    Public = 'public'
}

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export interface AgentConfig {
    meshId: string;
    agentId: string;
    role: AgentRole;
    status: AgentStatus;
}

export interface AgentAction {
    type: string;
    payload: any;
}

export interface MemoryUpdate {
    key: string;
    value: any;
    timestamp: number;
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
    fencingToken: string;
}

export interface AgentLogEntry {
    term: number;
    action: AgentAction;
}

export interface Agent {
    meshId: string;
    agentId: string;
    role: AgentRole;
    status: AgentStatus;
    lastHeartbeat: number;
} 