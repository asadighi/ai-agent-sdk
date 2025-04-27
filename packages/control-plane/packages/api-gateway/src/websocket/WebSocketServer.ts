import { WebSocketHandler, WebSocketMiddleware } from '@ai-agent/control-plane/types';
import { BaseApiGatewayConfig } from '../ApiGateway';
import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { createServer, Server as HttpServer, IncomingMessage } from 'http';
import { ApiGatewayConfig } from '@ai-agent/control-plane/types';

export class WebSocketServer {
    private server: HttpServer;
    private wss: WSServer | null = null;
    private connections: Set<WebSocket> = new Set();
    private globalMiddleware: WebSocketMiddleware[] = [];
    private routes: Map<string, WebSocketHandler> = new Map();
    private isRunning: boolean = false;
    private connectionTimeout: NodeJS.Timeout | null = null;
    private messageTimeout: NodeJS.Timeout | null = null;

    constructor(private config: ApiGatewayConfig) {
        this.server = createServer();
    }

    private handleMessage(ws: WebSocket, data: string, handler: WebSocketHandler | null): void {
        try {
            console.log('[WS] Handling message:', data);
            // Try to parse the message first
            let message;
            try {
                message = JSON.parse(data.toString());
                console.log('[WS] Parsed message:', message);
            } catch (parseError) {
                console.error('[WS] Invalid JSON message:', data.toString());
                this.config.logger.error('Invalid JSON message:', data.toString());
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                }
                return;
            }
            
            // If no handler is registered, send an error
            if (!handler) {
                console.error('[WS] No handler registered for message');
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ error: 'No handler registered' }));
                }
                return;
            }

            let timeoutId: NodeJS.Timeout | null = null;
            let isHandlerCompleted = false;

            // Set up the timeout
            timeoutId = setTimeout(() => {
                console.log('[WS] Message timeout triggered');
                if (!isHandlerCompleted && ws.readyState === WebSocket.OPEN) {
                    console.log('[WS] Sending timeout error message');
                    ws.send(JSON.stringify({ error: 'Message processing timeout' }));
                }
            }, 100); // Increased timeout to 100ms

            // Handle the message
            console.log('[WS] Calling message handler');
            handler(ws, message)
                .then(() => {
                    console.log('[WS] Handler completed successfully');
                    isHandlerCompleted = true;
                })
                .catch(error => {
                    console.error('[WS] Handler failed:', error);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ error: 'Error processing message' }));
                    }
                })
                .finally(() => {
                    if (timeoutId) {
                        console.log('[WS] Clearing message timeout');
                        clearTimeout(timeoutId);
                    }
                });
        } catch (error) {
            console.error('[WS] Error in handleMessage:', error);
            this.config.logger.error('Error processing message:', error);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ error: 'Error processing message' }));
            }
        }
    }

    private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
        try {
            this.connections.add(ws);
            this.config.logger.info(`[WS] New connection established. Total connections: ${this.connections.size}`);

            // Set connection timeout first
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, 'Connection timeout');
                }
            }, 100);

            // Apply global middleware
            for (const middleware of this.globalMiddleware) {
                await middleware(ws, req);
            }

            // Get the handler for this path
            const path = req.url || '/';
            const handler = this.routes.get(path) || null;

            // Call the handler directly if one exists
            if (handler) {
                await handler(ws, req);
            }

            // Handle messages
            ws.on('message', (data: string) => this.handleMessage(ws, data, handler));

            // Handle errors
            ws.on('error', (error) => {
                this.config.logger.error('WebSocket error:', error);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, 'Internal server error');
                }
            });

            // Clear connection timeout and cleanup on close
            ws.on('close', () => {
                clearTimeout(connectionTimeout);
                this.connections.delete(ws);
                this.config.logger.info(`[WS] Connection closed. Total connections: ${this.connections.size}`);
            });

        } catch (error) {
            this.config.logger.error('Error in connection handler:', error);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Connection handler error');
            }
            this.connections.delete(ws);
        }
    }

    public registerRoute(path: string, handler: WebSocketHandler): void {
        this.routes.set(path, handler);
        this.config.logger.info(`[WS] Registered route ${path}`);
    }

    public registerGlobalMiddleware(middleware: WebSocketMiddleware): void {
        this.globalMiddleware.push(middleware);
        this.config.logger.info('[WS] Registered global middleware');
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Server is already running');
        }

        return new Promise<void>((resolve, reject) => {
            try {
                const port = this.config.wsPort || this.config.port + 1;
                console.log(`[WS] Starting server on port ${port}`);

                // Create the WebSocket server
                this.wss = new WSServer({ noServer: true });
                
                // Handle upgrade requests
                this.server.on('upgrade', (request, socket, head) => {
                    if (request.url?.startsWith('/ws')) {
                        this.wss?.handleUpgrade(request, socket, head, (ws) => {
                            this.wss?.emit('connection', ws, request);
                        });
                    }
                });

                // Handle WebSocket connections
                this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
                    console.log('[WS] New connection request:', req.url);
                    this.handleConnection(ws, req).catch(error => {
                        this.config.logger.error('Error in connection handler:', error);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.close(1000, 'Connection handler error');
                        }
                    });
                });

                // Handle server errors
                this.server.on('error', (error: Error & { code?: string }) => {
                    this.config.logger.error('Server error:', error);
                    if (error.code === 'EADDRINUSE') {
                        reject(new Error(`Port ${port} is already in use`));
                    } else {
                        reject(error);
                    }
                });

                // Start the HTTP server
                this.server.listen(port, () => {
                    this.isRunning = true;
                    this.config.logger.info(`[WS] Server started on port ${port}`);
                    resolve();
                });

            } catch (error) {
                this.config.logger.error('Error starting server:', error);
                reject(error);
            }
        });
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        return new Promise<void>((resolve) => {
            try {
                // Close all active connections
                this.connections.forEach(ws => {
                    try {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.close();
                        }
                    } catch (error) {
                        this.config.logger.error('Error closing WebSocket connection:', error);
                    }
                });
                this.connections.clear();

                // Close the WebSocket server first
                if (this.wss) {
                    this.wss.close(() => {
                        // Then close the HTTP server
                        this.server.close(() => {
                            this.isRunning = false;
                            this.wss = null;
                            this.config.logger.info('[WS] Server stopped');
                            resolve();
                        });
                    });
                } else {
                    // Close the HTTP server if WebSocket server is not initialized
                    this.server.close(() => {
                        this.isRunning = false;
                        this.config.logger.info('[WS] Server stopped');
                        resolve();
                    });
                }
            } catch (error) {
                this.config.logger.error('Error stopping server:', error);
                this.isRunning = false;
                this.wss = null;
                resolve();
            }
        });
    }
} 