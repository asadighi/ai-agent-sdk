import { AgentStatus } from '@ai-agent/core-sdk';
export class WorkerMeshStore {
    constructor(meshStore, meshId, agentId, role) {
        this.heartbeatCallbacks = new Map();
        this.electionCallbacks = new Map();
        this.unsubscribeHeartbeats = null;
        this.unsubscribeElections = null;
        this.currentAgentId = null;
        this.meshStore = meshStore;
        this.meshId = meshId;
        this.agentId = agentId;
        this.role = role;
        this.status = AgentStatus.Offline;
        this.currentAgentId = agentId;
        this.initializeWorkers();
    }
    initializeWorkers() {
        // Initialize heartbeat worker
        this.heartbeatWorker = new Worker(new URL('./workers/heartbeatWorker.ts', import.meta.url));
        this.heartbeatWorker.onmessage = (e) => {
            const { meshId: workerMeshId, heartbeats, staleAgents } = e.data;
            const callbacks = this.heartbeatCallbacks.get(workerMeshId) || [];
            // Convert the plain object back to a Map
            const heartbeatMap = new Map(Object.entries(heartbeats));
            callbacks.forEach(cb => cb(heartbeatMap));
            // Clean up stale agents if necessary
            if (staleAgents.length > 0) {
                this.cleanupStaleAgents(workerMeshId, new Set(staleAgents));
            }
        };
        // Initialize election worker
        this.electionWorker = new Worker(new URL('./workers/electionWorker.ts', import.meta.url));
        this.electionWorker.onmessage = (e) => {
            const { meshId, messages } = e.data;
            const callbacks = this.electionCallbacks.get(meshId) || [];
            callbacks.forEach(callback => callback(new Map(Object.entries(messages))));
        };
    }
    async initialize() {
        // Register the agent
        await this.meshStore.registerAgent({
            meshId: this.meshId,
            agentId: this.agentId,
            role: this.role,
            status: this.status
        });
        // Subscribe to heartbeats
        this.unsubscribeHeartbeats = this.meshStore.subscribeToHeartbeats(this.meshId, (heartbeats) => {
            if (this.heartbeatWorker) {
                this.heartbeatWorker.postMessage({
                    meshId: this.meshId,
                    heartbeats: Array.from(heartbeats.entries()).map(([id, hb]) => ({
                        id,
                        ...hb
                    })),
                    currentAgentId: this.currentAgentId
                });
            }
        });
        // Subscribe to election messages
        this.unsubscribeElections = this.meshStore.subscribeToElectionMessages(this.meshId, (messages) => {
            if (this.electionWorker) {
                this.electionWorker.postMessage({
                    meshId: this.meshId,
                    messages: Array.from(messages.entries()).map(([id, msg]) => ({
                        id,
                        ...msg
                    }))
                });
            }
        });
    }
    async cleanupStaleAgents(meshId, staleAgents) {
        for (const agentId of staleAgents) {
            try {
                await this.meshStore.updateAgentStatus(meshId, agentId, AgentStatus.Offline);
            }
            catch (error) {
                console.error(`Error cleaning up stale agent ${agentId}:`, error);
            }
        }
    }
    async cleanup() {
        if (this.unsubscribeHeartbeats) {
            this.unsubscribeHeartbeats();
        }
        if (this.unsubscribeElections) {
            this.unsubscribeElections();
        }
        if (this.heartbeatWorker) {
            this.heartbeatWorker.terminate();
        }
        if (this.electionWorker) {
            this.electionWorker.terminate();
        }
        await this.meshStore.cleanup();
    }
    async updateAgentStatus(status) {
        this.status = status;
        await this.meshStore.updateAgentStatus(this.meshId, this.agentId, status);
    }
    async updateAgentRole(role) {
        this.role = role;
        await this.meshStore.updateAgentRole(this.meshId, this.agentId, role);
    }
    async getAgentStatuses() {
        return this.meshStore.getAgentStatuses(this.meshId);
    }
    subscribeToHeartbeats(meshId, callback) {
        if (!this.heartbeatCallbacks.has(meshId)) {
            this.heartbeatCallbacks.set(meshId, []);
        }
        this.heartbeatCallbacks.get(meshId).push(callback);
        return () => {
            const callbacks = this.heartbeatCallbacks.get(meshId) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                this.heartbeatCallbacks.delete(meshId);
            }
        };
    }
    subscribeToElectionMessages(meshId, callback) {
        if (!this.electionCallbacks.has(meshId)) {
            this.electionCallbacks.set(meshId, []);
        }
        this.electionCallbacks.get(meshId).push(callback);
        return () => {
            const callbacks = this.electionCallbacks.get(meshId) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                this.electionCallbacks.delete(meshId);
            }
        };
    }
}
//# sourceMappingURL=workerMeshStore.js.map