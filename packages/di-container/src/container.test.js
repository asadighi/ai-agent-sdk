import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DefaultContainer, container } from './container';
describe('Container', () => {
    let testContainer;
    beforeEach(() => {
        testContainer = new DefaultContainer();
    });
    describe('register and get', () => {
        it('should register and retrieve a value', () => {
            const token = Symbol('test');
            const value = 'test value';
            testContainer.register(token, value);
            expect(testContainer.get(token)).toBe(value);
        });
        it('should register and retrieve a factory function', () => {
            const token = Symbol('test');
            const factory = () => ({ value: 'test' });
            testContainer.register(token, factory);
            const result = testContainer.get(token);
            expect(result).toEqual({ value: 'test' });
        });
        it('should cache factory results', () => {
            const token = Symbol('test');
            let callCount = 0;
            const factory = () => {
                callCount++;
                return { value: 'test' };
            };
            testContainer.register(token, factory);
            const result1 = testContainer.get(token);
            const result2 = testContainer.get(token);
            expect(result1).toBe(result2); // Same instance
            expect(callCount).toBe(1); // Factory called only once
        });
        it('should throw when getting unregistered token', () => {
            const token = Symbol('test');
            expect(() => testContainer.get(token)).toThrow('Dependency not found');
        });
    });
    describe('has', () => {
        it('should return true for registered value', () => {
            const token = Symbol('test');
            testContainer.register(token, 'value');
            expect(testContainer.has(token)).toBe(true);
        });
        it('should return true for registered factory', () => {
            const token = Symbol('test');
            testContainer.register(token, () => 'value');
            expect(testContainer.has(token)).toBe(true);
        });
        it('should return false for unregistered token', () => {
            const token = Symbol('test');
            expect(testContainer.has(token)).toBe(false);
        });
    });
    describe('default container instance', () => {
        afterEach(() => {
            // Clear the default container after each test
            const defaultContainer = container;
            defaultContainer.dependencies.clear();
            defaultContainer.factories.clear();
        });
        it('should be a singleton instance', () => {
            const container1 = container;
            const container2 = container;
            expect(container1).toBe(container2);
        });
        it('should work with the default instance', () => {
            const token = Symbol('test');
            const value = 'test value';
            container.register(token, value);
            expect(container.get(token)).toBe(value);
        });
    });
    describe('type safety', () => {
        it('should maintain type information', () => {
            const token = Symbol('test');
            const value = { value: 'test' };
            testContainer.register(token, value);
            const result = testContainer.get(token);
            expect(result.value).toBe('test');
            // TypeScript should enforce that result is of type TestInterface
        });
        it('should work with factory functions that return typed values', () => {
            const token = Symbol('test');
            const factory = () => ({ value: 'test' });
            testContainer.register(token, factory);
            const result = testContainer.get(token);
            expect(result.value).toBe('test');
            // TypeScript should enforce that result is of type TestInterface
        });
    });
});
//# sourceMappingURL=container.test.js.map