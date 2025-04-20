export enum AgentRole {
  Leader = 'leader',
  Worker = 'worker'
}

export enum AgentStatus {
  Active = 'active',
  Failover = 'failover',
  Offline = 'offline',
  Suspended = 'suspended',
  Terminated = 'terminated'
}

export enum MemoryScope {
  Private = 'private',
  Internal = 'internal',
  Public = 'public'
}

export interface AgentConfig {
  meshId: string;
  agentId: string;
  role: AgentRole;
  status: AgentStatus;
  isInitialLeader?: boolean;
  heartbeatInterval?: number;
  electionTimeout?: number;
  leaderTimeout?: number;
  minElectionTimeout?: number;
  maxElectionTimeout?: number;
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

export type ElectionMessageType = 'initial_leader' | 'vote_request' | 'vote_response' | 'coordinator';

export interface ElectionMessage {
  timestamp: Date;
  type: string;
  candidateId: string;
  from?: string;
  to?: string;
  term?: number;
  lastLogIndex?: number;
  lastLogTerm?: number;
}

export interface PresenceStatus {
  agentId: string;
  lastSeen: number;
  role: AgentRole;
  status: AgentStatus;
  term: number;
  fencingToken: string;
}

export interface LogEntry {
  term: number;
  action: AgentAction;
}

export interface VoteRequest extends ElectionMessage {
  type: 'vote_request';
  lastLogIndex: number;
  lastLogTerm: number;
}

export interface VoteResponse extends ElectionMessage {
  type: 'vote_response';
  voteGranted: boolean;
}

export interface MeshState {
  hasLeader: boolean;
  leaderId?: string;
  currentTerm: number;
  lastLeaderHeartbeat?: number;
  isInitialLeaderElectionInProgress: boolean;
} 