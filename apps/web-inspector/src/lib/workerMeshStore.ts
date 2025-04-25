import { FirebaseMeshStore, Heartbeat, ElectionMessage, AgentStatus, AgentRole } from '@ai-agent/core-sdk';

export class WorkerMeshStore {
    private meshStore: FirebaseMeshStore;
    private heartbeatWorker!: Worker;
    private electionWorker!: Worker;
    private heartbeatCallbacks: Map<string, ((heartbeats: Map<string, Heartbeat>) => void)[]> = new Map();
    private electionCallbacks: Map<string, ((messages: Map<string, ElectionMessage>) => void)[]> = new Map();
    private meshId: string;
    private agentId: string;
    private role: AgentRole;
    private status: AgentStatus;
    private unsubscribeHeartbeats: (() => void) | null = null;
    private unsubscribeElections: (() => void) | null = null;
    private currentAgentId: string | null = null;

    constructor(meshStore: FirebaseMeshStore, meshId: string, agentId: string, role: AgentRole) {
        this.meshStore = meshStore;
        this.meshId = meshId;
        this.agentId = agentId;
        this.role = role;
        this.status = AgentStatus.Offline;
        this.currentAgentId = agentId;
        this.initializeWorkers();
    }

    private initializeWorkers() {
        // Initialize heartbeat worker
        this.heartbeatWorker = new Worker(new URL('./workers/heartbeatWorker.ts', import.meta.url));
        this.heartbeatWorker.onmessage = (e: MessageEvent<{ meshId: string; heartbeats: { [key: string]: Heartbeat }; staleAgents: string[] }>) => {
            const { meshId: workerMeshId, heartbeats, staleAgents } = e.data;
            const callbacks = this.heartbeatCallbacks.get(workerMeshId) || [];
            
            // Convert the plain object back to a Map
            const heartbeatMap = new Map<string, Heartbeat>(Object.entries(heartbeats));
            callbacks.forEach(cb => cb(heartbeatMap));
            
            // Clean up stale agents if necessary
            if (staleAgents.length > 0) {
                this.cleanupStaleAgents(workerMeshId, new Set(staleAgents));
            }
        };

        // Initialize election worker
        this.electionWorker = new Worker(new URL('./workers/electionWorker.ts', import.meta.url));
        this.electionWorker.onmessage = (e: MessageEvent<{ meshId: string; messages: { [key: string]: ElectionMessage } }>) => {
            const { meshId, messages } = e.data;
            const callbacks = this.electionCallbacks.get(meshId) || [];
            callbacks.forEach(callback => callback(new Map<string, ElectionMessage>(Object.entries(messages))));
        };
    }

    async initialize(): Promise<void> {
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

    private async cleanupStaleAgents(meshId: string, staleAgents: Set<string>) {
        for (const agentId of staleAgents) {
            try {
                await this.meshStore.updateAgentStatus(meshId, agentId, AgentStatus.Offline);
            } catch (error) {
                console.error(`Error cleaning up stale agent ${agentId}:`, error);
            }
        }
    }

    async cleanup(): Promise<void> {
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

    async updateAgentStatus(status: AgentStatus): Promise<void> {
        this.status = status;
        await this.meshStore.updateAgentStatus(this.meshId, this.agentId, status);
    }

    async updateAgentRole(role: AgentRole): Promise<void> {
        this.role = role;
        await this.meshStore.updateAgentRole(this.meshId, this.agentId, role);
    }

    async getAgentStatuses(): Promise<Map<string, { agentId: string; role: AgentRole; status: AgentStatus; lastSeen: number; fencingToken: string }>> {
        return this.meshStore.getAgentStatuses(this.meshId);
    }

    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void {
        if (!this.heartbeatCallbacks.has(meshId)) {
            this.heartbeatCallbacks.set(meshId, []);
        }
        this.heartbeatCallbacks.get(meshId)!.push(callback);

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

    subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void {
        if (!this.electionCallbacks.has(meshId)) {
            this.electionCallbacks.set(meshId, []);
        }
        this.electionCallbacks.get(meshId)!.push(callback);

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