import { describe, it, expect, vi } from 'vitest';
import { createAuthMiddleware } from '../../middleware/auth';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: ReturnType<typeof vi.fn>;
    const secret = 'test-secret';

    beforeEach(() => {
        mockRequest = {
            headers: {}
        };
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        mockNext = vi.fn();
    });

    describe('token validation', () => {
        it('should allow request with valid token', () => {
            const token = jwt.sign({ userId: '123' }, secret);
            mockRequest.headers = { authorization: `Bearer ${token}` };

            const middleware = createAuthMiddleware({ secret });
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRequest.user).toBeDefined();
        });

        it('should reject request with invalid token', () => {
            mockRequest.headers = { authorization: 'Bearer invalid-token' };

            const middleware = createAuthMiddleware({ secret });
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
        });

        it('should reject request without token when required', () => {
            const middleware = createAuthMiddleware({ secret });
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        });

        it('should allow request without token when not required', () => {
            const middleware = createAuthMiddleware({ secret }, { required: false });
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('role validation', () => {
        it('should allow request with required role', () => {
            const token = jwt.sign({ userId: '123', roles: ['admin'] }, secret);
            mockRequest.headers = { authorization: `Bearer ${token}` };

            const middleware = createAuthMiddleware({ secret }, { roles: ['admin'] });
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject request without required role', () => {
            const token = jwt.sign({ userId: '123', roles: ['user'] }, secret);
            mockRequest.headers = { authorization: `Bearer ${token}` };

            const middleware = createAuthMiddleware({ secret }, { roles: ['admin'] });
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        });

        it('should allow request with any role when no roles specified', () => {
            const token = jwt.sign({ userId: '123', roles: ['user'] }, secret);
            mockRequest.headers = { authorization: `Bearer ${token}` };

            const middleware = createAuthMiddleware({ secret });
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should handle token verification errors', () => {
            const token = jwt.sign({ userId: '123' }, 'wrong-secret');
            mockRequest.headers = { authorization: `Bearer ${token}` };

            const middleware = createAuthMiddleware({ secret });
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
        });
    });
}); 