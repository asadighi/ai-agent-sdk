import { Logger, LogLevel } from '../index';
import { promises as fs } from 'fs';
import path from 'path';

describe('Logger', () => {
  let logger: Logger;
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'app.log');

  beforeEach(async () => {
    logger = new Logger();
    // Clean up logs before each test
    try {
      await fs.rm(logDir, { recursive: true, force: true });
    } catch {}
  });

  afterAll(async () => {
    // Clean up logs after all tests
    try {
      await fs.rm(logDir, { recursive: true, force: true });
    } catch {}
  });

  it('should create log entries', async () => {
    const message = 'Test log message';
    await logger.log(message, LogLevel.INFO);
    
    const logs = await logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe(message);
    expect(logs[0].level).toBe(LogLevel.INFO);
    expect(new Date(logs[0].timestamp)).toBeInstanceOf(Date);
  });

  it('should respect log level', async () => {
    const logger = new Logger({ level: LogLevel.WARN });

    await logger.log('Debug message', LogLevel.DEBUG);
    await logger.log('Info message', LogLevel.INFO);
    await logger.log('Warn message', LogLevel.WARN);
    await logger.log('Error message', LogLevel.ERROR);

    const logs = await logger.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs.map(log => log.level)).toEqual([LogLevel.WARN, LogLevel.ERROR]);
  });

  it('should clear logs', async () => {
    await logger.log('Test message');
    let logs = await logger.getLogs();
    expect(logs).toHaveLength(1);

    await logger.clear();
    logs = await logger.getLogs();
    expect(logs).toHaveLength(0);
  });
}); 