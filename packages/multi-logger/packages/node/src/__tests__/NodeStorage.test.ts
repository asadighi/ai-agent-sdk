import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeStorage } from '../NodeStorage';
import { LogLevel } from '@ai-agent/multi-logger/types';
import * as fs from 'fs';

describe('NodeStorage', () => {
    let storage: NodeStorage;
    const testLogFile = 'test-logs.json';

    beforeEach(() => {
        storage = new NodeStorage(1000, 60000, testLogFile);
    });

    afterEach(() => {
        storage.clear();
        storage.stopRotation();
        if (fs.existsSync(testLogFile)) {
            fs.unlinkSync(testLogFile);
        }
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
        storage = new NodeStorage(maxLogs, 60000, testLogFile);

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
        storage = new NodeStorage(1000, rotationInterval, testLogFile);

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

    it('should persist logs to file', async () => {
        const entry = {
            message: 'test message',
            level: LogLevel.INFO,
            timestamp: Date.now()
        };

        await storage.log(entry);

        // Create a new storage instance to read from file
        const newStorage = new NodeStorage(1000, 60000, testLogFile);
        const logs = await newStorage.getLogs();

        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual(entry);
    });
}); 