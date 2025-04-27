import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { RestMiddleware } from '@ai-agent/control-plane/types';

// Configure CORS options
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

export const corsMiddleware: RestMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    cors(corsOptions)(req, res, next);
}; 