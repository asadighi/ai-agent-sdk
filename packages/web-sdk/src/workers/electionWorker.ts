import { ElectionMessage } from '@ai-agent/core-sdk';

interface ElectionWorkerMessage {
    meshId: string;
    messages: Array<{
        id: string;
        timestamp: number;
        agentId: string;
        meshId: string;
        term: number;
        type: 'RequestVote' | 'VoteResponse';
        granted: boolean;
    }>;
}

const MESSAGE_EXPIRY = 60000; // 60 seconds
const electionStates = new Map<string, Map<string, ElectionMessage>>();

self.onmessage = (e: MessageEvent<ElectionWorkerMessage>) => {
    const { meshId, messages } = e.data;
    
    // Initialize or get the election state for this mesh
    if (!electionStates.has(meshId)) {
        electionStates.set(meshId, new Map());
    }
    const meshElections = electionStates.get(meshId)!;

    // Update election messages
    messages.forEach(msg => {
        meshElections.set(msg.id, {
            timestamp: msg.timestamp,
            agentId: msg.agentId,
            meshId: msg.meshId,
            term: msg.term,
            type: msg.type,
            granted: msg.granted
        });
    });

    // Clean up expired messages
    const now = Date.now();
    meshElections.forEach((msg, id) => {
        if (now - msg.timestamp > MESSAGE_EXPIRY) {
            meshElections.delete(id);
        }
    });

    // Send updated state back to main thread
    self.postMessage({
        meshId,
        messages: Object.fromEntries(meshElections)
    });
}; 