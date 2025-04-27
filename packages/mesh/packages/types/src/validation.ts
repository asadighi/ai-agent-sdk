import { 
    AgentType, 
    AgentStatus, 
    ManagerRole, 
    AgentConfig, 
    AgentState, 
    MessageType, 
    BaseMessage, 
    OperationType, 
    AuthStatus, 
    Operation, 
    AuthContext, 
    AuthResult,
    ElectionConfig,
    ElectionState,
    MeshStatus
} from './index';

/**
 * Validates an agent configuration
 * @param config Agent configuration to validate
 * @returns Whether the configuration is valid
 */
export function isValidAgentConfig(config: unknown): config is AgentConfig {
    if (typeof config !== 'object' || config === null) return false;
    
    const cfg = config as AgentConfig;
    return (
        typeof cfg.id === 'string' &&
        Object.values(AgentType).includes(cfg.type) &&
        typeof cfg.name === 'string' &&
        Array.isArray(cfg.capabilities) &&
        cfg.capabilities.every(cap => typeof cap === 'string') &&
        (cfg.metadata === undefined || typeof cfg.metadata === 'object')
    );
}

/**
 * Validates an agent state
 * @param state Agent state to validate
 * @returns Whether the state is valid
 */
export function isValidAgentState(state: unknown): state is AgentState {
    if (typeof state !== 'object' || state === null) return false;
    
    const st = state as AgentState;
    return (
        typeof st.id === 'string' &&
        typeof st.version === 'number' &&
        typeof st.data === 'object' &&
        st.data !== null &&
        st.lastUpdated instanceof Date
    );
}

/**
 * Validates a base message
 * @param message Message to validate
 * @returns Whether the message is valid
 */
export function isValidBaseMessage(message: unknown): message is BaseMessage {
    if (typeof message !== 'object' || message === null) return false;
    
    const msg = message as BaseMessage;
    return (
        typeof msg.id === 'string' &&
        Object.values(MessageType).includes(msg.type) &&
        typeof msg.senderId === 'string' &&
        typeof msg.recipientId === 'string' &&
        msg.timestamp instanceof Date &&
        (msg.metadata === undefined || typeof msg.metadata === 'object')
    );
}

/**
 * Validates an operation
 * @param operation Operation to validate
 * @returns Whether the operation is valid
 */
export function isValidOperation(operation: unknown): operation is Operation {
    if (typeof operation !== 'object' || operation === null) return false;
    
    const op = operation as Operation;
    return (
        Object.values(OperationType).includes(op.type) &&
        typeof op.resource === 'string' &&
        op.timestamp instanceof Date &&
        (op.parameters === undefined || typeof op.parameters === 'object')
    );
}

/**
 * Validates an authentication context
 * @param context Authentication context to validate
 * @returns Whether the context is valid
 */
export function isValidAuthContext(context: unknown): context is AuthContext {
    if (typeof context !== 'object' || context === null) return false;
    
    const ctx = context as AuthContext;
    return (
        typeof ctx.agentId === 'string' &&
        Object.values(AgentType).includes(ctx.agentType) &&
        Array.isArray(ctx.capabilities) &&
        ctx.capabilities.every(cap => typeof cap === 'string') &&
        (ctx.role === undefined || Object.values(ManagerRole).includes(ctx.role)) &&
        (ctx.metadata === undefined || typeof ctx.metadata === 'object')
    );
}

/**
 * Validates an authentication result
 * @param result Authentication result to validate
 * @returns Whether the result is valid
 */
export function isValidAuthResult(result: unknown): result is AuthResult {
    if (typeof result !== 'object' || result === null) return false;
    
    const res = result as AuthResult;
    return (
        Object.values(AuthStatus).includes(res.status) &&
        (res.token === undefined || typeof res.token === 'string') &&
        (res.error === undefined || typeof res.error === 'string') &&
        (res.expiresAt === undefined || res.expiresAt instanceof Date)
    );
}

/**
 * Type guard for checking if a value is a valid agent type
 * @param value Value to check
 * @returns Whether the value is a valid agent type
 */
export function isAgentType(value: unknown): value is AgentType {
    return Object.values(AgentType).includes(value as AgentType);
}

/**
 * Type guard for checking if a value is a valid agent status
 * @param value Value to check
 * @returns Whether the value is a valid agent status
 */
export function isAgentStatus(value: unknown): value is AgentStatus {
    return Object.values(AgentStatus).includes(value as AgentStatus);
}

/**
 * Type guard for checking if a value is a valid manager role
 * @param value Value to check
 * @returns Whether the value is a valid manager role
 */
export function isManagerRole(value: unknown): value is ManagerRole {
    return Object.values(ManagerRole).includes(value as ManagerRole);
}

/**
 * Type guard for checking if a value is a valid message type
 * @param value Value to check
 * @returns Whether the value is a valid message type
 */
export function isMessageType(value: unknown): value is MessageType {
    return Object.values(MessageType).includes(value as MessageType);
}

/**
 * Type guard for checking if a value is a valid operation type
 * @param value Value to check
 * @returns Whether the value is a valid operation type
 */
export function isOperationType(value: unknown): value is OperationType {
    return Object.values(OperationType).includes(value as OperationType);
}

/**
 * Type guard for checking if a value is a valid authentication status
 * @param value Value to check
 * @returns Whether the value is a valid authentication status
 */
export function isAuthStatus(value: unknown): value is AuthStatus {
    return Object.values(AuthStatus).includes(value as AuthStatus);
}

/**
 * Validates an election configuration
 * @param config Election configuration to validate
 * @returns Whether the configuration is valid
 */
export function isValidElectionConfig(config: unknown): config is ElectionConfig {
    if (typeof config !== 'object' || config === null) return false;
    
    const cfg = config as ElectionConfig;
    return (
        typeof cfg.electionTimeout === 'number' &&
        typeof cfg.heartbeatTimeout === 'number' &&
        typeof cfg.minElectionTimeout === 'number' &&
        typeof cfg.maxElectionTimeout === 'number' &&
        cfg.electionTimeout > 0 &&
        cfg.heartbeatTimeout > 0 &&
        cfg.minElectionTimeout > 0 &&
        cfg.maxElectionTimeout > cfg.minElectionTimeout
    );
}

/**
 * Validates an election state
 * @param state Election state to validate
 * @returns Whether the state is valid
 */
export function isValidElectionState(state: unknown): state is ElectionState {
    if (typeof state !== 'object' || state === null) return false;
    
    const st = state as ElectionState;
    return (
        typeof st.currentTerm === 'number' &&
        st.currentTerm >= 0 &&
        (st.votedFor === undefined || typeof st.votedFor === 'string') &&
        (st.leaderId === undefined || typeof st.leaderId === 'string') &&
        typeof st.isCandidate === 'boolean' &&
        st.lastHeartbeatTime instanceof Date &&
        st.lastElectionTime instanceof Date
    );
}

/**
 * Type guard for checking if a value is a valid mesh status
 * @param value Value to check
 * @returns Whether the value is a valid mesh status
 */
export function isMeshStatus(value: unknown): value is MeshStatus {
    return Object.values(MeshStatus).includes(value as MeshStatus);
} 