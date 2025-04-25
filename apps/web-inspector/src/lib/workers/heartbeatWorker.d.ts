interface HeartbeatData {
    id: string;
    timestamp: number;
    role: string;
    status: string;
    term: number;
    fencingToken: string;
}
interface ProcessedHeartbeat {
    agentId: string;
    timestamp: number;
    role: string;
    status: string;
    term: number;
    fencingToken: string;
}
interface WorkerMessage {
    meshId: string;
    heartbeats: HeartbeatData[];
}
interface WorkerResponse {
    meshId: string;
    heartbeats: {
        [key: string]: ProcessedHeartbeat;
    };
    staleAgents: string[];
}
declare const STALE_THRESHOLD = 3000;
declare const NEW_AGENT_GRACE_PERIOD = 1000;
//# sourceMappingURL=heartbeatWorker.d.ts.map