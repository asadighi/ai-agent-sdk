import express from 'express';
import { ILogger } from '@ai-agent/multi-logger/types';
import { BaseApiGateway, BaseApiGatewayConfig } from './ApiGateway';

export interface RESTGatewayConfig extends BaseApiGatewayConfig {
    rateLimit?: {
        windowMs: number;
        max: number;
    };
}

export class RESTGateway extends BaseApiGateway {
    private app: express.Application;
    private server: any;

    constructor(config: RESTGatewayConfig) {
        super(config);
        this.app = express();
        this.setupMiddleware(config);
        this.setupRoutes();
    }

    private setupMiddleware(config: RESTGatewayConfig) {
        // Basic middleware
        this.app.use(express.json());
        
        // Rate limiting if configured
        if (config.rateLimit) {
            const rateLimit = require('express-rate-limit');
            this.app.use(rateLimit({
                windowMs: config.rateLimit.windowMs,
                max: config.rateLimit.max
            }));
        }
    }

    private setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });

        // Agent routes
        this.app.get('/agents', (req, res) => {
            res.json([]);
        });

        this.app.get('/agents/:id', (req, res) => {
            res.json({ id: req.params.id });
        });

        this.app.post('/agents/:id/connect', (req, res) => {
            res.json({ status: 'connected' });
        });

        this.app.post('/agents/:id/disconnect', (req, res) => {
            res.json({ status: 'disconnected' });
        });

        this.app.get('/agents/:id/state', (req, res) => {
            res.json({ state: 'active' });
        });

        this.app.get('/agents/:id/connections', (req, res) => {
            res.json([]);
        });
    }

    async start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                this.logger.info(`REST Gateway started on port ${this.port}`);
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.logger.info('REST Gateway stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
} 