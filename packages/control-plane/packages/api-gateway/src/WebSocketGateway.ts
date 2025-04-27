import WebSocket from 'ws';
import { ILogger } from '@ai-agent/multi-logger/types';
import { BaseApiGateway, BaseApiGatewayConfig } from './ApiGateway';

export interface WebSocketGatewayConfig extends BaseApiGatewayConfig {
    rateLimit?: {
        windowMs: number;
        max: number;
    };
}

export class WebSocketGateway extends BaseApiGateway {
    private wss: WebSocket.Server;
    private connections: Set<WebSocket> = new Set();

    constructor(config: WebSocketGatewayConfig) {
        super(config);
        this.wss = new WebSocket.Server({ port: this.port });
        this.setupWebSocketHandlers();
    }

    private setupWebSocketHandlers() {
        this.wss.on('connection', (ws: WebSocket) => {
            this.connections.add(ws);
            this.logger.info(`New WebSocket connection established. Total connections: ${this.connections.size}`);

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    this.logger.error('Error processing WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                this.connections.delete(ws);
                this.logger.info(`WebSocket connection closed. Total connections: ${this.connections.size}`);
            });
        });
    }

    private handleMessage(ws: WebSocket, data: any) {
        switch (data.type) {
            case 'state':
                ws.send(JSON.stringify({ state: 'active' }));
                break;
            default:
                this.logger.warn(`Unknown message type: ${data.type}`);
        }
    }

    async start(): Promise<void> {
        this.logger.info(`WebSocket Gateway started on port ${this.port}`);
    }

    async stop(): Promise<void> {
        // Close all connections
        this.connections.forEach(ws => ws.close());
        this.connections.clear();

        // Close the server
        return new Promise<void>((resolve) => {
            this.wss.close(() => {
                this.logger.info('WebSocket Gateway stopped');
                resolve();
            });
        });
    }
} 