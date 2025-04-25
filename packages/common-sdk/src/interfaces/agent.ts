export enum AgentRole {
  Manager = 'manager',
  Worker = 'worker'
}

export enum AgentStatus {
  Active = 'active',
  Follower = 'follower',
  Offline = 'offline',
  Terminated = 'terminated'
}

export interface IStorageConfig {
  // Common configuration options for any storage implementation
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