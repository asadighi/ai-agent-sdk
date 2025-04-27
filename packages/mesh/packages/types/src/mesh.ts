import { IManagerAgent, IWorkerAgent, IAgent, AgentConfig, AgentInfo } from './agent';

/**
 * Represents the current status of the mesh network
 */
export enum MeshStatus {
    /** The mesh is fully operational */
    ACTIVE = 'ACTIVE',
    /** The mesh is not operational */
    INACTIVE = 'INACTIVE',
    /** The mesh is partially operational with some degraded functionality */
    DEGRADED = 'DEGRADED',
    /** The mesh is recovering from a failure state */
    RECOVERING = 'RECOVERING'
}

/**
 * Represents the complete topology of the mesh network
 */
export interface MeshTopology {
    /** Unique identifier for the topology snapshot */
    id: string;
    /** List of manager agents in the mesh */
    managers: IManagerAgent[];
    /** List of worker agents in the mesh */
    workers: IWorkerAgent[];
    /** List of active connections between agents */
    connections: Connection[];
    /** Timestamp of the last topology update */
    lastUpdated: Date;
}

/**
 * Represents a connection between two agents in the mesh
 */
export interface Connection {
    /** ID of the source agent */
    sourceId: string;
    /** ID of the target agent */
    targetId: string;
    /** Type of connection between agents */
    type: ConnectionType;
    /** Current status of the connection */
    status: ConnectionStatus;
    /** Timestamp of the last heartbeat received */
    lastHeartbeat: Date;
}

/**
 * Types of connections that can exist in the mesh
 */
export enum ConnectionType {
    /** Connection between two manager agents */
    MANAGER_TO_MANAGER = 'MANAGER_TO_MANAGER',
    /** Connection from a manager to a worker */
    MANAGER_TO_WORKER = 'MANAGER_TO_WORKER',
    /** Connection from a worker to a manager */
    WORKER_TO_MANAGER = 'WORKER_TO_MANAGER'
}

/**
 * Possible states of a connection
 */
export enum ConnectionStatus {
    /** Connection is active and healthy */
    ACTIVE = 'ACTIVE',
    /** Connection is inactive */
    INACTIVE = 'INACTIVE',
    /** Connection is degraded but still functional */
    DEGRADED = 'DEGRADED'
}

/**
 * Core interface for managing the mesh network
 */
export interface IMesh {
    /** Unique identifier of the mesh */
    readonly id: string;
    /** Current status of the mesh */
    readonly status: MeshStatus;
    /** Current topology of the mesh */
    readonly topology: MeshTopology;
    /** List of manager agents */
    readonly managers: IManagerAgent[];
    /** List of worker agents */
    readonly workers: IWorkerAgent[];
    
    /**
     * Adds a new agent to the mesh
     * @param config Configuration for the new agent
     * @returns Promise that resolves to the created agent
     */
    addAgent(config: AgentConfig): Promise<IAgent>;
    
    /**
     * Removes an agent from the mesh
     * @param agentId ID of the agent to remove
     * @returns Promise that resolves when the agent is removed
     */
    removeAgent(agentId: string): Promise<void>;
    
    /**
     * Retrieves an agent by its ID
     * @param agentId ID of the agent to retrieve
     * @returns Promise that resolves to the agent
     */
    getAgent(agentId: string): Promise<IAgent>;
    
    /**
     * Gets the current status of the mesh
     * @returns Promise that resolves to the mesh status
     */
    getStatus(): Promise<MeshStatus>;
}

/**
 * Interface for managing the mesh network's leadership and topology
 */
export interface IMeshManager {
    /**
     * Initiates a leader election process
     * @returns Promise that resolves when the election is complete
     */
    electLeader(): Promise<void>;
    
    /**
     * Handles the failure of the current leader
     * @returns Promise that resolves when the failure is handled
     */
    handleLeaderFailure(): Promise<void>;
    
    /**
     * Manages a specific agent in the mesh
     * @param agent The agent to manage
     * @returns Promise that resolves when the agent is managed
     */
    manageAgent(agent: IAgent): Promise<void>;
    
    /**
     * Updates the mesh topology
     * @returns Promise that resolves when the topology is updated
     */
    updateTopology(): Promise<void>;
}

/**
 * Configuration for leader election process
 */
export interface ElectionConfig {
    /** Timeout for election process in milliseconds */
    electionTimeout: number;
    /** Timeout for heartbeat messages in milliseconds */
    heartbeatTimeout: number;
    /** Minimum time between elections in milliseconds */
    minElectionTimeout: number;
    /** Maximum time between elections in milliseconds */
    maxElectionTimeout: number;
}

/**
 * Current state of the leader election process
 */
export interface ElectionState {
    /** Current term number */
    currentTerm: number;
    /** ID of the voted-for candidate */
    votedFor?: string;
    /** ID of the current leader */
    leaderId?: string;
    /** Whether this agent is a candidate */
    isCandidate: boolean;
    /** Last time a heartbeat was received */
    lastHeartbeatTime: Date;
    /** Last time an election was started */
    lastElectionTime: Date;
}

/**
 * Interface for mesh client operations
 */
export interface IMeshClient {
    /** Unique identifier of the client */
    readonly id: string;
    /** Current status of the client */
    readonly status: MeshStatus;
    
    /**
     * Connects to the mesh network
     * @returns Promise that resolves when connected
     */
    connect(): Promise<void>;
    
    /**
     * Disconnects from the mesh network
     * @returns Promise that resolves when disconnected
     */
    disconnect(): Promise<void>;
    
    /**
     * Gets information about an agent
     * @param agentId ID of the agent to get info about
     * @returns Promise that resolves to the agent info
     */
    getAgentInfo(agentId: string): Promise<AgentInfo>;
    
    /**
     * Gets the current election configuration
     * @returns Promise that resolves to the election config
     */
    getElectionConfig(): Promise<ElectionConfig>;
    
    /**
     * Gets the current election state
     * @returns Promise that resolves to the election state
     */
    getElectionState(): Promise<ElectionState>;
    
    /**
     * Updates the election configuration
     * @param config New election configuration
     * @returns Promise that resolves when the config is updated
     */
    updateElectionConfig(config: ElectionConfig): Promise<void>;
    
    /**
     * Starts a new election
     * @returns Promise that resolves when the election is started
     */
    startElection(): Promise<void>;
    
    /**
     * Votes for a candidate in the election
     * @param candidateId ID of the candidate to vote for
     * @param term Term number of the election
     * @returns Promise that resolves when the vote is cast
     */
    voteForCandidate(candidateId: string, term: number): Promise<void>;
} 