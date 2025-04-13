import { AgentRole, MemoryScope } from './types.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function getRoleValues(): string[] {
  return Object.values(AgentRole);
}

export function getMemoryScopeValues(): string[] {
  return Object.values(MemoryScope);
}

/**
 * Validates a role string
 * @throws {ValidationError} if role is invalid
 */
export function validateRole(role: string): AgentRole {
  if (!Object.values(AgentRole).includes(role as AgentRole)) {
    throw new ValidationError(
      `Invalid role: ${role}. Valid roles are: ${getRoleValues().join(', ')}`
    );
  }
  return role as AgentRole;
}

export function validateMemoryScope(scope: string): MemoryScope {
  if (!Object.values(MemoryScope).includes(scope as MemoryScope)) {
    throw new ValidationError(
      `Invalid memory scope: ${scope}. Valid scopes are: ${getMemoryScopeValues().join(', ')}`
    );
  }
  return scope as MemoryScope;
}

export function validateAgentConfig(config: { meshId: string; agentId: string; role: string }) {
  if (!config.meshId) {
    throw new ValidationError('meshId is required');
  }
  if (!config.agentId) {
    throw new ValidationError('agentId is required');
  }
  if (!config.role) {
    throw new ValidationError('role is required');
  }
  
  return {
    ...config,
    role: validateRole(config.role)
  };
} 