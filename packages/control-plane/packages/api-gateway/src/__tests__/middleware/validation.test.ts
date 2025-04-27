import { describe, it, expect, vi } from 'vitest';
import { createValidationMiddleware } from '../../middleware/validation';
import { Request, Response, NextFunction } from 'express';

describe('Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockRequest = {
            body: {},
            query: {},
            params: {}
        };
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        mockNext = vi.fn();
    });

    describe('body validation', () => {
        it('should validate valid body', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' }
                },
                required: ['name']
            };

            const middleware = createValidationMiddleware({ body: schema });
            mockRequest.body = { name: 'John', age: 30 };

            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject invalid body', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' }
                },
                required: ['name']
            };

            const middleware = createValidationMiddleware({ body: schema });
            mockRequest.body = { age: 'thirty' };

            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid request body',
                details: expect.any(Array)
            });
        });
    });

    describe('query validation', () => {
        it('should validate valid query parameters', () => {
            const schema = {
                type: 'object',
                properties: {
                    page: { type: 'string', pattern: '^[0-9]+$' },
                    limit: { type: 'string', pattern: '^[0-9]+$' }
                }
            };

            const middleware = createValidationMiddleware({ query: schema });
            mockRequest.query = { page: '1', limit: '10' };

            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject invalid query parameters', () => {
            const schema = {
                type: 'object',
                properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' }
                }
            };

            const middleware = createValidationMiddleware({ query: schema });
            mockRequest.query = { page: 'invalid' };

            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid query parameters',
                details: expect.any(Array)
            });
        });
    });

    describe('params validation', () => {
        it('should validate valid path parameters', () => {
            const schema = {
                type: 'object',
                properties: {
                    id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
                }
            };

            const middleware = createValidationMiddleware({ params: schema });
            mockRequest.params = { id: '507f1f77bcf86cd799439011' };

            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject invalid path parameters', () => {
            const schema = {
                type: 'object',
                properties: {
                    id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
                }
            };

            const middleware = createValidationMiddleware({ params: schema });
            mockRequest.params = { id: 'invalid-id' };

            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid path parameters',
                details: expect.any(Array)
            });
        });
    });

    describe('error handling', () => {
        it('should handle validation errors gracefully', () => {
            const middleware = createValidationMiddleware({});
            mockRequest.body = null;

            middleware(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
}); 