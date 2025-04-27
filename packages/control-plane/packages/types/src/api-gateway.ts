import { ILogger } from '@ai-agent/multi-logger/types';
import { IncomingMessage } from 'http';
import { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import { WebSocket } from 'ws';

/**
 * Middleware function type for REST routes
 */
export type RestMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/**
 * Middleware function type for WebSocket connections
 */
export type WebSocketMiddleware = (ws: WebSocket, req: IncomingMessage) => Promise<void>;

/**
 * Handler function type for REST routes
 */
export type RestHandler = (req: Request, res: Response) => void | Promise<void>;

/**
 * Handler function type for WebSocket messages
 */
export type WebSocketHandler = (ws: WebSocket, data: any) => Promise<void>;

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    windowMs: number;
    max: number;
}

/**
 * Configuration for the API Gateway
 */
export interface ApiGatewayConfig {
    port: number;
    wsPort?: number; // Optional WebSocket port, if not provided will use port + 1
    logger: ILogger;
    cors?: CorsOptions;
    rateLimit?: RateLimitConfig;
}

/**
 * Interface for the API Gateway
 */
export interface IApiGateway {
    /**
     * Start the API Gateway servers
     */
    start(): Promise<void>;

    /**
     * Stop the API Gateway servers
     */
    stop(): Promise<void>;

    /**
     * Register a REST route
     * @param method HTTP method
     * @param path Route path
     * @param handler Request handler
     * @param middleware Optional middleware array
     */
    registerRestRoute(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        path: string,
        handler: RestHandler,
        middleware?: RestMiddleware[]
    ): void;

    /**
     * Register a WebSocket route
     * @param path Route path
     * @param handler Message handler
     * @param middleware Optional middleware array
     */
    registerWebSocketRoute(
        path: string,
        handler: WebSocketHandler,
        middleware?: WebSocketMiddleware[]
    ): void;

    /**
     * Register global REST middleware
     * @param middleware Middleware function
     */
    registerRestMiddleware(middleware: RestMiddleware): void;

    /**
     * Register global WebSocket middleware
     * @param middleware Middleware function
     */
    registerWebSocketMiddleware(middleware: WebSocketMiddleware): void;
} 