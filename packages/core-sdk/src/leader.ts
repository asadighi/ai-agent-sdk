import { AgentAction, Heartbeat, ElectionMessage, RequestVoteMessage, VoteMessage, InitialLeaderMessage, PresenceStatus, AgentRole, AgentStatus, AgentLogEntry, MeshState, Agent } from './types.js';
import { getMeshClient } from './index.js';
import { v4 as uuidv4 } from 'uuid';
import { IFirebaseConfig } from './firebaseConfig.js';
import { Logger } from '@ai-agent/multi-logger';
import { LogLevel } from './types.js';

export class Leader {
  private meshId: string;
  private agentId: string;
  private role: AgentRole = AgentRole.Manager;
  private status: AgentStatus;
  private client: ReturnType<typeof getMeshClient>;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private presenceCheckInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = Date.now();
  private agents: Map<string, PresenceStatus> = new Map();
  private isElectionInProgress: boolean = false;
  private currentTerm: number = 0;
  private fencingToken: string;
  private log: AgentLogEntry[] = [];
  private votedFor: string | null = null;
  private meshState: MeshState = {
    hasLeader: false,
    currentTerm: 0,
    isInitialLeaderElectionInProgress: false,
  };
  private unsubscribe: (() => void) | null = null;
  private votesReceived: number = 0;
  private electionTimeout: NodeJS.Timeout | null = null;
  private logger: Logger;
  private heartbeats: Map<string, Heartbeat> = new Map();

  constructor(config: {
    meshId: string;
    agentId: string;
    role: AgentRole;
    status: AgentStatus;
    firebaseConfig: IFirebaseConfig;
    heartbeatInterval?: number;
    electionInterval?: number;
    maxElectionTimeout?: number;
  }) {
    this.meshId = config.meshId;
    this.agentId = config.agentId;
    this.role = config.role;
    this.status = config.status;
    this.client = getMeshClient(config.firebaseConfig);
    this.fencingToken = Date.now().toString();
    this.currentTerm = 0;
    this.votedFor = null;
    this.votesReceived = 0;
    this.logger = new Logger({
      logLevel: LogLevel.INFO,
      logToConsole: true,
      maxLogs: 1000,
      rotationInterval: 60000
    });
    this.setupElectionMessageHandler();
  }

