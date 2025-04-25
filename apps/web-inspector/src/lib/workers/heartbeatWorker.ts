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
    heartbeats: { [key: string]: ProcessedHeartbeat };
    staleAgents: string[];
}

const STALE_THRESHOLD = 3000;
const NEW_AGENT_GRACE_PERIOD = 1000;

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
    try {
        const { meshId, heartbeats } = e.data;
        const processedHeartbeats: { [key: string]: ProcessedHeartbeat } = {};
        const staleAgents = new Set<string>();
        const now = Date.now();

        for (const heartbeat of heartbeats) {
            const isNewAgent = now - heartbeat.timestamp < NEW_AGENT_GRACE_PERIOD;
            
            if (!isNewAgent && now - heartbeat.timestamp > STALE_THRESHOLD) {
                staleAgents.add(heartbeat.id);
                continue;
            }

            processedHeartbeats[heartbeat.id] = {
                agentId: heartbeat.id,
                timestamp: heartbeat.timestamp,
                role: heartbeat.role,
                status: heartbeat.status,
                term: heartbeat.term,
                fencingToken: heartbeat.fencingToken
            };
        }

        const response: WorkerResponse = {
            meshId,
            heartbeats: processedHeartbeats,
            staleAgents: Array.from(staleAgents)
        };

        self.postMessage(response);
    } catch (error) {
        console.error('Error in heartbeat worker:', error);
        const response: WorkerResponse = {
            meshId: e.data.meshId,
            heartbeats: {},
            staleAgents: []
        };
        self.postMessage(response);
    }
}; 