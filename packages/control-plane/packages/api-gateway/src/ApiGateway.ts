import { IApiGateway, RestHandler, RestMiddleware, WebSocketHandler, WebSocketMiddleware } from '@ai-agent/control-plane/types';
import { RestServer } from './rest/RestServer';
import { WebSocketServer } from './websocket/WebSocketServer';
import { ILogger } from '@ai-agent/multi-logger/types';

export interface BaseApiGatewayConfig {
    port: number;
    wsPort?: number; // Optional WebSocket port, if not provided will use port + 1
    logger: ILogger;
}

export abstract class BaseApiGateway {
    protected logger: ILogger;
    protected port: number;
    protected wsPort: number;

    constructor(config: BaseApiGatewayConfig) {
        this.logger = config.logger;
        this.port = config.port;
        this.wsPort = config.wsPort || config.port + 1;
    }

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
}

export class ApiGateway extends BaseApiGateway implements IApiGateway {
    private restServer: RestServer;
    private wsServer: WebSocketServer;

    constructor(config: BaseApiGatewayConfig) {
        super(config);
        this.restServer = new RestServer({ ...config, port: this.port });
        this.wsServer = new WebSocketServer({ ...config, wsPort: this.wsPort });
    }

    public async start(): Promise<void> {
        try {
            this.logger.info(`[Gateway] Starting REST server on port ${this.port}`);
            await this.restServer.start();
            
            this.logger.info(`[Gateway] Starting WebSocket server on port ${this.wsPort}`);
            await this.wsServer.start();
            
            this.logger.info('[Gateway] API Gateway started successfully');
        } catch (error) {
            this.logger.error('[Gateway] Failed to start API Gateway:', error);
            // Make sure to clean up if either server fails to start
            await this.stop().catch(() => {});
            throw error;
        }
    }

    public async stop(): Promise<void> {
        try {
            this.logger.info('[Gateway] Stopping REST server');
            await this.restServer.stop();
            
            this.logger.info('[Gateway] Stopping WebSocket server');
            await this.wsServer.stop();
            
            this.logger.info('[Gateway] API Gateway stopped successfully');
        } catch (error) {
            this.logger.error('[Gateway] Failed to stop API Gateway:', error);
            throw error;
        }
    }

    public registerRestRoute(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        path: string,
        handler: RestHandler,
        middleware?: RestMiddleware[]
    ): void {
        this.restServer.registerRoute(method, path, handler, middleware);
    }

    public registerWebSocketRoute(
        path: string,
        handler: WebSocketHandler,
        middleware?: WebSocketMiddleware[]
    ): void {
        if (middleware) {
            middleware.forEach(m => this.wsServer.registerGlobalMiddleware(m));
        }
        this.wsServer.registerRoute(path, handler);
    }

    public registerRestMiddleware(middleware: RestMiddleware): void {
        this.restServer.registerGlobalMiddleware(middleware);
    }

    public registerWebSocketMiddleware(middleware: WebSocketMiddleware): void {
        this.wsServer.registerGlobalMiddleware(middleware);
    }
} 