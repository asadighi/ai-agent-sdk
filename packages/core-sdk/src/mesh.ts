import { AgentRole, AgentStatus, Heartbeat, ElectionMessage, PresenceStatus, InitialLeaderMessage } from './types.js';
import { MeshClient } from './meshClient.js';
import { IFirebaseConfig } from './firebaseConfig.js';
import { v4 as uuidv4 } from 'uuid';
import { Agent } from './agent.js';
import { Leader } from './leader.js';
import { Worker } from './worker.js';
import { Candidate } from './candidate.js';
import { Logger } from '@ai-agent/multi-logger';
import { LogLevel } from './types.js';

export class Mesh {
    private meshId: string;
    private status: AgentStatus;
    private client: MeshClient;
    private agents: Map<string, Agent> = new Map();
    private manager: Leader | null = null;
    private workers: Map<string, Worker> = new Map();
    private candidate: Candidate | null = null;
    private unsubscribe: (() => void) | null = null;
    private firebaseConfig: IFirebaseConfig;
    private heartbeatCheckInterval: NodeJS.Timeout | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private logger: Logger;
    private isRunning: boolean = false;
    private lastElectionAttempt: number = 0;
    private readonly ELECTION_COOLDOWN = 10000; // 10 seconds cooldown between election attempts
    private readonly HEARTBEAT_INTERVAL = 1000; // 1 second
    private readonly ELECTION_INTERVAL = 10000; // 10 seconds
    private readonly MAX_ELECTION_TIMEOUT = 30000; // 30 seconds
    private readonly STALE_LEADER_THRESHOLD = 10; // Number of missed heartbeats before considering leader stale (10 seconds)

    constructor(config: {
        meshId: string;
        firebaseConfig: IFirebaseConfig;
    }) {
        this.meshId = config.meshId;
        this.status = AgentStatus.Follower;
        this.firebaseConfig = config.firebaseConfig;
        this.client = new MeshClient(this.firebaseConfig);
        this.logger = new Logger({
            logLevel: LogLevel.INFO,
            logToConsole: true,
            maxLogs: 1000,
            rotationInterval: 60000
        });
    }

    async addAgent(config: {
        agentId: string;
        role: AgentRole;
        status: AgentStatus;
        heartbeatInterval: number;
        electionInterval: number;
        maxElectionTimeout: number;
    }) {
        const agent = new Agent({
            meshId: this.meshId,
            agentId: config.agentId,
            role: config.role,
            status: config.status,
            firebaseConfig: this.firebaseConfig,
            heartbeatInterval: config.heartbeatInterval,
            electionInterval: config.electionInterval,
            maxElectionTimeout: config.maxElectionTimeout
        });
        await this.client.registerAgent({
            meshId: this.meshId,
            agentId: config.agentId,
            role: config.role,
            status: config.status
        });
        this.agents.set(config.agentId, agent);
    }

    async addManager(config: {
        agentId: string;
        status: AgentStatus;
    }) {
        const manager = new Leader({
            meshId: this.meshId,
            agentId: config.agentId,
            role: AgentRole.Manager,
            status: config.status,
            firebaseConfig: this.firebaseConfig
        });
        await this.client.registerAgent({
            meshId: this.meshId,
            agentId: config.agentId,
            role: AgentRole.Manager,
            status: config.status
        });
        this.manager = manager;
        await manager.start();

        // Check if there's an active manager and trigger election if needed
        const hasActiveManager = await this.checkForActiveManager();
        if (!hasActiveManager) {
            // Update our status to Manager before starting election
            await this.client.updateAgent({
                meshId: this.meshId,
                agentId: config.agentId,
                role: AgentRole.Manager,
                status: AgentStatus.Active
            });
            await this.startElection();
        }
    }

    async addWorker(config: {
        agentId: string;
        status: AgentStatus;
    }) {
        const worker = new Worker({
            meshId: this.meshId,
            agentId: config.agentId,
            role: AgentRole.Worker,
            status: config.status,
            firebaseConfig: this.firebaseConfig
        });
        await this.client.registerAgent({
            meshId: this.meshId,
            agentId: config.agentId,
            role: AgentRole.Worker,
            status: config.status
        });
        this.workers.set(config.agentId, worker);
    }

    async addCandidate(config: {
        agentId: string;
        status: AgentStatus;
    }) {
        const candidate = new Candidate({
            meshId: this.meshId,
            agentId: config.agentId,
            role: AgentRole.Worker,
            status: AgentStatus.Follower,
            firebaseConfig: this.firebaseConfig
        });
        await this.client.registerAgent({
            meshId: this.meshId,
            agentId: config.agentId,
            role: AgentRole.Worker,
            status: AgentStatus.Follower
        });
        this.candidate = candidate;
    }

