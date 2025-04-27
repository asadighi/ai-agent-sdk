import { AgentMessage } from './messages';

/**
 * Types of agents that can exist in the mesh
 */
export enum AgentType {
    /** Worker agent that performs tasks */
    WORKER = 'WORKER',
    /** Manager agent that coordinates the mesh */
    MANAGER = 'MANAGER'
}

/**
 * Current status of an agent
 */
export enum AgentStatus {
    /** Agent is online and operational */
    ONLINE = 'ONLINE',
    /** Agent is offline */
    OFFLINE = 'OFFLINE',
    /** Agent is busy processing tasks */
    BUSY = 'BUSY',
    /** Agent is recovering from a failure */
    RECOVERING = 'RECOVERING',
    /** Agent is degraded but still functional */
    DEGRADED = 'DEGRADED'
}

/**
 * Roles that a manager agent can have
 */
export enum ManagerRole {
    /** Leader of the mesh network */
    LEADER = 'LEADER',
    /** Follower in the mesh network */
    FOLLOWER = 'FOLLOWER',
    /** Candidate in a leader election */
    CANDIDATE = 'CANDIDATE'
}

/**
 * Configuration for creating a new agent
 */
export interface AgentConfig {
    /** Unique identifier for the agent */
    id: string;
    /** Type of agent to create */
    type: AgentType;
    /** Display name of the agent */
    name: string;
    /** List of capabilities the agent supports */
    capabilities: string[];
    /** Additional metadata about the agent */
    metadata?: Record<string, unknown>;
}

/**
 * Current state of an agent
 */
export interface AgentState {
    /** ID of the agent this state belongs to */
    id: string;
    /** Version number of the state */
    version: number;
    /** State data */
    data: Record<string, unknown>;
    /** Timestamp of the last state update */
    lastUpdated: Date;
}

/**
 * Base interface for all agents in the mesh
 */
export interface IAgent {
    /** Unique identifier of the agent */
    readonly id: string;
    /** Process ID of the agent */
    readonly processId: string;
    /** Type of the agent */
    readonly type: AgentType;
    /** Current status of the agent */
    readonly status: AgentStatus;
    
    /**
     * Starts the agent
     * @returns Promise that resolves when the agent is started
     */
    start(): Promise<void>;
    
    /**
     * Stops the agent
     * @returns Promise that resolves when the agent is stopped
     */
    stop(): Promise<void>;
    
    /**
     * Publishes a heartbeat to indicate the agent is alive
     * @returns Promise that resolves when the heartbeat is published
     */
    publishHeartbeat(): Promise<void>;
    
    /**
     * Updates the agent's state
     * @param state New state to set
     * @returns Promise that resolves when the state is updated
     */
    updateState(state: AgentState): Promise<void>;
    
    /**
     * Gets the current state of the agent
     * @returns Promise that resolves to the agent's state
     */
    getState(): Promise<AgentState>;
}

/**
 * Interface for worker agents in the mesh
 */
export interface IWorkerAgent extends IAgent {
    /** Manager agent that this worker is assigned to */
    readonly manager: IManagerAgent;
    
    /**
     * Sends a message to the assigned manager
     * @param message Message to send
     * @returns Promise that resolves when the message is sent
     */
    sendToManager(message: AgentMessage): Promise<void>;
}

/**
 * Interface for manager agents in the mesh
 */
export interface IManagerAgent extends IAgent {
    /** Current role of the manager */
    readonly role: ManagerRole;
    /** List of follower managers */
    readonly followers: IManagerAgent[];
    
    /**
     * Handles a message from a worker agent
     * @param message Message to handle
     * @returns Promise that resolves when the message is handled
     */
    handleWorkerMessage(message: AgentMessage): Promise<void>;
    
    /**
     * Handles a message from another manager agent
     * @param message Message to handle
     * @returns Promise that resolves when the message is handled
     */
    handleManagerMessage(message: AgentMessage): Promise<void>;
}

/**
 * Information about an agent
 */
export interface AgentInfo {
    /** Unique identifier of the agent */
    id: string;
    /** Display name of the agent */
    name: string;
    /** Current status of the agent */
    status: AgentStatus;
    /** List of capabilities the agent supports */
    capabilities: string[];
    /** Additional metadata about the agent */
    metadata?: Record<string, unknown>;
} 