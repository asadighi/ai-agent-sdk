import { MeshClient } from '@ai-agent/core-sdk';
export class WebWorkerAgent {
    constructor(config) {
        this.config = config;
        this.isInitialized = false;
        this.agentId = config.agentId;
        this.client = new MeshClient(config.firebaseConfig);
    }
    async init() {
        try {
            await this.client.registerAgent({
                agentId: this.agentId,
                meshId: this.config.meshId,
                role: this.config.role,
                status: this.config.status
            });
            this.isInitialized = true;
            self.postMessage({ type: 'initialized' }, '*');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            self.postMessage({ type: 'error', error: errorMessage }, '*');
        }
    }
    async sendAction() {
        try {
            if (!this.isInitialized) {
                self.postMessage({ type: 'error', error: 'Agent not initialized' }, '*');
                return;
            }
            await this.client.sendElectionMessage(this.config.meshId, {
                type: 'request_vote',
                term: 0,
                candidateId: this.agentId,
                timestamp: new Date(),
                lastLogTerm: 0,
                lastLogIndex: 0
            });
            self.postMessage({ type: 'action_sent' }, '*');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            self.postMessage({ type: 'error', error: errorMessage }, '*');
        }
    }
}
//# sourceMappingURL=webWorkerAgent.js.map