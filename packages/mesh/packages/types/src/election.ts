export interface ElectionConfig {
    electionTimeoutMs: number;
    heartbeatIntervalMs: number;
}

export interface ElectionState {
    term: number;
    leaderId: string | null;
    votedFor: string | null;
}

export enum ElectionRole {
    FOLLOWER = 'FOLLOWER',
    CANDIDATE = 'CANDIDATE',
    LEADER = 'LEADER'
} 