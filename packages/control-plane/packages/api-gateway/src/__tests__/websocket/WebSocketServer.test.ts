import { WebSocketServer } from '../../websocket/WebSocketServer';
import { WebSocketHandler, WebSocketMiddleware, ApiGatewayConfig } from '@ai-agent/control-plane/types';
import { BaseApiGatewayConfig } from '../../ApiGateway';
import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logger, getNextPort } from '../setup';
import { createServer } from 'http';
import { EventEmitter } from 'events';

// Set NODE_ENV to test for shorter timeouts
process.env.NODE_ENV = 'test';

describe('WebSocketServer', () => {
    let server: WebSocketServer;
    let config: ApiGatewayConfig;
    let mockLogger: any;
    let mockWebSocket: any;
    let mockRequest: any;
    let wsPort: number;

    beforeEach(async () => {
        process.env.NODE_ENV = 'test';
        wsPort = await getNextPort();

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn()
        };

        mockWebSocket = new EventEmitter();
        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.send = vi.fn();
        mockWebSocket.close = vi.fn();

        mockRequest = {
            url: '/test',
            headers: {
                host: 'localhost:3000'
            }
        };

        config = {
            port: 3000,
            wsPort,
            logger: mockLogger
        };

        server = new WebSocketServer(config);
    });

    afterEach(async () => {
        await server.stop();
    });

    it('should register routes', () => {
        const handler = vi.fn();
        server.registerRoute('/test', handler);
        expect(mockLogger.info).toHaveBeenCalledWith('[WS] Registered route /test');
    });

    it('should handle WebSocket connections', async () => {
        const handler = vi.fn();
        server.registerRoute('/ws', handler);
        await server.start();

        const wss = server['wss'];
        if (!wss) throw new Error('WebSocket server not initialized');
        
        // Update mock request to match the registered route
        mockRequest.url = '/ws';
        
        // Emit connection event
        wss.emit('connection', mockWebSocket, mockRequest);
        
        // Wait for the connection handler to process
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Verify the handler was called with the correct arguments
        expect(handler).toHaveBeenCalledWith(mockWebSocket, mockRequest);
    });

    it('should handle WebSocket messages', async () => {
        const handler = vi.fn();
        server.registerRoute('/test', handler);
        await server.start();

        const wss = server['wss'];
        if (!wss) throw new Error('WebSocket server not initialized');

        // Set up the mock WebSocket
        mockWebSocket = new EventEmitter();
        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.send = vi.fn();
        mockWebSocket.close = vi.fn();

        // Set up the connection
        await server['handleConnection'](mockWebSocket, mockRequest);

        // Send the message
        mockWebSocket.emit('message', JSON.stringify({ type: 'test', data: 'test' }));
        expect(handler).toHaveBeenCalledWith(mockWebSocket, expect.any(Object));
    });

    it('should handle invalid JSON messages', async () => {
        await server.start();
        const wss = server['wss'];
        if (!wss) throw new Error('WebSocket server not initialized');

        // Set up the mock WebSocket
        mockWebSocket = new EventEmitter();
        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.send = vi.fn();
        mockWebSocket.close = vi.fn();

        // Set up the connection
        await server['handleConnection'](mockWebSocket, mockRequest);

        // Send invalid message and wait for response
        mockWebSocket.emit('message', 'invalid json');
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid message format' }));
    });

    it('should handle connection errors', async () => {
        await server.start();
        const wss = server['wss'];
        if (!wss) throw new Error('WebSocket server not initialized');

        // Set up the mock WebSocket
        mockWebSocket = new EventEmitter();
        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.send = vi.fn();
        mockWebSocket.close = vi.fn();

        // Set up the connection
        await server['handleConnection'](mockWebSocket, mockRequest);

        // Emit error and verify response
        mockWebSocket.emit('error', new Error('Test error'));
        expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Internal server error');
    });

    it('should handle connection timeouts', async () => {
        await server.start();
        const wss = server['wss'];
        if (!wss) throw new Error('WebSocket server not initialized');

        // Set up the mock WebSocket
        mockWebSocket = new EventEmitter();
        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.send = vi.fn();
        mockWebSocket.close = vi.fn();

        // Set up the connection
        await server['handleConnection'](mockWebSocket, mockRequest);

        // Wait for timeout and verify response
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Connection timeout');
    });

    it('should handle message timeouts', async () => {
        console.log('[TEST] Starting message timeout test');
        
        // Create a handler that takes longer than the timeout
        const handler = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));
        server.registerRoute('/test', handler);
        console.log('[TEST] Route registered');
        
        await server.start();
        console.log('[TEST] Server started');

        const wss = server['wss'];
        if (!wss) {
            console.error('[TEST] WebSocket server not initialized');
            throw new Error('WebSocket server not initialized');
        }
        console.log('[TEST] WebSocket server initialized');

        // Set up the mock WebSocket
        mockWebSocket = new EventEmitter();
        mockWebSocket.readyState = WebSocket.OPEN;
        const sendMock = vi.fn();
        mockWebSocket.send = sendMock;
        mockWebSocket.close = vi.fn();

        // Create a promise that resolves when the timeout message is sent
        const timeoutPromise = new Promise<void>((resolve, reject) => {
            console.log('[TEST] Setting up timeout promise');
            
            // Override the mock send function
            mockWebSocket.send = (data: string) => {
                console.log('[TEST] Message sent:', data);
                sendMock(data); // Keep track of the call for assertions
                const message = JSON.parse(data);
                if (message.error === 'Message processing timeout') {
                    console.log('[TEST] Timeout message received');
                    resolve();
                }
            };

            // Add a timeout to the promise
            setTimeout(() => {
                console.error('[TEST] Timeout promise timed out');
                reject(new Error('Timeout promise timed out'));
            }, 500);
        });

        // Set up the connection
        console.log('[TEST] Setting up connection');
        await server['handleConnection'](mockWebSocket, mockRequest);
        console.log('[TEST] Connection established');

        // Send the message
        console.log('[TEST] Emitting message event');
        mockWebSocket.emit('message', JSON.stringify({ type: 'test', data: 'test' }));

        try {
            await timeoutPromise;
            console.log('[TEST] Timeout promise resolved');
        } catch (error) {
            console.error('[TEST] Timeout promise failed:', error);
            throw error;
        }

        expect(sendMock).toHaveBeenCalledWith(JSON.stringify({ error: 'Message processing timeout' }));
    }, 1000);

    it('should start and stop the server', async () => {
        await server.start();
        expect(mockLogger.info).toHaveBeenCalledWith(`[WS] Server started on port ${wsPort}`);

        await server.stop();
        expect(mockLogger.info).toHaveBeenCalledWith('[WS] Server stopped');
    });

    it('should handle port conflicts', async () => {
        const server1 = new WebSocketServer({ ...config, wsPort });
        await server1.start();

        const server2 = new WebSocketServer({ ...config, wsPort });
        try {
            await server2.start();
            throw new Error('Expected server2.start() to fail');
        } catch (error: any) {
            expect(error.message).toContain(`Port ${wsPort} is already in use`);
        } finally {
            await server1.stop();
        }
    });
}); 