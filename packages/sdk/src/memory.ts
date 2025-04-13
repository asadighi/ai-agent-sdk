import { MemoryUpdate, MemoryScope } from './types.js';

export class Memory {
  private privateMemory: Record<string, any> = {};
  private internalMemory: Record<string, any> = {};
  private publicMemory: Record<string, any> = {};

  set(update: MemoryUpdate) {
    if (update.scope === "private") {
      this.privateMemory[update.key] = update.value;
    } else if (update.scope === "internal") {
      this.internalMemory[update.key] = update.value;
    } else {
      this.publicMemory[update.key] = update.value;
    }
  }

  get(scope: MemoryScope, key: string): any {
    if (scope === "private") return this.privateMemory[key];
    if (scope === "internal") return this.internalMemory[key];
    return this.publicMemory[key];
  }

  getAll(): Record<string, Record<string, any>> {
    return {
      private: this.privateMemory,
      internal: this.internalMemory,
      public: this.publicMemory,
    };
  }
} 