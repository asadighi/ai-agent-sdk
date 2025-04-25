import type { AgentConfig } from '@ai-agent/core-sdk';
export declare class WebWorkerAgent {
    private config;
    private agentId;
    private isInitialized;
    private client;
    constructor(config: AgentConfig);
    init(): Promise<void>;
    sendAction(): Promise<void>;
}
//# sourceMappingURL=webWorkerAgent.d.ts.map