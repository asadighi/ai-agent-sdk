import { AgentRole, AgentStatus, Heartbeat, PresenceStatus, getMeshClient } from './index.js';
import { v4 as uuidv4 } from 'uuid';
import { IFirebaseConfig } from './firebaseConfig.js';
import { Logger } from '@ai-agent/multi-logger';
import { LogLevel } from './types.js';
import { serverTimestamp } from 'firebase/firestore';

export class Worker {
    private meshId: string;
    private agentId: string;
    private role: AgentRole;
    private status: AgentStatus;
    private firebaseConfig: IFirebaseConfig;
    private client: ReturnType<typeof getMeshClient>;
    private unsubscribe: (() => void) | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private logger: Logger;

    constructor(config: {
        meshId: string;
        agentId: string;
        role: AgentRole;
        status: AgentStatus;
        firebaseConfig: IFirebaseConfig;
    }) {
        this.meshId = config.meshId;
        this.agentId = config.agentId;
        this.role = config.role;
        this.status = config.status;
        this.firebaseConfig = config.firebaseConfig;
        this.client = getMeshClient(this.firebaseConfig);
        this.logger = new Logger({
            logLevel: LogLevel.INFO,
            logToConsole: true,
            maxLogs: 1000,
            rotationInterval: 60000
        });
    }

    async start() {
        this.logger.info(`[WORKER] Starting worker ${this.agentId} in mesh ${this.meshId}...`);

        try {
            await this.client.registerAgent({
                meshId: this.meshId,
                agentId: this.agentId,
                role: this.role,
                status: this.status
            });

            this.unsubscribe = this.client.subscribeToHeartbeats(this.meshId, (heartbeats) => {
                this.handleHeartbeats(heartbeats);
            });

            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeat().catch(error => {
                    this.logger.error(`[WORKER] Error sending heartbeat for worker ${this.agentId}:`, error);
                });
            }, 5000);

            this.logger.info(`[WORKER] Started heartbeat interval for worker ${this.agentId} in mesh ${this.meshId}`);
        } catch (error) {
            this.logger.error(`[WORKER] Error starting worker ${this.agentId} in mesh ${this.meshId}:`, error);
            throw error;
        }
    }

    async stop() {
        this.logger.info(`[WORKER] Stopping worker ${this.agentId} in mesh ${this.meshId}...`);

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        await this.client.updateAgentStatus(this.meshId, this.agentId, AgentStatus.Terminated);

        this.logger.info(`[WORKER] Worker ${this.agentId} stopped successfully in mesh ${this.meshId}`);
    }

    private async handleHeartbeats(heartbeats: Map<string, Heartbeat>) {
        for (const [agentId, heartbeat] of heartbeats) {
            if (agentId === this.agentId) continue;

            if (heartbeat.role === AgentRole.Manager && heartbeat.status === AgentStatus.Active) {
                // Worker is already following the leader, no action needed
                return;
            }
        }
    }

    private async sendHeartbeat() {
        try {
            const heartbeat: Heartbeat = {
                agentId: this.agentId,
                role: AgentRole.Worker,
                status: AgentStatus.Active,
                timestamp: Date.now(),
                term: 0,
                fencingToken: uuidv4()
            };
            await this.client.updateHeartbeat(this.meshId, heartbeat);
        } catch (error) {
            this.logger.error(`[WORKER] Error sending heartbeat for worker ${this.agentId} in mesh ${this.meshId}:`, error);
            throw error;
        }
    }

    async getLeaderStatus(): Promise<PresenceStatus | undefined> {
        const agentStatuses = await this.client.getAgentStatuses(this.meshId);
        return Array.from(agentStatuses.values()).find(status => status.role === AgentRole.Manager);
    }

    async cleanup(): Promise<void> {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        await this.client.cleanup();
    }

    healthCheck() {
        return {
            status: "healthy",
            role: "worker",
            meshId: this.meshId,
            agentId: this.agentId,
            lastHeartbeat: Date.now(),
            term: 0,
            fencingToken: uuidv4()
        };
    }
} 