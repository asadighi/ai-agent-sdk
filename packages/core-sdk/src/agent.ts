import { AgentRole, AgentStatus, Heartbeat, PresenceStatus, getMeshClient, ConnectionState } from './index.js';
import { v4 as uuidv4 } from 'uuid';
import { validateRole, validateAgentConfig, ValidationError } from './validation.js';
import { IFirebaseConfig } from './firebaseConfig.js';
import { Logger } from '@ai-agent/multi-logger';
import { LogLevel } from './types.js';

export class Agent {
    private meshId: string;
    private agentId: string;
    private role: AgentRole;
    private _status: AgentStatus;
    private heartbeatInterval: number;
    private electionInterval: number;
    private maxElectionTimeout: number;
    private client: ReturnType<typeof getMeshClient>;
    private unsubscribe: (() => void) | null = null;
    private heartbeatTimer?: NodeJS.Timeout;
    private electionTimer?: NodeJS.Timeout;
    private currentTerm = 0;
    private fencingToken: string;
    private logger: Logger;
    private electionTimeout?: NodeJS.Timeout;
    private leader?: Agent;
    private worker?: Agent;
    private connectionState: ConnectionState;
    private isOnline: boolean = true;
    private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
    private readonly ELECTION_INTERVAL = 10000; // 10 seconds
    private readonly MAX_ELECTION_TIMEOUT = 30000; // 30 seconds
    private readonly STALE_LEADER_THRESHOLD = 3; // Number of missed heartbeats before considering leader stale

    constructor(config: {
        meshId: string;
        agentId: string;
        role: AgentRole;
        status: AgentStatus;
        heartbeatInterval: number;
        electionInterval: number;
        maxElectionTimeout: number;
        firebaseConfig: IFirebaseConfig;
    }) {
        this.meshId = config.meshId;
        this.agentId = config.agentId;
        this.role = config.role;
        this._status = config.status;
        this.heartbeatInterval = config.heartbeatInterval;
        this.electionInterval = config.electionInterval;
        this.maxElectionTimeout = config.maxElectionTimeout;
        this.client = getMeshClient(config.firebaseConfig);
        this.fencingToken = uuidv4();
        this.logger = new Logger({
            logLevel: LogLevel.INFO,
            logToConsole: true,
            maxLogs: 1000,
            rotationInterval: 60000
        });
        this.connectionState = ConnectionState.getInstance(this.client.getDb());
        this.connectionState.subscribeToConnectionState((isOnline) => {
            this.handleConnectionStateChange(isOnline);
        });
    }

    get status(): AgentStatus {
        return this._status;
    }

