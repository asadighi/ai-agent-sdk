import { AgentAction, Heartbeat, ElectionMessage, PresenceStatus, AgentRole, AgentStatus, LogEntry, VoteRequest, VoteResponse, MeshState } from './types.js';
import { FirestoreClient } from './fireStoreClient.js';

export class Leader {
  private firestore: FirestoreClient;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private presenceCheckInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = Date.now();
  private agents: Map<string, PresenceStatus> = new Map();
  private isElectionInProgress: boolean = false;
  private currentTerm: number = 0;
  private fencingToken: string = Date.now().toString();
  private log: { term: number; command: any }[] = [];
  private votedFor: string | null = null;
  private meshState: MeshState = {
    hasLeader: false,
    currentTerm: 0,
    isInitialLeaderElectionInProgress: false,
  };
  private unsubscribeFromElectionMessages: (() => void) | null = null;

  constructor(
    private meshId: string,
    private agentId: string,
    private config: { heartbeatInterval: number; leaderTimeout: number; role: AgentRole; status: AgentStatus }
  ) {
    this.firestore = FirestoreClient.getInstance();
    this.setupElectionMessageHandler();
  }

  async start() {
    // Start sending heartbeats
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), this.config.heartbeatInterval);
    
    // Start presence monitoring
    this.presenceCheckInterval = setInterval(() => this.checkPresence(), this.config.heartbeatInterval);
  }

  async stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.presenceCheckInterval) clearInterval(this.presenceCheckInterval);
    this.cleanup();
  }

  private async sendHeartbeat(): Promise<void> {
    const heartbeat: Heartbeat = {
      agentId: this.agentId,
      timestamp: Date.now(),
      role: this.config.role,
      status: this.config.status,
      term: this.currentTerm,
      fencingToken: this.fencingToken
    };
    
    await this.firestore.updateHeartbeat(this.meshId, heartbeat);
    this.lastHeartbeat = Date.now();
  }

  private async checkPresence(): Promise<void> {
    const now = Date.now();
    const offlineAgents: string[] = [];

    for (const [agentId, status] of this.agents) {
      if (now - status.lastSeen > this.config.leaderTimeout!) {
        status.status = AgentStatus.Offline;
        offlineAgents.push(agentId);
      }
    }

    for (const agentId of offlineAgents) {
      await this.handleAgentOffline(agentId);
    }
  }

  private setupElectionMessageHandler(): void {
    if (this.unsubscribeFromElectionMessages) {
      this.unsubscribeFromElectionMessages();
    }

    this.unsubscribeFromElectionMessages = this.firestore.subscribeToElectionMessages(
      this.meshId,
      (messages: Map<string, ElectionMessage>) => {
        messages.forEach(message => {
          this.handleElectionMessage(message).catch(error => {
            console.error('Error handling election message:', error);
          });
        });
      }
    );
  }

  async handleElectionMessage(message: ElectionMessage): Promise<void> {
    if (!message.term) {
      throw new Error('Message term is required');
    }

    if (message.term > this.currentTerm) {
      this.currentTerm = message.term;
      this.votedFor = null;
    }

    if (message.type === 'vote_request') {
      const voteRequest = message as VoteRequest;
      const voteGranted = this.shouldGrantVote(voteRequest);
      const response: VoteResponse = {
        type: 'vote_response',
        term: this.currentTerm,
        voteGranted,
        timestamp: new Date(),
        from: this.agentId,
        to: message.from,
        candidateId: message.candidateId
      };
      await this.firestore.sendElectionMessage(this.meshId, response);
    } else if (message.type === 'vote_response') {
      const voteResponse = message as VoteResponse;
      if (voteResponse.voteGranted) {
        this.votedFor = message.from || null;
      }
    } else if (message.type === 'initial_leader') {
      if (message.candidateId === this.agentId) {
        this.currentTerm = 1;
        this.votedFor = message.from || null;
      }
    }
  }

  private shouldGrantVote(request: VoteRequest): boolean {
    if (!request.term || !request.lastLogTerm || !request.lastLogIndex) {
      return false;
    }

    if (request.term < this.currentTerm) return false;
    if (this.votedFor && this.votedFor !== request.from) return false;

    const lastLog = this.log[this.log.length - 1] || { term: 0 };
    if (request.lastLogTerm > lastLog.term) return true;
    if (request.lastLogTerm === lastLog.term && request.lastLogIndex >= this.log.length - 1) return true;
    return false;
  }

  private async handleAgentOffline(agentId: string): Promise<void> {
    const status: PresenceStatus = {
      agentId,
      lastSeen: Date.now(),
      role: AgentRole.Worker,
      status: AgentStatus.Offline,
      term: this.currentTerm,
      fencingToken: this.fencingToken
    };
    this.agents.set(agentId, status);
  }

  private async sendElectionMessage(message: ElectionMessage) {
    await this.firestore.sendElectionMessage(this.meshId, message);
  }

  private isLeader(): boolean {
    return !this.isElectionInProgress;
  }

  async receiveAction(agentId: string, action: AgentAction) {
    // Update agent presence
    await this.updateAgentPresence(agentId);
    
    // Validate, cascade or queue
    console.log(`[Leader] Received action from ${agentId}`, action);
  }

  private async updateAgentPresence(agentId: string) {
    const currentStatus = this.agents.get(agentId);
    if (!currentStatus) {
      console.log(`[MESH] New agent detected: ${agentId}`);
    }
    
    this.agents.set(agentId, {
      agentId,
      lastSeen: Date.now(),
      role: currentStatus?.role || AgentRole.Worker,
      status: currentStatus?.status || AgentStatus.Active,
      term: this.currentTerm,
      fencingToken: this.fencingToken
    });
  }

  async broadcastUpdate(payload: any, visibility: "public" | "internal") {
    // Send to Firestore with filtered targets
    console.log(`[Leader] Broadcasting ${visibility} update`, payload);
  }

  healthCheck() {
    return { 
      status: "healthy", 
      role: "leader", 
      meshId: this.meshId,
      lastHeartbeat: this.lastHeartbeat,
      agents: Array.from(this.agents.values())
    };
  }

  private startHeartbeatInterval() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      if (this.config.role === AgentRole.Leader && this.config.status === AgentStatus.Active) {
        await this.sendHeartbeat();
      }
    }, this.config.heartbeatInterval);
  }

  async handleAppendEntries(message: ElectionMessage): Promise<void> {
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
    if (this.unsubscribeFromElectionMessages) {
      this.unsubscribeFromElectionMessages();
      this.unsubscribeFromElectionMessages = null;
    }
  }
} 