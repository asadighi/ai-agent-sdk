import { FirebaseFirestoreClient } from './fireStoreClient.js';
import { AgentRole, AgentStatus, Heartbeat, ElectionMessage } from './types.js';
import { validateRole, validateAgentConfig, ValidationError } from './validation.js';

export class Agent {
    private config: {
        meshId: string;
        agentId: string;
        role: AgentRole;
        status: AgentStatus;
        heartbeatInterval: number;
        electionInterval: number;
        maxElectionTimeout: number;
        isInitialLeader: boolean;
    };
    private client: FirebaseFirestoreClient;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private electionInterval: NodeJS.Timeout | null = null;

    constructor(config: {
        meshId: string;
        agentId: string;
        role?: AgentRole;
        status?: AgentStatus;
        heartbeatInterval?: number;
        electionInterval?: number;
        maxElectionTimeout?: number;
        isInitialLeader?: boolean;
    }) {
        this.config = {
            meshId: config.meshId,
            agentId: config.agentId,
            role: config.role || AgentRole.Worker,
            status: config.status || AgentStatus.Offline,
            heartbeatInterval: config.heartbeatInterval || 5000,
            electionInterval: config.electionInterval || 10000,
            maxElectionTimeout: config.maxElectionTimeout || 30000,
            isInitialLeader: config.isInitialLeader || false
        };
        this.client = FirebaseFirestoreClient.getInstance();
    }

    async start() {
        try {
            // Register the agent
            await this.client.registerAgent({
                meshId: this.config.meshId,
                agentId: this.config.agentId,
                role: this.config.role
            });

            // Set up heartbeat interval
            this.heartbeatInterval = setInterval(async () => {
                const heartbeat: Heartbeat = {
                    agentId: this.config.agentId,
                    timestamp: Date.now(),
                    role: this.config.role,
                    status: this.config.status,
                    term: 0,
                    fencingToken: Date.now().toString()
                };
                await this.client.updateHeartbeat(this.config.meshId, heartbeat);
            }, this.config.heartbeatInterval);

            // Set up election interval
            this.electionInterval = setInterval(async () => {
                const agentStatuses = await this.client.getAgentStatuses(this.config.meshId);
                const leaderStatus = Array.from(agentStatuses.values()).find(status => status.role === AgentRole.Leader);
                
                if (!leaderStatus) {
                    const message: ElectionMessage = {
                        timestamp: new Date(),
                        type: 'request_vote',
                        candidateId: this.config.agentId,
                        term: 0,
                        lastLogIndex: 0,
                        lastLogTerm: 0
                    };
                    await this.client.sendElectionMessage(this.config.meshId, message);
                }
            }, this.config.electionInterval);

            // Subscribe to heartbeats
            this.client.subscribeToHeartbeats(this.config.meshId, (heartbeats: Map<string, Heartbeat>) => {
                heartbeats.forEach(heartbeat => {
                    if (heartbeat.agentId !== this.config.agentId) {
                        console.log(`Received heartbeat from ${heartbeat.agentId}`);
                    }
                });
            });

            // Subscribe to election messages
            this.client.subscribeToElectionMessages(this.config.meshId, (messages: Map<string, ElectionMessage>) => {
                messages.forEach(message => {
                    if (message.candidateId !== this.config.agentId) {
                        console.log(`Received election message from ${message.candidateId}`);
                    }
                });
            });

            // Update status to Active
            this.config.status = AgentStatus.Active;
            await this.client.updateAgentStatus(this.config.meshId, this.config.agentId, this.config.status);
        } catch (error) {
            console.error('Error starting agent:', error);
            throw error;
        }
    }

    async stop() {
        try {
            // Update status to Offline
            this.config.status = AgentStatus.Offline;
            await this.client.updateAgentStatus(this.config.meshId, this.config.agentId, this.config.status);

            // Clear intervals
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            if (this.electionInterval) {
                clearInterval(this.electionInterval);
                this.electionInterval = null;
            }

            // Clean up subscriptions
            await this.client.cleanup();
        } catch (error) {
            console.error('Error stopping agent:', error);
            throw error;
        }
    }

    async cleanup(): Promise<void> {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.electionInterval) clearInterval(this.electionInterval);
        await this.client.cleanup();
    }

    healthCheck() {
        return {
            status: "healthy",
            role: this.config.role,
            meshId: this.config.meshId,
            agentId: this.config.agentId,
            lastHeartbeat: Date.now(),
            term: 0,  // Default term
            fencingToken: Date.now().toString()  // Generate a new fencing token
        };
    }
}