import { AgentStatus, AgentState } from './agent';
import { MeshTopology } from './mesh';

/**
 * Types of messages that can be sent between agents
 */
export enum MessageType {
    /** Heartbeat message to indicate agent is alive */
    HEARTBEAT = 'HEARTBEAT',
    /** State update message */
    STATE_UPDATE = 'STATE_UPDATE',
    /** Task assignment message */
    TASK_ASSIGNMENT = 'TASK_ASSIGNMENT',
    /** Task completion message */
    TASK_COMPLETION = 'TASK_COMPLETION',
    /** Error message */
    ERROR = 'ERROR',
    /** Leader election message */
    LEADER_ELECTION = 'LEADER_ELECTION',
    /** Leader heartbeat message */
    LEADER_HEARTBEAT = 'LEADER_HEARTBEAT',
    /** Follower heartbeat message */
    FOLLOWER_HEARTBEAT = 'FOLLOWER_HEARTBEAT'
}

/**
 * Base interface for all messages in the mesh
 */
export interface BaseMessage {
    /** Unique identifier for the message */
    id: string;
    /** Type of the message */
    type: MessageType;
    /** ID of the sender agent */
    senderId: string;
    /** ID of the recipient agent */
    recipientId: string;
    /** Timestamp when the message was created */
    timestamp: Date;
    /** Additional metadata about the message */
    metadata?: Record<string, unknown>;
}

/**
 * Message containing a heartbeat from an agent
 */
export interface HeartbeatMessage extends BaseMessage {
    /** Type is always HEARTBEAT */
    type: MessageType.HEARTBEAT;
    /** Current status of the agent */
    status: AgentStatus;
    /** Current capabilities of the agent */
    capabilities: string[];
}

/**
 * Message containing a state update from an agent
 */
export interface StateUpdateMessage extends BaseMessage {
    /** Type is always STATE_UPDATE */
    type: MessageType.STATE_UPDATE;
    /** New state of the agent */
    state: AgentState;
}

/**
 * Message assigning a task to an agent
 */
export interface TaskAssignmentMessage extends BaseMessage {
    /** Type is always TASK_ASSIGNMENT */
    type: MessageType.TASK_ASSIGNMENT;
    /** ID of the task being assigned */
    taskId: string;
    /** Description of the task */
    taskDescription: string;
    /** Priority of the task */
    priority: number;
    /** Deadline for task completion */
    deadline?: Date;
    /** Additional task parameters */
    parameters?: Record<string, unknown>;
}

/**
 * Message indicating task completion
 */
export interface TaskCompletionMessage extends BaseMessage {
    /** Type is always TASK_COMPLETION */
    type: MessageType.TASK_COMPLETION;
    /** ID of the completed task */
    taskId: string;
    /** Result of the task execution */
    result: unknown;
    /** Any errors that occurred during execution */
    error?: string;
}

/**
 * Message containing an error
 */
export interface ErrorMessage extends BaseMessage {
    /** Type is always ERROR */
    type: MessageType.ERROR;
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Stack trace if available */
    stack?: string;
}

/**
 * Message for leader election process
 */
export interface LeaderElectionMessage extends BaseMessage {
    /** Type is always LEADER_ELECTION */
    type: MessageType.LEADER_ELECTION;
    /** Term number for the election */
    term: number;
    /** ID of the candidate agent */
    candidateId: string;
    /** Last log index of the candidate */
    lastLogIndex: number;
    /** Last log term of the candidate */
    lastLogTerm: number;
}

/**
 * Message containing a heartbeat from the leader
 */
export interface LeaderHeartbeatMessage extends BaseMessage {
    /** Type is always LEADER_HEARTBEAT */
    type: MessageType.LEADER_HEARTBEAT;
    /** Current term number */
    term: number;
    /** ID of the leader agent */
    leaderId: string;
    /** Last committed log index */
    lastCommittedIndex: number;
}

/**
 * Message containing a heartbeat from a follower
 */
export interface FollowerHeartbeatMessage extends BaseMessage {
    /** Type is always FOLLOWER_HEARTBEAT */
    type: MessageType.FOLLOWER_HEARTBEAT;
    /** Current term number */
    term: number;
    /** ID of the follower agent */
    followerId: string;
    /** Last log index of the follower */
    lastLogIndex: number;
}

/**
 * Union type of all possible agent messages
 */
export type AgentMessage = 
    | HeartbeatMessage
    | StateUpdateMessage
    | TaskAssignmentMessage
    | TaskCompletionMessage
    | ErrorMessage
    | LeaderElectionMessage
    | LeaderHeartbeatMessage
    | FollowerHeartbeatMessage; 