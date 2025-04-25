import { AgentRole, AgentStatus, Heartbeat, PresenceStatus, ElectionMessage, RequestVoteMessage, VoteMessage, getMeshClient } from './index.js';
import { v4 as uuidv4 } from 'uuid';
import { IFirebaseConfig } from './firebaseConfig.js';
import { Logger } from '@ai-agent/multi-logger';
import { LogLevel } from './types.js';

export class Candidate {
    private meshId: string;
    private agentId: string;
    private role: AgentRole;
    private status: AgentStatus;
    private firebaseConfig: IFirebaseConfig;
    private client: ReturnType<typeof getMeshClient>;
    private unsubscribe: (() => void) | null = null;
    private currentTerm: number = 0;
    private votesReceived: number = 0;
    private totalAgents: number = 0;
    private heartbeatTimer?: NodeJS.Timeout;
    private electionTimer?: NodeJS.Timeout;
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
        try {
            this.logger.info('[CANDIDATE] Starting candidate...');
            await this.client.registerAgent({
                meshId: this.meshId,
                agentId: this.agentId,
                role: this.role,
                status: this.status
            });
            this.logger.info('[CANDIDATE] Registered as candidate');

            this.unsubscribe = this.client.subscribeToElectionMessages(this.meshId, (messages) => {
                this.logger.info('[CANDIDATE] Received election messages:', Array.from(messages.values()));
                this.handleElectionMessages(messages);
            });

            // Start sending heartbeats
            this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 1000);
            this.logger.info('[CANDIDATE] Started heartbeat interval');

            // Start election timeout
            this.electionTimer = setInterval(() => {
                this.logger.info('[CANDIDATE] Election timeout, starting new election');
                this.startElection();
            }, 5000);

            await this.startElection();
        } catch (error) {
            this.logger.error('[CANDIDATE] Error starting candidate:', error);
            throw error;
        }
    }

    async stop() {
        this.logger.info('[CANDIDATE] Stopping candidate...');
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
        if (this.electionTimer) {
            clearInterval(this.electionTimer);
            this.electionTimer = undefined;
        }
        await this.client.updateAgentStatus(this.meshId, this.agentId, AgentStatus.Terminated);
        this.logger.info('[CANDIDATE] Candidate stopped');
    }

    private async startElection() {
        this.logger.info('[CANDIDATE] Starting election...');
        this.currentTerm++;
        this.votesReceived = 1; // Vote for self
        this.totalAgents = (await this.client.getAgentStatuses(this.meshId)).size;
        this.logger.info('[CANDIDATE] Election state:', { 
            currentTerm: this.currentTerm, 
            votesReceived: this.votesReceived, 
            totalAgents: this.totalAgents 
        });

        const voteRequest: RequestVoteMessage = {
            type: 'request_vote',
            term: this.currentTerm,
            candidateId: this.agentId,
            lastLogIndex: 0,
            lastLogTerm: 0,
            timestamp: new Date()
        };

        this.logger.info('[CANDIDATE] Sending vote request:', voteRequest);
        await this.client.sendElectionMessage(this.meshId, voteRequest);
    }

    private async handleElectionMessages(messages: Map<string, ElectionMessage>) {
        this.logger.info('[CANDIDATE] Handling election messages...');
        for (const message of messages.values()) {
            if (message.type === 'vote') {
                const voteMessage = message as VoteMessage;
                this.logger.info('[CANDIDATE] Received vote:', voteMessage);
                if (voteMessage.term === this.currentTerm && voteMessage.granted) {
                    this.votesReceived++;
                    this.logger.info('[CANDIDATE] Vote count:', { 
                        votesReceived: this.votesReceived, 
                        totalAgents: this.totalAgents 
                    });
                    if (this.votesReceived > this.totalAgents / 2) {
                        this.logger.info('[CANDIDATE] Received majority votes, becoming leader');
                        await this.becomeLeader();
                    }
                }
            }
        }
    }

    private async becomeLeader() {
        this.logger.info('[CANDIDATE] Becoming leader...');
        await this.client.updateAgent({
            meshId: this.meshId,
            agentId: this.agentId,
            role: AgentRole.Manager,
            status: AgentStatus.Active
        });
        this.logger.info('[CANDIDATE] Successfully became leader');
    }

    async sendHeartbeat() {
        const heartbeat: Heartbeat = {
            agentId: this.agentId,
            timestamp: Date.now(),
            role: this.role,
            status: this.status,
            term: this.currentTerm,
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
} 