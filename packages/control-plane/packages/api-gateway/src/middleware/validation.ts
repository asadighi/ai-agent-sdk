import { Request, Response, NextFunction } from 'express';
import { RestMiddleware } from '@ai-agent/control-plane/types';
import Ajv, { Schema } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export interface ValidationOptions {
    body?: Schema;
    query?: Schema;
    params?: Schema;
}

export function createValidationMiddleware(options: ValidationOptions): RestMiddleware {
    const bodyValidator = options.body ? ajv.compile(options.body) : null;
    const queryValidator = options.query ? ajv.compile(options.query) : null;
    const paramsValidator = options.params ? ajv.compile(options.params) : null;

    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (bodyValidator && !bodyValidator(req.body)) {
                res.status(400).json({
                    error: 'Invalid request body',
                    details: bodyValidator.errors
                });
                return;
            }

            if (queryValidator && !queryValidator(req.query)) {
                res.status(400).json({
                    error: 'Invalid query parameters',
                    details: queryValidator.errors
                });
                return;
            }

            if (paramsValidator && !paramsValidator(req.params)) {
                res.status(400).json({
                    error: 'Invalid path parameters',
                    details: paramsValidator.errors
                });
                return;
            }

            next();
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                next(error);
            }
        }
    };
}

export const validateQuery = (schema: Record<string, (value: any) => boolean>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: Array<{ field: string; message: string }> = [];

        for (const [key, validator] of Object.entries(schema)) {
            const value = req.query[key];
            if (value === undefined) {
                continue;
            }

            try {
                const result = validator(value);
                if (!result) {
                    errors.push({
                        field: key,
                        message: `Invalid value for ${key}`
                    });
                }
            } catch (error) {
                errors.push({
                    field: key,
                    message: `Validation failed for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }

        if (errors.length > 0) {
            res.status(400).json({ errors });
            return;
        }

        next();
    };
};

export const validateParams = (schema: Record<string, (value: any) => boolean>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: Array<{ field: string; message: string }> = [];

        for (const [key, validator] of Object.entries(schema)) {
            const value = req.params[key];
            if (value === undefined) {
                continue;
            }

            try {
                const result = validator(value);
                if (!result) {
                    errors.push({
                        field: key,
                        message: `Invalid value for ${key}`
                    });
                }
            } catch (error) {
                errors.push({
                    field: key,
                    message: `Validation failed for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }

        if (errors.length > 0) {
            res.status(400).json({ errors });
            return;
        }

        next();
    };
};

export const validateBody = (schema: Schema) => {
    const validate = ajv.compile(schema);
    
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const valid = validate(req.body);
            if (!valid) {
                const errors: Array<{ field: string; message: string }> = (validate.errors || []).map(error => ({
                    field: error.instancePath.slice(1) || 'body',
                    message: error.message || 'Invalid value'
                }));
                res.status(400).json({ errors });
                return;
            }
            next();
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                next(error);
            }
        }
    };
}; 