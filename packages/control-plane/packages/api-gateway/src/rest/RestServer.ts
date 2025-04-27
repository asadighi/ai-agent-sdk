import express, { Router, Request, Response, NextFunction } from 'express';
import { RestHandler, RestMiddleware } from '@ai-agent/control-plane/types';
import { ApiGatewayConfig } from '@ai-agent/control-plane/types';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Server } from 'http';

export class RestServer {
    private app: express.Application;
    private server: Server | null = null;
    private isRunning: boolean = false;
    private globalMiddleware: RestMiddleware[] = [];
    private middlewareNames: Set<string> = new Set();

    constructor(private config: ApiGatewayConfig) {
        this.app = express();
        this.setupMiddleware();
    }

    private setupMiddleware() {
        // JSON parsing middleware
        this.app.use(express.json());
        this.middlewareNames.add('jsonParser');
        this.config.logger.info('[REST] Set up JSON parsing middleware');

        // CORS middleware
        this.app.use(cors(this.config.cors));
        this.middlewareNames.add('corsMiddleware');
        this.config.logger.info('[REST] Set up CORS middleware with default config');

        // Rate limiting middleware
        const rateLimitConfig = this.config.rateLimit || {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        };
        this.app.use(rateLimit(rateLimitConfig));
        this.middlewareNames.add('rateLimit');
        this.config.logger.info('[REST] Set up rate limiting middleware with default config');
    }

    private setupErrorHandlers() {
        // Error handling middleware - should be registered after routes
        this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            this.config.logger.error('[REST] Error:', err);
            // Ensure we haven't already sent a response
            if (res.headersSent) {
                return next(err);
            }
            // Send error response with generic message
            res.status(500).json({
                error: 'Internal Server Error'
            });
        });

        // 404 handler - should be registered last
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({ error: 'Not Found' });
        });
        this.config.logger.info('[REST] Set up error handlers');
    }

    public hasMiddleware(name: string): boolean {
        return this.middlewareNames.has(name);
    }

    public registerRoute(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        path: string,
        handler: RestHandler,
        middleware?: RestMiddleware[]
    ): void {
        const routeMiddleware = middleware || [];

        // Wrap the handler to properly handle async errors
        const wrappedHandler = async (req: Request, res: Response, next: NextFunction) => {
            try {
                await handler(req, res);
            } catch (error) {
                next(error);
            }
        };

        // Create a router for this specific route
        const router = Router();

        // Register the route with all middleware and handler
        switch (method) {
            case 'GET':
                router.get('/', wrappedHandler);
                break;
            case 'POST':
                router.post('/', wrappedHandler);
                break;
            case 'PUT':
                router.put('/', wrappedHandler);
                break;
            case 'DELETE':
                router.delete('/', wrappedHandler);
                break;
            case 'PATCH':
                router.patch('/', wrappedHandler);
                break;
        }

        // Apply all middleware and mount the router
        const allMiddleware = [...this.globalMiddleware, ...routeMiddleware];
        if (allMiddleware.length > 0) {
            this.app.use(path, allMiddleware);
        }
        this.app.use(path, router);
        this.config.logger.info(`[REST] Registered ${method} ${path}`);
    }

    public registerGlobalMiddleware(middleware: RestMiddleware): void {
        this.globalMiddleware.push(middleware);
        this.config.logger.info('[REST] Registered global middleware');
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Server is already running');
        }

        // Set up error handlers after all routes have been registered
        this.setupErrorHandlers();

        return new Promise<void>((resolve, reject) => {
            try {
                this.server = this.app.listen(this.config.port, () => {
                    this.isRunning = true;
                    this.config.logger.info(`[REST] Server started on port ${this.config.port}`);
                    resolve();
                }).on('error', (err: Error) => {
                    this.config.logger.error('[REST] Failed to start server', err);
                    reject(err);
                });
            } catch (error) {
                this.config.logger.error('[REST] Failed to start server', error);
                reject(error);
            }
        });
    }

    public async stop(): Promise<void> {
        if (!this.isRunning || !this.server) {
            return;
        }

        const server = this.server;
        return new Promise<void>((resolve, reject) => {
            try {
                server.close((err?: Error) => {
                    if (err) {
                        this.config.logger.error('[REST] Failed to stop server', err);
                        reject(err);
                    } else {
                        this.isRunning = false;
                        this.server = null;
                        this.config.logger.info('[REST] Server stopped');
                        resolve();
                    }
                });
            } catch (error) {
                this.config.logger.error('[REST] Failed to stop server', error);
                reject(error);
            }
        });
    }
} 