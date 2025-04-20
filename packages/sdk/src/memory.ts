import { MemoryUpdate, MemoryScope } from './types.js';

export class Memory {
  private data: Map<string, any> = new Map();

  set(key: string, value: any) {
    this.data.set(key, value);
  }

  get(key: string) {
    return this.data.get(key);
  }

  getAll() {
    return Object.fromEntries(this.data);
  }
} 