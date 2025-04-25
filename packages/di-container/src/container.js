/**
 * Default implementation of the Container interface
 */
export class DefaultContainer {
    constructor() {
        this.dependencies = new Map();
        this.factories = new Map();
    }
    register(token, value) {
        if (typeof value === 'function') {
            this.factories.set(token, value);
        }
        else {
            this.dependencies.set(token, value);
        }
    }
    get(token) {
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
    has(token) {
        return this.dependencies.has(token) || this.factories.has(token);
    }
}
// Create and export a default container instance
export const container = new DefaultContainer();
//# sourceMappingURL=container.js.map