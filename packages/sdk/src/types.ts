export enum AgentRole {
  Active = 'active',
  Leader = 'leader',
  Observer = 'observer',
  Public = 'public',
  Banned = 'banned'
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
}

export interface AgentAction {
  type: string;
  payload: any;
}

export interface MemoryUpdate {
  scope: MemoryScope;
  key: string;
  value: any;
} 