import { IStorageClient } from '@ai-agent/common-sdk';
import { AgentRole, AgentStatus, Heartbeat, PresenceStatus, ElectionMessage, Agent } from '@ai-agent/common-sdk';

export class MeshClient {
    private static instance: MeshClient | null = null;
    private store: IStorageClient;
    private agentId: string;

    constructor(store: IStorageClient, agentId: string = 'default-agent') {
        this.agentId = agentId;
        this.store = store;
        
        if (MeshClient.instance) {
            return MeshClient.instance;
        }

        MeshClient.instance = this;
    }

    static getInstance(store: IStorageClient, agentId: string = 'default-agent'): MeshClient {
        if (!MeshClient.instance) {
            MeshClient.instance = new MeshClient(store, agentId);
        }
        return MeshClient.instance;
    }

    // Storage methods
    async registerAgent(agent: { meshId: string; agentId: string; role: AgentRole; status: AgentStatus }): Promise<{ meshId: string; agentId: string }> {
        await this.store.registerAgent(agent);
        return { meshId: agent.meshId, agentId: agent.agentId };
    }

    async updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void> {
        await this.store.updateAgentStatus(meshId, agentId, status);
    }

    async updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void> {
        await this.store.updateHeartbeat(meshId, heartbeat);
    }

    async getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>> {
        return this.store.getAgentStatuses(meshId);
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
        await this.store.updateAgentStatus(agent.meshId, agent.agentId, agent.status);
    }

    async getAgents(meshId: string): Promise<Map<string, Agent>> {
        const statuses = await this.getAgentStatuses(meshId);
        const agents = new Map<string, Agent>();
        statuses.forEach((status, agentId) => {
            agents.set(agentId, {
                meshId,
                agentId,
                role: status.role,
                status: status.status,
                lastHeartbeat: status.lastSeen
            });
        });
        return agents;
    }
} 