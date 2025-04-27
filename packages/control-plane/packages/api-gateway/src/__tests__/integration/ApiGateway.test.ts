import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiGateway } from '../../ApiGateway';
import { ILogger } from '@ai-agent/multi-logger/types';
import { ApiGatewayConfig } from '@ai-agent/control-plane/types';
import { WebSocket } from 'ws';
import axios from 'axios';
import { getNextPort } from '../setup';
import { RestMiddleware } from '@ai-agent/control-plane/types';

// Set NODE_ENV to test for shorter timeouts
process.env.NODE_ENV = 'test';

// Configure axios defaults for tests
axios.defaults.timeout = 500; // 500ms timeout for all requests
axios.defaults.validateStatus = () => true; // Don't throw on non-2xx status codes

describe('ApiGateway Integration', () => {
    let mockLogger: ILogger;
    let config: ApiGatewayConfig;
    let gateway: ApiGateway;
    let wsClient: WebSocket;
    let restPort: number;
    let middlewareSpy: RestMiddleware;

    beforeEach(async () => {
        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            log: vi.fn(),
            getLogs: vi.fn(),
            clear: vi.fn()
        };

        try {
            console.log('[TEST] Getting next available ports');
            restPort = await getNextPort();
            const wsPort = await getNextPort();
            console.log(`[TEST] Using REST port ${restPort} and WebSocket port ${wsPort}`);

            config = {
                port: restPort,
                wsPort,
                logger: mockLogger
            };

            console.log('[TEST] Creating ApiGateway instance');
            gateway = new ApiGateway(config);
            
            // Register routes before starting the server
            console.log('[TEST] Registering test routes');
            gateway.registerRestRoute('GET', '/test', (req, res) => {
                res.json({ message: 'Hello World' });
            });
            gateway.registerRestRoute('POST', '/test', (req, res) => {
                res.json(req.body);
            });
            gateway.registerRestRoute('GET', '/error', (req, res) => {
                throw new Error('Test error');
            });
            
            // Register middleware route
            middlewareSpy = vi.fn((req: any, res: any, next: any) => {
                req.user = { id: '123' };
                next();
            });
            gateway.registerRestMiddleware(middlewareSpy);
            gateway.registerRestRoute('GET', '/middleware', (req, res) => {
                res.json({ userId: req.user?.id });
            });
            
            console.log('[TEST] Starting ApiGateway');
            const startTime = Date.now();
            await gateway.start();
            console.log(`[TEST] ApiGateway started in ${Date.now() - startTime}ms`);
        } catch (error) {
            console.error('[TEST] Failed to start ApiGateway:', error);
            throw error;
        }
    });

    afterEach(async () => {
        try {
            console.log('[TEST] Cleaning up test');
            if (wsClient) {
                console.log('[TEST] Closing WebSocket client');
                wsClient.close();
            }
            if (gateway) {
                console.log('[TEST] Stopping ApiGateway');
                const startTime = Date.now();
                await gateway.stop();
                console.log(`[TEST] ApiGateway stopped in ${Date.now() - startTime}ms`);
            }
            // Wait a bit to ensure ports are released
            console.log('[TEST] Waiting for port cleanup');
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('[TEST] Cleanup complete');
        } catch (error) {
            console.error('[TEST] Failed to stop ApiGateway:', error);
        }
    });

    describe('REST API', () => {
        it('should handle GET requests', async () => {
            try {
                console.log(`[TEST] Making GET request to http://localhost:${restPort}/test`);
                const startTime = Date.now();
                const result = await axios.get(`http://localhost:${restPort}/test`, {
                    timeout: 1000,
                    validateStatus: null
                });
                console.log(`[TEST] GET request completed in ${Date.now() - startTime}ms with status ${result.status}`);
                expect(result.data).toEqual({ message: 'Hello World' });
            } catch (error: any) {
                console.error('[TEST] GET request failed:', error.message);
                if (error.code === 'ECONNREFUSED') {
                    console.error('[TEST] Server appears to be not running');
                }
                throw error;
            }
        }, 2000); // Increased timeout for debugging

        it('should handle POST requests', async () => {
            const data = { name: 'Test' };
            try {
                console.log(`[TEST] Making POST request to http://localhost:${restPort}/test`);
                const startTime = Date.now();
                const result = await axios.post(`http://localhost:${restPort}/test`, data, {
                    timeout: 1000,
                    validateStatus: null
                });
                console.log(`[TEST] POST request completed in ${Date.now() - startTime}ms with status ${result.status}`);
                expect(result.data).toEqual(data);
            } catch (error: any) {
                console.error('[TEST] POST request failed:', error.message);
                if (error.code === 'ECONNREFUSED') {
                    console.error('[TEST] Server appears to be not running');
                }
                throw error;
            }
        }, 2000); // Increased timeout for debugging

        it('should apply middleware', async () => {
            const result = await axios.get(`http://localhost:${restPort}/middleware`);
            expect(result.data).toEqual({ userId: '123' });
            expect(middlewareSpy).toHaveBeenCalled();
        }, 1000); // 1 second timeout
    });

    describe('WebSocket API', () => {
        it('should handle WebSocket connections', async () => {
            const messages: any[] = [];
            gateway.registerWebSocketRoute('/ws', async (socket) => {
                console.log('[TEST] WebSocket handler called');
                socket.on('message', (data) => {
                    console.log('[TEST] Message received in handler:', data.toString());
                    const message = JSON.parse(data.toString());
                    messages.push(message);
                    socket.send(JSON.stringify({ echo: message }));
                });
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'));
                }, 1000); // Increased timeout for debugging

                // Use the correct WebSocket port
                const wsPort = config.wsPort || config.port + 1;
                console.log(`[TEST] Connecting to WebSocket server at ws://localhost:${wsPort}/ws`);
                wsClient = new WebSocket(`ws://localhost:${wsPort}/ws`);
                
                wsClient.on('open', () => {
                    console.log('[TEST] WebSocket connection opened');
                    wsClient.send(JSON.stringify({ type: 'test' }));
                    console.log('[TEST] Sent test message');
                });

                wsClient.on('message', (data) => {
                    console.log('[TEST] Received message:', data.toString());
                    clearTimeout(timeout);
                    const response = JSON.parse(data.toString());
                    expect(response).toEqual({ echo: { type: 'test' } });
                    expect(messages).toEqual([{ type: 'test' }]);
                    resolve();
                });

                wsClient.on('error', (error) => {
                    console.error('[TEST] WebSocket error:', error);
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        }, 2000); // Increased timeout for debugging

        it('should apply WebSocket middleware', async () => {
            const middleware = vi.fn(async (socket, req) => {
                (socket as any).user = { id: '123' };
            });

            gateway.registerWebSocketMiddleware(middleware);
            gateway.registerWebSocketRoute('/ws', async (socket) => {
                socket.on('message', (data) => {
                    socket.send(JSON.stringify({ userId: (socket as any).user?.id }));
                });
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'));
                }, 1000);

                // Use the correct WebSocket port
                const wsPort = config.wsPort || config.port + 1;
                wsClient = new WebSocket(`ws://localhost:${wsPort}/ws`);
                
                wsClient.on('open', () => {
                    wsClient.send(JSON.stringify({ type: 'test' }));
                });

                wsClient.on('message', (data) => {
                    clearTimeout(timeout);
                    const response = JSON.parse(data.toString());
                    expect(response).toEqual({ userId: '123' });
                    expect(middleware).toHaveBeenCalled();
                    resolve();
                });

                wsClient.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        }, 2000);

        it('should handle WebSocket errors', async () => {
            gateway.registerWebSocketRoute('/ws', async (socket) => {
                socket.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'error') {
                            throw new Error('Test error');
                        }
                        socket.send(JSON.stringify({ type: 'success' }));
                    } catch (error) {
                        socket.send(JSON.stringify({ error: 'Error processing message' }));
                    }
                });
            });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'));
                }, 1000);

                // Use the correct WebSocket port
                const wsPort = config.wsPort || config.port + 1;
                wsClient = new WebSocket(`ws://localhost:${wsPort}/ws`);
                
                wsClient.on('open', () => {
                    wsClient.send(JSON.stringify({ type: 'error' }));
                });

                wsClient.on('message', (data) => {
                    clearTimeout(timeout);
                    const response = JSON.parse(data.toString());
                    expect(response).toEqual({ error: 'Error processing message' });
                    resolve();
                });

                wsClient.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        }, 2000);
    });

    describe('Error Handling', () => {
        it('should handle REST errors', async () => {
            const result = await axios.get(`http://localhost:${restPort}/error`);
            expect(result.status).toBe(500);
            expect(result.data).toEqual({
                error: 'Internal Server Error'
            });
        }, 1000); // 1 second timeout
    });
}); 