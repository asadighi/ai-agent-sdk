import { AgentConfig, AgentAction, MemoryUpdate } from "./types.js";
import { Memory } from "./memory.js";

export class Agent {
  private config: AgentConfig;
  private memory: Memory;

  constructor(config: AgentConfig) {
    this.config = config;
    this.memory = new Memory();
  }

  setMemory(update: MemoryUpdate) {
    this.memory.set(update);
  }

  getMemory() {
    return this.memory.getAll();
  }

  async sendAction(action: AgentAction) {
    // Dummy placeholder for sending to Firestore or function call
    console.log(`Sending action from ${this.config.agentId}:`, action);
  }

  healthCheck() {
    return { status: "healthy", agentId: this.config.agentId };
  }
}