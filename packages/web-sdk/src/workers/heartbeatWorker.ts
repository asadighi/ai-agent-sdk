import { Heartbeat } from '@ai-agent/core-sdk';

interface HeartbeatMessage {
    meshId: string;
    heartbeats: Array<{
        id: string;
        timestamp: number;
        agentId: string;
        meshId: string;
    }>;
    currentAgentId: string | null;
}

const STALE_THRESHOLD = 30000; // 30 seconds
const heartbeatStates = new Map<string, Map<string, Heartbeat>>();

self.onmessage = (e: MessageEvent<HeartbeatMessage>) => {
    const { meshId, heartbeats, currentAgentId } = e.data;
    
    // Initialize or get the heartbeat state for this mesh
    if (!heartbeatStates.has(meshId)) {
        heartbeatStates.set(meshId, new Map());
    }
    const meshHeartbeats = heartbeatStates.get(meshId)!;

    // Update heartbeats
    heartbeats.forEach(hb => {
        meshHeartbeats.set(hb.id, {
            timestamp: hb.timestamp,
            agentId: hb.agentId,
            meshId: hb.meshId
        });
    });

    // Check for stale heartbeats
    const now = Date.now();
    const staleAgents = new Set<string>();
    
    meshHeartbeats.forEach((hb, id) => {
        if (now - hb.timestamp > STALE_THRESHOLD && hb.agentId !== currentAgentId) {
            staleAgents.add(hb.agentId);
            meshHeartbeats.delete(id);
        }
    });

    // Send updated state back to main thread
    self.postMessage({
        meshId,
        heartbeats: Object.fromEntries(meshHeartbeats),
        staleAgents: Array.from(staleAgents)
    });
}; 