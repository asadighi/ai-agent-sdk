import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebStorage } from '../WebStorage';
import { LogLevel } from '@ai-agent/multi-logger/types';

describe('WebStorage', () => {
  let storage: WebStorage;

  beforeEach(() => {
    storage = new WebStorage(1000, 60000);
  });

  afterEach(() => {
    storage.clear();
    storage.stopRotation();
  });

  it('should store and retrieve logs', async () => {
    const entry = {
      message: 'test message',
      level: LogLevel.INFO,
      timestamp: Date.now()
    };

    await storage.log(entry);
    const logs = await storage.getLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual(entry);
  });

  it('should respect maxLogs limit', async () => {
    const maxLogs = 5;
    storage = new WebStorage(maxLogs);

    // Add more logs than the limit
    for (let i = 0; i < maxLogs + 2; i++) {
      await storage.log({
        message: `message ${i}`,
        level: LogLevel.INFO,
        timestamp: Date.now()
      });
    }

    const logs = await storage.getLogs();
    expect(logs).toHaveLength(maxLogs);
    expect(logs[0].message).toBe('message 2'); // First two should be dropped
  });

  it('should clear logs', async () => {
    await storage.log({
      message: 'test message',
      level: LogLevel.INFO,
      timestamp: Date.now()
    });

    await storage.clear();
    const logs = await storage.getLogs();
    expect(logs).toHaveLength(0);
  });

  it('should rotate logs based on interval', async () => {
    const rotationInterval = 100;
    storage = new WebStorage(1000, rotationInterval);

    await storage.log({
      message: 'test message',
      level: LogLevel.INFO,
      timestamp: Date.now()
    });

    // Wait for rotation
    await new Promise(resolve => setTimeout(resolve, rotationInterval + 10));

    const logs = await storage.getLogs();
    expect(logs).toHaveLength(0);
  });

  describe('stopRotation', () => {
    it('should stop log rotation', async () => {
      const storage = new WebStorage(100, 100);
      await storage.log({ message: 'test', level: LogLevel.INFO, timestamp: Date.now() });
      
      // Stop rotation
      storage.stopRotation();
      
      // Wait for rotation interval to pass
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Logs should still exist since rotation was stopped
      const logs = await storage.getLogs();
      expect(logs.length).toBe(1);
    });
  });
}); 