    private handleConnectionStateChange(isOnline: boolean): void {
        this.isOnline = isOnline;
        if (!isOnline) {
            this.logger.info(`Agent ${this.agentId} is offline`);
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = undefined;
            }
            this._status = AgentStatus.Offline;
        } else {
            this.logger.info(`Agent ${this.agentId} is back online`);
            if (this.role === AgentRole.Worker) {
                this._status = AgentStatus.Active;
            } else if (this.role === AgentRole.Manager) {
                this._status = AgentStatus.Follower;
                this.startHeartbeat();
                this.startElectionTimeout();
            }
        }
    }

    private startHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.heartbeatTimer = setInterval(async () => {
            if (this.isOnline) {
                try {
                    await this.sendHeartbeat();
                } catch (err) {
                    this.logger.error(`Failed to send heartbeat:`, err);
                    this.handleConnectionStateChange(false);
                }
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    private startElectionTimeout() {
        if (this.electionTimeout) {
            clearTimeout(this.electionTimeout);
        }
        this.electionTimeout = setTimeout(() => {
            if (this.isOnline) {
                this.logger.info(`[AGENT] Election timeout for agent ${this.agentId} in mesh ${this.meshId}, starting new election`);
                this.startElection();
            }
        }, this.electionInterval);
    }

    async start() {
        this.logger.info(`[AGENT] Starting agent ${this.agentId} in mesh ${this.meshId}...`);

        try {
            // Register with mesh
            await this.client.registerAgent({
                meshId: this.meshId,
                agentId: this.agentId,
                role: this.role,
                status: this.role === AgentRole.Worker ? AgentStatus.Active : AgentStatus.Follower
            });

            // Send initial heartbeat immediately if online
            if (this.isOnline) {
                await this.sendHeartbeat();
                this.startHeartbeat();
                if (this.role === AgentRole.Manager) {
                    this.startElectionTimeout();
                }
            }

            this.logger.info(`[AGENT] Agent ${this.agentId} started successfully in mesh ${this.meshId}`);
        } catch (error) {
            this.logger.error(`[AGENT] Error starting agent ${this.agentId} in mesh ${this.meshId}:`, error);
            throw error;
        }
    }

    async stop() {
        this.logger.info(`[AGENT] Stopping agent ${this.agentId} in mesh ${this.meshId}...`);

        // Clear all timers first
        if (this.electionTimeout) {
            clearTimeout(this.electionTimeout);
            this.electionTimeout = undefined;
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
        if (this.electionTimer) {
            clearInterval(this.electionTimer);
            this.electionTimer = undefined;
        }

        // Stop child agents
        if (this.leader) {
            await this.leader.stop();
            this.leader = undefined;
        }
        if (this.worker) {
            await this.worker.stop();
            this.worker = undefined;
        }

        // Unsubscribe from all listeners
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        
        // Unsubscribe from connection state changes
        this.connectionState.unsubscribeFromConnectionState();
        
        // Update status to terminated
        try {
            await this.client.updateAgentStatus(this.meshId, this.agentId, AgentStatus.Terminated);
        } catch (error: any) {
            // Ignore errors if Firebase is already cleaned up
            if (error?.code !== 'app/app-deleted') {
                this.logger.error(`[AGENT] Error updating agent status to terminated:`, error);
            }
        }

        // Only cleanup Firebase client if we're the last instance
        try {
            await this.client.cleanup();
        } catch (error: any) {
            // Ignore cleanup errors if the app is already deleted
            if (error?.code !== 'app/app-deleted') {
                this.logger.error(`[AGENT] Error cleaning up Firebase client:`, error);
            }
        }

        this.logger.info(`[AGENT] Agent ${this.agentId} stopped successfully in mesh ${this.meshId}`);
    }

    private handleHeartbeats(heartbeats: Map<string, Heartbeat>) {
        heartbeats.forEach((heartbeat) => {
            if (heartbeat.agentId !== this.agentId) {
                // console.log(`Received heartbeat from ${heartbeat.agentId}`);
            }
        });
    }

    async sendHeartbeat() {
        const heartbeat: Heartbeat = {
            agentId: this.agentId,
            timestamp: Date.now(),
            role: this.role,
            status: this.status,
            term: 0,
            fencingToken: uuidv4()
        };
        await this.client.updateHeartbeat(this.meshId, heartbeat);
    }

    async getLeaderStatus(): Promise<PresenceStatus | undefined> {
        const agentStatuses = await this.client.getAgentStatuses(this.meshId);
        return Array.from(agentStatuses.values()).find(status => 
            status.role === AgentRole.Manager && status.status === AgentStatus.Active
        );
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
            role: this.role,
            meshId: this.meshId,
            agentId: this.agentId,
            lastHeartbeat: Date.now(),
            term: 0,  // Default term
            fencingToken: uuidv4()  // Generate a new fencing token
        };
    }

    async getAgentStatuses(): Promise<Map<string, PresenceStatus>> {
        return this.client.getAgentStatuses(this.meshId);
    }

    private async startElection(): Promise<void> {
        try {
            this.logger.info(`Starting election for agent ${this.agentId} in mesh ${this.meshId}...`);
            
            // Only Managers can participate in elections
            if (this.role !== AgentRole.Manager) {
                this.logger.info(`Agent ${this.agentId} is not a Manager, cannot participate in election`);
                return;
            }

            // Check if we're still a Manager
            const currentStatus = await this.client.getAgentStatuses(this.meshId);
            const myStatus = currentStatus.get(this.agentId);
            if (!myStatus || myStatus.role !== AgentRole.Manager) {
                this.logger.info(`Agent ${this.agentId} is not a Manager, cannot start election`);
                return;
            }

            // Increment term
            this.currentTerm++;
            this.logger.info(`Incremented term to ${this.currentTerm} for agent ${this.agentId}`);

            // Get all leader statuses
            const agentStatuses = await this.client.getAgentStatuses(this.meshId);
            const activeLeaders = Array.from(agentStatuses.values())
                .filter(status => {
                    const timeSinceLastSeen = Date.now() - status.lastSeen;
                    return status.role === AgentRole.Manager && 
                           status.status === AgentStatus.Active && 
                           timeSinceLastSeen <= this.HEARTBEAT_INTERVAL * this.STALE_LEADER_THRESHOLD;
                });

            // Calculate votes needed (majority of all agents)
            const totalAgents = agentStatuses.size;
            const votesNeeded = Math.floor(totalAgents / 2) + 1;
            this.logger.info(`Need ${votesNeeded} votes for agent ${this.agentId} in term ${this.currentTerm} (${totalAgents} total agents)`);

            // Request votes from all agents
            const votePromises = Array.from(agentStatuses.entries()).map(async ([agentId, status]) => {
                if (agentId === this.agentId) {
                    return true; // Vote for ourselves
                }

                try {
                    const message = {
                        type: 'request_vote',
                        term: this.currentTerm,
                        candidateId: this.agentId,
                        lastLogIndex: 0,
                        lastLogTerm: 0
                    } as const;

                    await this.client.sendElectionMessage(this.meshId, message);
                    return true;
                } catch (error) {
                    this.logger.warn(`Failed to request vote from agent ${agentId}:`, error);
                    return false;
                }
            });

            // Wait for votes with timeout
            const results = await Promise.race([
                Promise.all(votePromises),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Election timeout')), this.MAX_ELECTION_TIMEOUT)
                )
            ]) as boolean[];

            const votesReceived = results.filter(Boolean).length;

            if (votesReceived >= votesNeeded) {
                this.logger.info(`Agent ${this.agentId} won election with ${votesReceived} votes`);
                await this.becomeActive();
            } else {
                this.logger.info(`Agent ${this.agentId} lost election with ${votesReceived} votes`);
                this.currentTerm--; // Revert term increment since we lost
            }
        } catch (error) {
            this.logger.error(`Error in election for agent ${this.agentId}:`, error);
            this.currentTerm--; // Revert term increment on error
        }
    }

    private async becomeActive(): Promise<void> {
        try {
            // Only Managers can become Active through elections
            if (this.role !== AgentRole.Manager) {
                this.logger.info(`Agent ${this.agentId} is not a Manager, cannot become Active through election`);
                return;
            }

            // Update our status to Active
            await this.client.updateAgentStatus(
                this.meshId,
                this.agentId,
                AgentStatus.Active
            );

            this._status = AgentStatus.Active;
            this.logger.info(`Agent ${this.agentId} became Active in term ${this.currentTerm}`);

            // Start sending heartbeats
            this.startHeartbeat();
        } catch (error) {
            this.logger.error(`Error becoming Active for agent ${this.agentId}:`, error);
            // If we can't become Active, revert to Follower
            await this.becomeFollower();
        }
    }

    private async becomeFollower(): Promise<void> {
        try {
            // Only Managers can become Follower through elections
            if (this.role !== AgentRole.Manager) {
                this.logger.info(`Agent ${this.agentId} is not a Manager, cannot become Follower through election`);
                return;
            }

            await this.client.updateAgentStatus(
                this.meshId,
                this.agentId,
                AgentStatus.Follower
            );

            this._status = AgentStatus.Follower;
            this.logger.info(`Agent ${this.agentId} became Follower`);

            // Stop heartbeats if we were sending them
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = undefined;
            }
        } catch (error) {
            this.logger.error(`Error becoming Follower for agent ${this.agentId}:`, error);
        }
    }
}