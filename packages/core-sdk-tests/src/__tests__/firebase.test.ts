import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FirebaseMeshStore, AgentRole, AgentStatus } from '@ai-agent/core-sdk';
import type { IFirebaseConfig } from '@ai-agent/core-sdk';
import { config } from 'dotenv';

// Load environment variables
config();

describe('FirebaseMeshStore', () => {
    let store: FirebaseMeshStore;

    beforeEach(() => {
        const firebaseConfig: IFirebaseConfig = {
            apiKey: 'test-api-key',
            authDomain: 'test-auth-domain',
            projectId: 'test-project-id',
            storageBucket: 'test-storage-bucket',
            messagingSenderId: 'test-messaging-sender-id',
            appId: 'test-app-id'
        };
        store = FirebaseMeshStore.getInstance(firebaseConfig, 'test-agent');
    });

    afterEach(async () => {
        await store.cleanup();
    });

    it('should register an agent', async () => {
        const agent = {
            meshId: 'test-mesh',
            agentId: 'test-agent',
            role: AgentRole.Worker,
            status: AgentStatus.Active
        };
        const result = await store.registerAgent(agent);
        expect(result).toEqual({
            meshId: 'test-mesh',
            agentId: 'test-agent'
        });
    });
}); 