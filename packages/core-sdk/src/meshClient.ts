import { IMeshStore, MeshClient as IMeshClient, AgentRole, AgentStatus, Heartbeat, PresenceStatus, ElectionMessage, Agent } from './types.js';
import { FirebaseMeshStore } from './firebaseMeshStore.js';
import { IFirebaseConfig } from './firebaseConfig.js';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

export class MeshClient implements IMeshStore, IMeshClient {
    private static instance: MeshClient | null = null;
    private app!: FirebaseApp;
    private db!: Firestore;
    private auth: Auth | null = null;
    private store!: IMeshStore;
    private agentId: string;

    constructor(config: IFirebaseConfig, agentId: string = 'default-agent') {
        this.agentId = agentId;
        this.store = FirebaseMeshStore.getInstance(config, agentId);
        
        if (MeshClient.instance) {
            return MeshClient.instance;
        }

        this.app = initializeApp(config);
        this.db = getFirestore(this.app);
        MeshClient.instance = this;
    }

    static getInstance(config: IFirebaseConfig, agentId: string = 'default-agent'): MeshClient {
        if (!MeshClient.instance) {
            MeshClient.instance = new MeshClient(config, agentId);
        }
        return MeshClient.instance;
    }

    public getDb(): Firestore {
        return this.db;
    }

    // IMeshStore methods
    async registerAgent(agent: { meshId: string; agentId: string; role: AgentRole; status: AgentStatus }): Promise<{ meshId: string; agentId: string }> {
        return this.store.registerAgent(agent);
    }

    async updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void> {
        const agentRef = doc(this.db, 'meshes', meshId, 'agents', agentId);
        await updateDoc(agentRef, {
            status,
            lastSeen: Timestamp.now()
        });
    }

    async updateAgentRole(meshId: string, agentId: string, role: AgentRole): Promise<void> {
        const agentRef = doc(this.db, 'meshes', meshId, 'agents', agentId);
        await updateDoc(agentRef, {
            role,
            lastSeen: Timestamp.now()
        });
    }

    async updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void> {
        await this.store.updateHeartbeat(meshId, heartbeat);
    }

    async getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>> {
        return this.store.getAgentStatuses(meshId);
    }

    subscribeToHeartbeats(meshId: string, callback: (heartbeats: Map<string, Heartbeat>) => void): () => void {
        return this.store.subscribeToHeartbeats(meshId, callback);
    }

    subscribeToElectionMessages(meshId: string, callback: (messages: Map<string, ElectionMessage>) => void): () => void {
        return this.store.subscribeToElectionMessages(meshId, callback);
    }

    async sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void> {
        await this.store.sendElectionMessage(meshId, message);
    }

    async cleanup(): Promise<void> {
        await this.store.cleanup();
    }

    // MeshClient interface methods
    async getLeader(meshId: string): Promise<Agent | null> {
        const statuses = await this.getAgentStatuses(meshId);
        const leaderStatus = Array.from(statuses.values()).find(status => status.role === AgentRole.Manager);
        if (!leaderStatus) return null;
        return {
            meshId,
            agentId: leaderStatus.agentId,
            role: leaderStatus.role,
            status: leaderStatus.status,
            lastHeartbeat: leaderStatus.lastSeen
        };
    }

    async getAgentCount(meshId: string): Promise<number> {
        const statuses = await this.getAgentStatuses(meshId);
        return statuses.size;
    }

    async updateAgent(agent: { meshId: string; agentId: string; role: AgentRole; status: AgentStatus }): Promise<void> {
        await this.updateAgentStatus(agent.meshId, agent.agentId, agent.status);
    }

    async getAgents(meshId: string): Promise<Map<string, Agent>> {
        const statuses = await this.getAgentStatuses(meshId);
        const agents = new Map<string, Agent>();
        for (const [agentId, status] of statuses) {
            agents.set(agentId, {
                meshId,
                agentId,
                role: status.role,
                status: status.status,
                lastHeartbeat: status.lastSeen
            });
        }
        return agents;
    }
} 