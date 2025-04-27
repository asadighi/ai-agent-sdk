import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RestServer } from '../../rest/RestServer';
import { ApiGatewayConfig } from '@ai-agent/control-plane/types';
import express from 'express';

describe('RestServer', () => {
    let server: RestServer;
    let config: ApiGatewayConfig;
    let mockLogger: any;

    beforeEach(async () => {
        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn()
        };

        config = {
            port: 3000,
            logger: mockLogger,
            cors: {
                origin: '*'
            },
            rateLimit: {
                windowMs: 15 * 60 * 1000,
                max: 100
            }
        };

        server = new RestServer(config);
    });

    afterEach(async () => {
        if (server) {
            await server.stop();
        }
    });

    it('should initialize with default middleware', () => {
        expect(server.hasMiddleware('jsonParser')).toBe(true);
        expect(server.hasMiddleware('corsMiddleware')).toBe(true);
        expect(server.hasMiddleware('rateLimit')).toBe(true);
    });

    it('should register routes', async () => {
        let handlerCalled = false;
        const handler = (req: any, res: any) => {
            handlerCalled = true;
            res.status(200).json({ success: true });
        };
        server.registerRoute('GET', '/test', handler);
        await server.start();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        try {
            const response = await fetch('http://localhost:3000/test', {
                signal: controller.signal
            });
            expect(response.ok).toBe(true);
            expect(handlerCalled).toBe(true);
        } finally {
            clearTimeout(timeout);
        }
    }, 10000);

    it('should handle 404 errors with JSON response', async () => {
        await server.start();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        try {
            const response = await fetch('http://localhost:3000/nonexistent', {
                signal: controller.signal
            });
            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data).toEqual({ error: 'Not Found' });
        } finally {
            clearTimeout(timeout);
        }
    }, 10000);

    it('should handle 500 errors with JSON response', async () => {
        const errorHandler = (req: any, res: any) => {
            res.status(500).json({ error: 'Internal Server Error' });
        };
        
        // Register error route
        server.registerRoute('GET', '/error', errorHandler);

        // Start server and wait for it to be ready
        await server.start();
        await new Promise(resolve => setTimeout(resolve, 100)); // Give server time to start

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        try {
            const response = await fetch('http://localhost:3000/error', {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            // Don't throw on 500 status - it's expected
            const data = await response.json();
            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Internal Server Error' });
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        } finally {
            clearTimeout(timeout);
            await server.stop();
        }
    }, 10000);

    it('should register global middleware', async () => {
        let middlewareCalled = false;
        const middleware = (req: any, res: any, next: any) => {
            middlewareCalled = true;
            next();
        };
        
        // Register middleware and route
        server.registerGlobalMiddleware(middleware);
        server.registerRoute('GET', '/test', (req: any, res: any) => {
            res.status(200).json({ success: true });
        });

        // Start server and wait for it to be ready
        await server.start();
        await new Promise(resolve => setTimeout(resolve, 100)); // Give server time to start

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        try {
            const response = await fetch('http://localhost:3000/test', {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            expect(data).toEqual({ success: true });
            expect(middlewareCalled).toBe(true);
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        } finally {
            clearTimeout(timeout);
            await server.stop();
        }
    }, 10000);

    it('should start and stop the server', async () => {
        await server.start();
        expect(mockLogger.info).toHaveBeenCalledWith('[REST] Server started on port 3000');

        await server.stop();
        expect(mockLogger.info).toHaveBeenCalledWith('[REST] Server stopped');
    }, 10000);

    it('should handle port conflicts', async () => {
        const server1 = new RestServer(config);
        await server1.start();

        const server2 = new RestServer({ ...config, port: 3000 });
        try {
            await server2.start();
        } catch (error: any) {
            expect(error.message).toContain('EADDRINUSE');
        }

        await server1.stop();
    }, 10000);
}); 