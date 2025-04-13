import { AgentConfig, AgentAction } from './types.js';
import { FirestoreClient } from './fireStoreClient.js';

class WebWorkerAgent {
  private agentId: string;
  private isInitialized = false;

  constructor(private config: AgentConfig) {
    this.agentId = config.agentId;
  }

  async init() {
    try {
      await FirestoreClient.registerAgent(this.agentId, this.config.meshId, this.config.role);
      this.isInitialized = true;
      self.postMessage({ type: 'initialized' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      self.postMessage({ type: 'error', error: errorMessage });
    }
  }

  async sendAction(action: AgentAction) {
    try {
      if (!this.isInitialized) {
        self.postMessage({ type: 'error', error: 'Agent not initialized' });
        return;
      }
      await FirestoreClient.emitEvent(this.config.meshId, {
        from: this.agentId,
        type: 'action',
        payload: action.payload,
        permission: {
          scope: 'public'
        }
      });
      self.postMessage({ type: 'action_sent' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      self.postMessage({ type: 'error', error: errorMessage });
    }
  }
}

// Create a single agent instance
let workerAgent: WebWorkerAgent | null = null;

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      const config = data as AgentConfig;
      workerAgent = new WebWorkerAgent(config);
      await workerAgent.init();
      break;

    case 'action':
      if (!data.type || !data.payload) {
        self.postMessage({ type: 'error', error: 'Invalid action data' });
        return;
      }
      const actionData: AgentAction = {
        type: data.type,
        payload: data.payload
      };
      if (workerAgent) {
        await workerAgent.sendAction(actionData);
      } else {
        self.postMessage({ type: 'error', error: 'Agent not initialized' });
      }
      break;

    default:
      self.postMessage({ type: 'error', error: `Unknown message type: ${type}` });
  }
}; 