    private async checkForActiveManager() {
        const statuses = await this.client.getAgentStatuses(this.meshId);
        const now = Date.now();
        
        const activeManagers = Array.from(statuses.values())
            .filter(status => {
                const timeSinceLastSeen = now - status.lastSeen;
                return status.role === AgentRole.Manager && 
                       status.status === AgentStatus.Active && 
                       timeSinceLastSeen <= this.HEARTBEAT_INTERVAL * this.STALE_LEADER_THRESHOLD;
            });

        return activeManagers.length > 0;
    }

    private async activateFollowers() {
        const statuses = await this.client.getAgentStatuses(this.meshId);
        for (const [agentId, status] of statuses.entries()) {
            // Only activate workers, leave managers inactive
            if (status.status === AgentStatus.Follower && status.role === AgentRole.Worker) {
                await this.client.updateAgent({
                    meshId: this.meshId,
                    agentId,
                    role: AgentRole.Worker,
                    status: AgentStatus.Active
                });
            }
        }
    }

    private async checkForMultipleManagers(): Promise<void> {
        // Don't run manager checks if mesh is not running
        if (!this.isRunning) {
            return;
        }

        try {
            const statuses = await this.client.getAgentStatuses(this.meshId);
            const now = Date.now();
            
            const activeManagers = Array.from(statuses.values())
                .filter(status => {
                    const timeSinceLastSeen = status.lastSeen ? now - status.lastSeen : Infinity;
                    const isActive = status.role === AgentRole.Manager && status.status === AgentStatus.Active;
                    const isRecent = timeSinceLastSeen <= this.HEARTBEAT_INTERVAL * this.STALE_LEADER_THRESHOLD;
                    
                    this.logger.debug(`[MESH] Checking manager ${status.agentId}:`, {
                        isActive,
                        isRecent,
                        timeSinceLastSeen,
                        threshold: this.HEARTBEAT_INTERVAL * this.STALE_LEADER_THRESHOLD
                    });
                    
                    return isActive && isRecent;
                });

            if (activeManagers.length > 1) {
                this.logger.warn(`[MESH] Multiple active managers detected: ${activeManagers.map(m => m.agentId).join(', ')}`);
                // Keep the manager with the lowest ID and demote others
                const sortedManagers = activeManagers.sort((a, b) => a.agentId.localeCompare(b.agentId));
                const primaryManager = sortedManagers[0];
                
                for (const manager of sortedManagers.slice(1)) {
                    await this.client.updateAgent({
                        meshId: this.meshId,
                        agentId: manager.agentId,
                        role: AgentRole.Manager,
                        status: AgentStatus.Follower
                    });
                }
            }
        } catch (error) {
            this.logger.error(`[MESH] Error in checkForMultipleManagers:`, error);
            throw error;
        }
    }

    private async validateFencingTokens(): Promise<void> {
        try {
            // Only managers can validate fencing tokens
            const currentStatus = await this.client.getAgentStatuses(this.meshId);
            const myStatus = currentStatus.get(this.meshId);
            if (!myStatus || myStatus.role !== AgentRole.Manager) {
                return;
            }

            const agentStatuses = await this.client.getAgentStatuses(this.meshId);
            const now = Date.now();
            
            for (const [agentId, status] of agentStatuses.entries()) {
                // Skip validation for the current agent
                if (agentId === this.meshId) continue;

                // If agent hasn't been seen for more than STALE_LEADER_THRESHOLD intervals, mark as follower
                const timeSinceLastSeen = now - status.lastSeen;
                if (timeSinceLastSeen > this.HEARTBEAT_INTERVAL * this.STALE_LEADER_THRESHOLD) {
                    const secondsSinceLastSeen = Math.floor(timeSinceLastSeen / 1000);
                    const missedHeartbeats = Math.floor(secondsSinceLastSeen / (this.HEARTBEAT_INTERVAL / 1000));
                    this.logger.info(`[MESH] Agent ${agentId} has stale fencing token (last seen ${secondsSinceLastSeen}s ago, ${missedHeartbeats} missed heartbeats), marking as follower`);
                    await this.client.updateAgentStatus(
                        this.meshId,
                        agentId,
                        AgentStatus.Follower
                    );
                }
            }
        } catch (error) {
            this.logger.error('[MESH] Error validating fencing tokens:', error);
        }
    }

