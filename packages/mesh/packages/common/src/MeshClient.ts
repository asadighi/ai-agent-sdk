import { IMeshClient, AgentInfo, ElectionConfig, ElectionState } from "@ai-agent/mesh/types";
import { ILogger } from "@ai-agent/multi-logger/types";

/**
 * MeshClient is a class that implements the IMeshClient interface.
 * It is used to register agents, update their status, and get their statuses.
 * It also subscribes to heartbeats and election messages.
 * 
 * 
 */
export class MeshClient implements IMeshClient {
    private agentInfo: AgentInfo | null = null;
    private electionState: ElectionState = {
        term: 0,
        leaderId: null,
        votedFor: null
    };
    private connectedAgents: Map<string, AgentInfo> = new Map();
    private agentJoinedCallbacks: ((agent: AgentInfo) => void)[] = [];
    private agentLeftCallbacks: ((agentId: string) => void)[] = [];
    private leaderChangedCallbacks: ((leaderId: string | null) => void)[] = [];

    constructor(private readonly logger: ILogger) {
        if (!logger) {
            throw new Error("Logger is required");
        }
        this.logger = logger;
    }

    async connect(): Promise<void> {
        this.logger.info("Connecting to mesh network...");
        // TODO: Implement actual connection logic
    }

    async disconnect(): Promise<void> {
        this.logger.info("Disconnecting from mesh network...");
        // TODO: Implement actual disconnection logic
    }

    async getAgentInfo(): Promise<AgentInfo> {
        if (!this.agentInfo) {
            throw new Error("Agent not connected");
        }
        return this.agentInfo;
    }

    async updateAgentInfo(info: Partial<AgentInfo>): Promise<void> {
        if (!this.agentInfo) {
            throw new Error("Agent not connected");
        }
        this.agentInfo = { ...this.agentInfo, ...info };
        this.logger.info(`Updated agent info: ${JSON.stringify(info)}`);
    }

    async getConnectedAgents(): Promise<AgentInfo[]> {
        return Array.from(this.connectedAgents.values());
    }

    onAgentJoined(callback: (agent: AgentInfo) => void): void {
        this.agentJoinedCallbacks.push(callback);
    }

    onAgentLeft(callback: (agentId: string) => void): void {
        this.agentLeftCallbacks.push(callback);
    }

    async startElection(config: ElectionConfig): Promise<void> {
        this.logger.info(`Starting election with config: ${JSON.stringify(config)}`);
        // TODO: Implement actual election logic
    }

    async getElectionState(): Promise<ElectionState> {
        return this.electionState;
    }

    onLeaderChanged(callback: (leaderId: string | null) => void): void {
        this.leaderChangedCallbacks.push(callback);
    }
} 