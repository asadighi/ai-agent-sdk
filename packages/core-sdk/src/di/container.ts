import { ConnectionState } from '../connectionState.js';
import { Firestore } from 'firebase/firestore';

export class Container {
    private static instance: Container;
    private services: Map<string, any> = new Map();

    private constructor() {}

    static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }

    register<T>(key: string, service: T): void {
        this.services.set(key, service);
    }

    get<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service ${key} not found in container`);
        }
        return service as T;
    }
}

// Export a singleton instance
export const container = Container.getInstance(); 