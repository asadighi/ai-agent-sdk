import { AgentType, ManagerRole } from './agent';

/**
 * Status of an authentication operation
 */
export enum AuthStatus {
    /** Authentication successful */
    SUCCESS = 'SUCCESS',
    /** Authentication failed */
    FAILURE = 'FAILURE',
    /** Authentication pending */
    PENDING = 'PENDING',
    /** Authentication expired */
    EXPIRED = 'EXPIRED'
}

/**
 * Types of operations that can be performed in the mesh
 */
export enum OperationType {
    /** Read operation */
    READ = 'READ',
    /** Write operation */
    WRITE = 'WRITE',
    /** Execute operation */
    EXECUTE = 'EXECUTE',
    /** Admin operation */
    ADMIN = 'ADMIN'
}

/**
 * Represents an operation that needs to be authorized
 */
export interface Operation {
    /** Type of operation */
    type: OperationType;
    /** Resource being accessed */
    resource: string;
    /** Parameters of the operation */
    parameters?: Record<string, unknown>;
    /** Timestamp of the operation */
    timestamp: Date;
}

/**
 * Context for authentication operations
 */
export interface AuthContext {
    /** ID of the agent requesting authentication */
    agentId: string;
    /** Type of the agent */
    agentType: AgentType;
    /** Current role of the agent */
    role?: ManagerRole;
    /** Current capabilities of the agent */
    capabilities: string[];
    /** Additional metadata about the agent */
    metadata?: Record<string, unknown>;
}

/**
 * Result of an authentication operation
 */
export interface AuthResult {
    /** Status of the authentication */
    status: AuthStatus;
    /** Token if authentication was successful */
    token?: string;
    /** Error message if authentication failed */
    error?: string;
    /** Expiration time of the token */
    expiresAt?: Date;
}

/**
 * Interface for security operations in the mesh
 */
export interface ISecurityManager {
    /**
     * Authenticates an agent
     * @param context Authentication context
     * @returns Promise that resolves to the authentication result
     */
    authenticate(context: AuthContext): Promise<AuthResult>;
    
    /**
     * Authorizes an operation
     * @param operation Operation to authorize
     * @param token Authentication token
     * @returns Promise that resolves to whether the operation is authorized
     */
    authorize(operation: Operation, token: string): Promise<boolean>;
    
    /**
     * Validates an authentication token
     * @param token Token to validate
     * @returns Promise that resolves to whether the token is valid
     */
    validateToken(token: string): Promise<boolean>;
    
    /**
     * Revokes an authentication token
     * @param token Token to revoke
     * @returns Promise that resolves when the token is revoked
     */
    revokeToken(token: string): Promise<void>;
} 