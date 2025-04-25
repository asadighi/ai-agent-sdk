import { IFirebaseConfig } from './firebaseConfig.js';
import { Agent as AgentClass } from './agent.js';

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
  firebaseConfig: IFirebaseConfig;
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

export interface BaseElectionMessage {
  type: string;
  term: number;
  lastUpdated?: Date;
  lastLogIndex?: number;
  lastLogTerm?: number;
  timestamp?: Date;
}

export interface RequestVoteMessage extends BaseElectionMessage {
  type: 'request_vote';
  candidateId: string;
  lastLogIndex: number;
  lastLogTerm: number;
}

export interface VoteMessage extends BaseElectionMessage {
  type: 'vote';
  candidateId: string;
  voterId: string;
  granted: boolean;
}

export interface InitialLeaderMessage extends BaseElectionMessage {
  type: 'initial_leader';
  leaderId: string;
}

export type ElectionMessage = RequestVoteMessage | VoteMessage | InitialLeaderMessage;

export interface MeshState {
  hasLeader: boolean;
  leaderId?: string;
  currentTerm: number;
  lastLeaderHeartbeat?: number;
  isInitialLeaderElectionInProgress: boolean;
}

export interface IMeshStore {
    registerAgent(agent: { meshId: string; agentId: string; role: AgentRole; status: AgentStatus }): Promise<{ meshId: string; agentId: string }>;
    updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void>;
    updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void>;
    getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>>;
    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void;
    subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void;
    sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void>;
    cleanup(): Promise<void>;
}

export interface MeshClient {
  // ... existing methods ...
  
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