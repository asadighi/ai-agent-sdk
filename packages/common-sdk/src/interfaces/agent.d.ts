export declare enum AgentRole {
    Manager = "manager",
    Worker = "worker"
}
export declare enum AgentStatus {
    Active = "active",
    Follower = "follower",
    Offline = "offline",
    Terminated = "terminated"
}
export interface IStorageConfig {
    [key: string]: any;
}
export interface IAgentConfig {
    meshId: string;
    agentId: string;
    role: AgentRole;
    status: AgentStatus;
    storageConfig: IStorageConfig;
    heartbeatInterval?: number;
    electionInterval?: number;
    maxElectionTimeout?: number;
}
//# sourceMappingURL=agent.d.ts.map