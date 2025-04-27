import { Request, Response, NextFunction } from 'express';
import { RestMiddleware } from '@ai-agent/control-plane/types';
import { ILogger } from '@ai-agent/multi-logger/types';

interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
}

export const createErrorHandler = (logger: ILogger): RestMiddleware => {
    return (req: Request, res: Response, next: NextFunction): void => {
        next((err: Error): void => {
            const statusCode = (err as any).statusCode || 500;
            const errorResponse: ErrorResponse = {
                error: err.name,
                message: err.message,
                statusCode,
            };

            // Log the error
            logger.error('Error occurred', {
                error: err,
                path: req.path,
                method: req.method,
                statusCode,
            });

            // Send error response
            res.status(statusCode).json(errorResponse);
        });
    };
}; 