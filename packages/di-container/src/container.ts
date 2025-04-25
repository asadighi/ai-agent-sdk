/**
 * Interface for the dependency injection container
 */
export interface Container {
    /**
     * Register a dependency with the container
     * @param token The token to identify the dependency
     * @param value The value or factory function to provide the dependency
     */
    register<T>(token: string | symbol, value: T | (() => T)): void;

    /**
     * Get a dependency from the container
     * @param token The token to identify the dependency
     * @throws Error if the dependency is not registered
     */
    get<T>(token: string | symbol): T;

    /**
     * Check if a dependency is registered
     * @param token The token to identify the dependency
     */
    has(token: string | symbol): boolean;
}

/**
 * Default implementation of the Container interface
 */
export class DefaultContainer implements Container {
    private dependencies: Map<string | symbol, any> = new Map();
    private factories: Map<string | symbol, () => any> = new Map();

    register<T>(token: string | symbol, value: T | (() => T)): void {
        if (typeof value === 'function') {
            this.factories.set(token, value as () => T);
        } else {
            this.dependencies.set(token, value);
        }
    }

    get<T>(token: string | symbol): T {
        if (this.dependencies.has(token)) {
            return this.dependencies.get(token);
        }

        const factory = this.factories.get(token);
        if (factory) {
            const value = factory();
            this.dependencies.set(token, value);
            return value;
        }

        throw new Error(`Dependency not found for token: ${String(token)}`);
    }

    has(token: string | symbol): boolean {
        return this.dependencies.has(token) || this.factories.has(token);
    }
}

// Create and export a default container instance
export const container = new DefaultContainer(); 