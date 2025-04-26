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