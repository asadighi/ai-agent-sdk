import { beforeAll, afterAll } from 'vitest';
import { createTestLogger } from './utils';
import { createServer } from 'net';

// Mock console methods to keep test output clean
const originalConsole = { ...console };
console.log = () => {};
console.error = () => {};
console.warn = () => {};
console.info = () => {};

// Restore console methods after tests
afterAll(() => {
    Object.assign(console, originalConsole);
});

// Base port configuration - start at a higher port to avoid conflicts
const BASE_PORT = 40000;

// Function to check if a port is available
async function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

// Function to get a unique port for each test
let portCounter = 0;
export async function getNextPort(): Promise<number> {
    let port = BASE_PORT + portCounter++;
    while (!(await isPortAvailable(port))) {
        port = BASE_PORT + portCounter++;
    }
    return port;
}

const logger = createTestLogger();

export { logger }; 