  async start() {
    try {
      this.logger.info(`[LEADER] Starting leader ${this.agentId}...`);
      await this.client.registerAgent({
        meshId: this.meshId,
        agentId: this.agentId,
        role: this.role,
        status: this.status
      });

      this.unsubscribe = this.client.subscribeToHeartbeats(this.meshId, (heartbeats) => {
        this.handleHeartbeats(heartbeats);
      });

      // Start sending heartbeats
      this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 5000);
      
      // Start presence monitoring
      this.presenceCheckInterval = setInterval(() => this.checkPresence(), 5000);

      this.startHeartbeat();
      this.startElectionTimeout();
    } catch (error) {
      this.logger.error('Error starting leader:', error);
      throw error;
    }
  }

  async stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.presenceCheckInterval) clearInterval(this.presenceCheckInterval);
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    await this.client.updateAgentStatus(this.meshId, this.agentId, AgentStatus.Terminated);
    this.cleanup();
    this.stopHeartbeat();
    this.stopElectionTimeout();
  }

  private handleHeartbeats(heartbeats: Map<string, Heartbeat>) {
    for (const [agentId, heartbeat] of heartbeats) {
      if (agentId === this.agentId) continue;

      // Update the heartbeat map
      this.heartbeats.set(agentId, heartbeat);

      // Check for active managers
      const now = Date.now();
      const activeManagers = Array.from(this.heartbeats.values())
        .filter(hb => {
          const timeSinceLastSeen = now - hb.timestamp;
          return hb.role === AgentRole.Manager && 
                 hb.status === AgentStatus.Active && 
                 timeSinceLastSeen <= 5000; // 5 seconds threshold
        });

      // If we're not active and there are no active managers, start an election
      if (this.status !== AgentStatus.Active && activeManagers.length === 0) {
        this.logger.info('No active managers found, starting election');
        this.startElection();
        return;
      }

      // If we're active and there's another active manager, become follower
      if (this.status === AgentStatus.Active && activeManagers.some(m => m.agentId !== this.agentId)) {
        this.logger.info('Active leader already exists, becoming follower');
        this.becomeFollower();
        return;
      }
    }
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      const heartbeat: Heartbeat = {
        agentId: this.agentId,
        timestamp: Date.now(),
        role: this.role,
        status: this.status,
        term: this.currentTerm,
        fencingToken: this.fencingToken
      };
      
      await this.client.updateHeartbeat(this.meshId, heartbeat);
      this.lastHeartbeat = Date.now();
    } catch (error) {
      this.logger.error('Error sending heartbeat:', error);
    }
  }

  private async checkPresence(): Promise<void> {
    const now = Date.now();
    const offlineAgents: string[] = [];

    for (const [agentId, status] of this.agents) {
      if (now - status.lastSeen > 3000) {
        status.status = AgentStatus.Offline;
        offlineAgents.push(agentId);
      }
    }

    for (const agentId of offlineAgents) {
      await this.handleAgentOffline(agentId);
    }
  }

  private setupElectionMessageHandler(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = this.client.subscribeToElectionMessages(this.meshId, (messages: Map<string, ElectionMessage>) => {
      messages.forEach(message => {
        this.handleElectionMessage(message).catch(error => {
          this.logger.error('Error handling election message:', error);
        });
      });
    });
  }

  private isRequestVoteMessage(message: ElectionMessage): message is RequestVoteMessage {
    return message.type === 'request_vote';
  }

  private isVoteMessage(message: ElectionMessage): message is VoteMessage {
    return message.type === 'vote';
  }

  private isInitialLeaderMessage(message: ElectionMessage): message is InitialLeaderMessage {
    return message.type === 'initial_leader';
  }

  async handleElectionMessage(message: ElectionMessage): Promise<void> {
    if (this.isRequestVoteMessage(message)) {
      // Only vote if we haven't voted in this term and the candidate's log is at least as up to date
      if (!this.votedFor && message.term >= this.currentTerm) {
        const lastLogIndex = this.log.length - 1;
        const lastLogTerm = lastLogIndex >= 0 ? this.log[lastLogIndex].term : 0;

        if (message.lastLogTerm > lastLogTerm || 
            (message.lastLogTerm === lastLogTerm && message.lastLogIndex >= lastLogIndex)) {
          this.votedFor = message.candidateId;
          const voteMessage: VoteMessage = {
            type: 'vote',
            term: this.currentTerm,
            candidateId: this.agentId,
            voterId: message.candidateId,
            granted: true
          };
          await this.sendElectionMessage(voteMessage);
        }
      }
    } else if (this.isVoteMessage(message)) {
      if (message.granted) {
        this.votesReceived++;
        
        // If we have majority votes, become leader
        const agents = await this.client.getAgents(this.meshId);
        if (this.votesReceived > Math.floor(agents.size / 2)) {
          await this.becomeLeader();
        }
      }
    } else if (this.isInitialLeaderMessage(message)) {
      if (message.leaderId === this.agentId) {
        this.currentTerm = message.term;
        this.votedFor = message.leaderId;
        await this.becomeLeader();
      }
    }
  }

  private async becomeLeader() {
    this.logger.info(`Agent ${this.agentId} becoming leader for term ${this.currentTerm}`);
    
    // First, check if there's already an active leader
    const currentLeader = await this.client.getLeader(this.meshId);
    if (currentLeader && currentLeader.status === AgentStatus.Active) {
      this.logger.info('Active leader already exists, becoming follower');
      await this.becomeFollower();
      return;
    }

    // Update our role and status
    await this.client.updateAgent({
      meshId: this.meshId,
      agentId: this.agentId,
      role: AgentRole.Manager,
      status: AgentStatus.Active
    });

    // Start sending heartbeats
    this.startHeartbeat();
  }

  private async becomeFollower() {
    this.logger.info(`Agent ${this.agentId} becoming follower`);
    await this.client.updateAgent({
      meshId: this.meshId,
      agentId: this.agentId,
      role: AgentRole.Manager,
      status: AgentStatus.Follower
    });
    this.stopHeartbeat();
  }

  private async checkLeaderHealth() {
    const leader = await this.client.getLeader(this.meshId);
    if (!leader || leader.status === AgentStatus.Offline || leader.status === AgentStatus.Terminated) {
      this.logger.info('Leader is not healthy, starting election');
      await this.startElection();
    }
  }

  private async startElection() {
    this.currentTerm++;
    this.votedFor = this.agentId;
    this.votesReceived = 1; // Vote for ourselves

    // Request votes from all other agents
    const agents = await this.client.getAgents(this.meshId);
    for (const [agentId, agent] of agents) {
      if (agentId !== this.agentId && agent.status === AgentStatus.Follower) {
        const lastLogIndex = this.log.length - 1;
        const lastLogTerm = lastLogIndex >= 0 ? this.log[lastLogIndex].term : 0;
        const requestVoteMessage: RequestVoteMessage = {
          type: 'request_vote',
          term: this.currentTerm,
          candidateId: this.agentId,
          lastLogIndex,
          lastLogTerm
        };
        await this.sendElectionMessage(requestVoteMessage);
      }
    }
  }

  private async handleAgentOffline(agentId: string): Promise<void> {
    const status: PresenceStatus = {
      agentId,
      lastSeen: Date.now(),
      role: this.role,
      status: AgentStatus.Offline,
      fencingToken: this.fencingToken
    };
    this.agents.set(agentId, status);
  }

  private async sendElectionMessage(message: ElectionMessage) {
    await this.client.sendElectionMessage(this.meshId, message);
  }

  private isLeader(): boolean {
    return !this.isElectionInProgress;
  }

  async receiveAction(agentId: string, action: AgentAction) {
    // Update agent presence
    await this.updateAgentPresence(agentId);
    
    // Validate, cascade or queue
    this.logger.info(`[Leader] Received action from ${agentId}`, action);
  }

  private async updateAgentPresence(agentId: string) {
    const currentStatus = this.agents.get(agentId);
    if (!currentStatus) {
      this.logger.info(`[MESH] New agent detected: ${agentId}`);
    }
    
    this.agents.set(agentId, {
      agentId,
      lastSeen: Date.now(),
      role: currentStatus?.role || this.role,
      status: currentStatus?.status || this.status,
      fencingToken: this.fencingToken
    });
  }

  async broadcastUpdate(payload: any, visibility: "public" | "internal") {
    // Send to Firestore with filtered targets
    this.logger.info(`[Leader] Broadcasting ${visibility} update`, payload);
  }

  healthCheck() {
    return { 
      status: "healthy", 
      role: this.role, 
      meshId: this.meshId,
      lastHeartbeat: this.lastHeartbeat,
      agents: Array.from(this.agents.values())
    };
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        this.logger.error('Error sending heartbeat:', error);
      }
    }, 1000) as unknown as NodeJS.Timeout;
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startElectionTimeout() {
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
    }
    const timeout = Math.random() * 2000 + 2000; // Random timeout between 2-4 seconds
    this.electionTimeout = setTimeout(async () => {
      await this.checkLeaderHealth();
      this.startElectionTimeout();
    }, timeout) as unknown as NodeJS.Timeout;
  }

  private stopElectionTimeout() {
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
      this.electionTimeout = null;
    }
  }

  async handleAppendEntries(message: RequestVoteMessage): Promise<void> {
    if (!message.term || !message.lastLogTerm || !message.lastLogIndex) {
      throw new Error('Required message fields are missing');
    }

    if (message.term < this.currentTerm) {
      return;
    }

    if (message.lastLogTerm < this.log[this.log.length - 1]?.term) {
      return;
    }

    if (message.lastLogTerm === this.log[this.log.length - 1]?.term && 
      message.lastLogIndex < this.log.length - 1) {
      return;
    }

    // Process the append entries message
    // ... rest of the implementation
  }

  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async getAgentStatuses(): Promise<Map<string, PresenceStatus>> {
    return this.client.getAgentStatuses(this.meshId);
  }

  private async onHeartbeat(heartbeat: Heartbeat) {
    if (heartbeat.agentId === this.agentId) {
      return;
    }

    // Update the heartbeat map
    this.heartbeats.set(heartbeat.agentId, heartbeat);

    // Check if we need to start an election
    const now = Date.now();
    const hasActiveLeader = Array.from(this.heartbeats.values()).some(hb => 
      hb.role === AgentRole.Manager && hb.status === AgentStatus.Active
    );

    if (!hasActiveLeader && this.role === AgentRole.Manager) {
      this.logger.info('No active leaders found, starting election');
      await this.startElection();
    } else if (hasActiveLeader && this.electionTimeout) {
      this.logger.info('Active leader found, canceling election');
      clearTimeout(this.electionTimeout);
      this.electionTimeout = null;
      this.isElectionInProgress = false;
    }
  }
} 