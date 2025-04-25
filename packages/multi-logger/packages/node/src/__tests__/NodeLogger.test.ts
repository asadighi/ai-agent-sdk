import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeLogger } from '../NodeLogger';
import { LogLevel } from '@ai-agent/multi-logger/types';

describe('NodeLogger', () => {
    let logger: NodeLogger;

    beforeEach(() => {
        logger = new NodeLogger({
            logLevel: LogLevel.DEBUG,
            logToConsole: false
        });
    });

    afterEach(() => {
        logger.clear();
    });

    it('should log messages with correct level', async () => {
        await logger.debug('debug message');
        await logger.info('info message');
        await logger.warn('warn message');
        await logger.error('error message');

        const logs = await logger.getLogs();
        expect(logs).toHaveLength(4);
        expect(logs[0].level).toBe(LogLevel.DEBUG);
        expect(logs[1].level).toBe(LogLevel.INFO);
        expect(logs[2].level).toBe(LogLevel.WARN);
        expect(logs[3].level).toBe(LogLevel.ERROR);
    });

    it('should respect log level configuration', async () => {
        const warnLogger = new NodeLogger({
            logLevel: LogLevel.WARN,
            logToConsole: false
        });

        await warnLogger.debug('debug message');
        await warnLogger.info('info message');
        await warnLogger.warn('warn message');
        await warnLogger.error('error message');

        const logs = await warnLogger.getLogs();
        expect(logs).toHaveLength(2);
        expect(logs[0].level).toBe(LogLevel.WARN);
        expect(logs[1].level).toBe(LogLevel.ERROR);
    });

    it('should include data in log messages', async () => {
        const data = { key: 'value' };
        await logger.info('message', data);

        const logs = await logger.getLogs();
        expect(logs[0].message).toContain(JSON.stringify(data));
    });

    it('should clear logs', async () => {
        await logger.info('message');
        await logger.clear();
        const logs = await logger.getLogs();
        expect(logs).toHaveLength(0);
    });
}); 