    async start() {
        if (this.isRunning) {
            this.logger.warn(`[MESH] Mesh ${this.meshId} is already running`);
            return;
        }

        this.isRunning = true;
        this.logger.info(`[MESH] Starting mesh ${this.meshId}...`);

        try {
            // Get current role
            const currentStatus = await this.client.getAgentStatuses(this.meshId);
            const myStatus = currentStatus.get(this.meshId);

            // Only managers perform initial cleanup and periodic checks
            if (myStatus?.role === AgentRole.Manager) {
                // Initial cleanup of stale managers
                await this.checkForMultipleManagers();
                await this.validateFencingTokens();

                // Start heartbeat check interval
                this.logger.info(`[MESH] Starting heartbeat check interval for mesh ${this.meshId}...`);
                if (this.heartbeatCheckInterval) {
                    clearInterval(this.heartbeatCheckInterval);
                }
                this.heartbeatCheckInterval = setInterval(() => {
                    if (!this.isRunning) {
                        clearInterval(this.heartbeatCheckInterval!);
                        this.heartbeatCheckInterval = null;
                        return;
                    }
                    this.logger.info(`[MESH] Running periodic manager check for mesh ${this.meshId}...`);
                    this.checkForMultipleManagers().catch(error => {
                        this.logger.error(`[MESH] Error checking for multiple managers in mesh ${this.meshId}:`, error);
                    });
                }, this.HEARTBEAT_INTERVAL);
            }

            // Subscribe to heartbeats (all nodes do this)
            this.logger.info(`[MESH] Subscribing to heartbeats for mesh ${this.meshId}...`);
            this.unsubscribe = this.client.subscribeToHeartbeats(this.meshId, async (heartbeats) => {
                if (!this.isRunning) return;
                this.logger.info(`[MESH] Received heartbeats for mesh ${this.meshId}:`, Array.from(heartbeats.values()));
                await this.handleHeartbeats(heartbeats);
            });

            this.logger.info(`[MESH] Mesh ${this.meshId} started successfully`);
        } catch (error) {
            this.logger.error(`[MESH] Error starting mesh ${this.meshId}:`, error);
            // Clean up any resources that were created
            if (this.heartbeatCheckInterval) {
                clearInterval(this.heartbeatCheckInterval);
                this.heartbeatCheckInterval = null;
            }
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }
            this.isRunning = false;
            throw error;
        }
    }

    async stop() {
        if (!this.isRunning) return;

        this.logger.info(`[MESH] Stopping mesh ${this.meshId}...`);
        this.isRunning = false;

        try {
            // 1. Unsubscribe from all listeners first
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }

            // 2. Clear all intervals
            if (this.heartbeatCheckInterval) {
                clearInterval(this.heartbeatCheckInterval);
                this.heartbeatCheckInterval = null;
            }
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }

            // 3. Stop all agents
            if (this.manager) {
                await this.manager.stop();
                this.manager = null;
            }
            if (this.candidate) {
                await this.candidate.stop();
                this.candidate = null;
            }
            for (const worker of this.workers.values()) {
                await worker.stop();
            }
            this.workers.clear();

            // 4. Update mesh status to terminated
            try {
                await this.client.updateAgentStatus(this.meshId, this.meshId, AgentStatus.Terminated);
            } catch (error: any) {
                // Log but don't fail if we can't update status
                this.logger.warn(`[MESH] Could not update mesh status to terminated:`, error);
            }

            // 5. Only cleanup Firebase client if we're the last instance
            try {
                // Wait for all pending operations to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Then cleanup the client
                await this.client.cleanup();
            } catch (error: any) {
                // Log but don't fail if cleanup fails
                this.logger.warn(`[MESH] Error during Firebase cleanup:`, error);
            }

            this.logger.info(`[MESH] Mesh ${this.meshId} stopped successfully`);
        } catch (error) {
            this.logger.error(`[MESH] Error stopping mesh ${this.meshId}:`, error);
            throw error;
        }
    }

    async becomeManager() {
        this.logger.info('[MESH] Attempting to become manager...');
        if (this.workers.size > 0) {
            this.logger.info('[MESH] Stopping existing workers');
            for (const worker of this.workers.values()) {
                await worker.stop();
            }
            this.workers.clear();
        }

        if (this.candidate) {
            this.logger.info('[MESH] Stopping candidate');
            await this.candidate.stop();
            this.candidate = null;
        }

        this.logger.info('[MESH] Updating status to Active Manager');
        await this.client.updateAgent({
            meshId: this.meshId,
            agentId: this.meshId,
            role: AgentRole.Manager,
            status: AgentStatus.Active
        });

        this.logger.info('[MESH] Creating new manager instance');
        this.manager = new Leader({
            meshId: this.meshId,
            agentId: this.meshId,
            role: AgentRole.Manager,
            status: AgentStatus.Active,
            firebaseConfig: this.firebaseConfig
        });

        await this.manager.start();
        this.logger.info('[MESH] Activating followers');
        await this.activateFollowers();
        this.logger.info('[MESH] Successfully became manager');
    }

    private async handleHeartbeats(heartbeats: Map<string, Heartbeat>) {
        if (!this.isRunning) return;

        try {
            // Get current role
            const currentStatus = await this.client.getAgentStatuses(this.meshId);
            const myStatus = currentStatus.get(this.meshId);

            // Only managers perform fencing checks
            if (myStatus?.role === AgentRole.Manager) {
                await this.validateFencingTokens();
            }

            // All nodes check for manager presence
            const hasManager = Array.from(heartbeats.values()).some(hb => 
                hb.role === AgentRole.Manager && 
                hb.status === AgentStatus.Active
            );

            if (!hasManager) {
                this.logger.warn(`[MESH] No active manager found in mesh ${this.meshId}, starting election...`);
                await this.startElection();
            }
        } catch (error) {
            this.logger.error(`[MESH] Error handling heartbeats for mesh ${this.meshId}:`, error);
        }
    }

    async sendHeartbeat() {
        const heartbeat: Heartbeat = {
            agentId: this.meshId,
            timestamp: Date.now(),
            role: AgentRole.Worker,
            status: this.status,
            term: 0,
            fencingToken: uuidv4()
        };
        await this.client.updateHeartbeat(this.meshId, heartbeat);
    }

    async getAgentStatuses(): Promise<Map<string, PresenceStatus>> {
        return this.client.getAgentStatuses(this.meshId);
    }

    async cleanup(): Promise<void> {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        await this.client.cleanup();
    }

    async startElection() {
        const now = Date.now();
        
        // Check if there are any active managers in the mesh
        const statuses = await this.client.getAgentStatuses(this.meshId);
        const activeManagers = Array.from(statuses.values())
            .filter(status => status.role === AgentRole.Manager && status.status === AgentStatus.Active);
        
        // Don't start election if we already have an active manager
        if (activeManagers.length > 0) {
            this.logger.info(`[MESH] Skipping election - found active manager(s): ${activeManagers.map(m => m.agentId).join(', ')}`);
            return;
        }

        // Only apply cooldown if we've recently attempted an election
        if (now - this.lastElectionAttempt < this.ELECTION_COOLDOWN) {
            this.logger.info('[MESH] Skipping election due to cooldown period');
            return;
        }

        this.lastElectionAttempt = now;
        this.logger.info('[MESH] Starting election process...');
        
        // Get all statuses and log them for debugging
        const allStatuses = Array.from(statuses.values());
        this.logger.info('[MESH] All agent statuses:', allStatuses.map(s => ({
            agentId: s.agentId,
            role: s.role,
            status: s.status
        })));
        
        // Find potential candidate nodes (only Managers in Follower status)
        const potentialCandidates = Array.from(statuses.values())
            .filter(status => {
                const isCandidate = status.role === AgentRole.Manager && status.status === AgentStatus.Follower;
                this.logger.info(`[MESH] Checking candidate ${status.agentId}:`, {
                    role: status.role,
                    status: status.status,
                    isCandidate
                });
                return isCandidate;
            });
        
        if (potentialCandidates.length === 0) {
            this.logger.info('[MESH] No potential candidates available for election');
            return;
        }

        // Select the first candidate (they are already Managers, just need to be activated)
        const candidate = potentialCandidates[0];
        this.logger.info(`[MESH] Starting election with candidate ${candidate.agentId} (role: ${candidate.role}, status: ${candidate.status})`);
        
        try {
            // Update the candidate's role and status
            await this.client.updateAgent({
                meshId: this.meshId,
                agentId: candidate.agentId,
                role: AgentRole.Manager,
                status: AgentStatus.Active
            });

            // Send initial leader message
            const initialLeaderMessage: InitialLeaderMessage = {
                type: 'initial_leader',
                term: 0,
                leaderId: candidate.agentId,
                timestamp: new Date()
            };

            await this.client.sendElectionMessage(this.meshId, initialLeaderMessage);
            this.logger.info('[MESH] Election process completed successfully');
        } catch (error) {
            this.logger.error('[MESH] Error during election process:', error);
            // Reset the candidate's status on error
            try {
                await this.client.updateAgent({
                    meshId: this.meshId,
                    agentId: candidate.agentId,
                    role: AgentRole.Manager,
                    status: AgentStatus.Follower
                });
            } catch (resetError) {
                this.logger.error('[MESH] Error resetting candidate status:', resetError);
            }
            throw error; // Re-throw to be handled by caller
        }
    }

    async becomeWorker() {
        if (this.manager) {
            await this.manager.stop();
            this.manager = null;
        }
        if (this.candidate) {
            await this.candidate.stop();
            this.candidate = null;
        }

        // Update our status to Active before becoming worker
        await this.client.updateAgent({
            meshId: this.meshId,
            agentId: this.meshId,
            role: AgentRole.Worker,
            status: AgentStatus.Active
        });

        const worker = new Worker({
            meshId: this.meshId,
            agentId: this.meshId,
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            firebaseConfig: this.firebaseConfig
        });
        await worker.start();
        this.workers.set(this.meshId, worker);
    }
} 