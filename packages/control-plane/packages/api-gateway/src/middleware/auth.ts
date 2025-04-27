import { Request, Response, NextFunction } from 'express';
import { RestMiddleware } from '@ai-agent/control-plane/types';
import jwt from 'jsonwebtoken';

export interface AuthConfig {
    secret: string;
    algorithms?: jwt.Algorithm[];
}

export interface AuthOptions {
    required?: boolean;
    roles?: string[];
}

const DEFAULT_AUTH_OPTIONS: AuthOptions = {
    required: true,
    roles: []
};

export function createAuthMiddleware(config: AuthConfig, options: AuthOptions = DEFAULT_AUTH_OPTIONS): RestMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = extractToken(req);

            if (!token && options.required) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            if (token) {
                try {
                    const decoded = jwt.verify(token, config.secret, {
                        algorithms: config.algorithms || ['HS256']
                    }) as jwt.JwtPayload;

                    // Add user info to request
                    req.user = decoded;

                    // Check roles if specified
                    if (options.roles && options.roles.length > 0) {
                        const userRoles = decoded.roles || [];
                        const hasRequiredRole = options.roles.some(role => userRoles.includes(role));

                        if (!hasRequiredRole) {
                            res.status(403).json({ error: 'Insufficient permissions' });
                            return;
                        }
                    }
                } catch (error) {
                    if (options.required) {
                        res.status(401).json({ error: 'Invalid token' });
                        return;
                    }
                }
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

function extractToken(req: Request): string | null {
    if (req.headers.authorization?.startsWith('Bearer ')) {
        return req.headers.authorization.substring(7);
    }
    return null;
}

// Extend Express Request type to include user property
declare global {
    namespace Express {
        interface Request {
            user?: jwt.JwtPayload;
        }
    }
}

export const authMiddleware: RestMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        res.status(401).json({ error: 'No authorization header provided' });
        return;
    }

    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
        res.status(401).json({ error: 'Invalid authorization header format' });
        return;
    }

    // TODO: Implement actual token validation
    // For now, just pass through
    next();
}; 