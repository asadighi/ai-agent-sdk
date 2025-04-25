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
export declare class DefaultContainer implements Container {
    private dependencies;
    private factories;
    register<T>(token: string | symbol, value: T | (() => T)): void;
    get<T>(token: string | symbol): T;
    has(token: string | symbol): boolean;
}
export declare const container: DefaultContainer;
//# sourceMappingURL=container.d.ts.map