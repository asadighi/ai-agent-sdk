import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MeshClient, FirebaseMeshStore, AgentRole, AgentStatus } from '@ai-agent/core-sdk';
describe('FirebaseMeshStore', () => {
    const firebaseConfig = {
        apiKey: 'test-api-key',
        authDomain: 'test-domain.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test-bucket.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:abcdef'
    };
    let meshClient;
    let store;
    const testMeshId = 'test-mesh';
    beforeEach(async () => {
        meshClient = MeshClient.getInstance(firebaseConfig);
        store = await FirebaseMeshStore.getInstance(firebaseConfig, 'test-agent');
    });
    afterEach(async () => {
        await store.cleanup();
    });
    it('should register an agent', async () => {
        const agent = {
            meshId: testMeshId,
            agentId: 'test-agent',
            role: AgentRole.Worker,
            status: AgentStatus.Active
        };
        await store.registerAgent(agent);
        const agents = await store.getAgents(testMeshId);
        expect(agents.has(agent.agentId)).toBe(true);
    });
    it('should get registered agents', async () => {
        const agent1 = {
            meshId: testMeshId,
            agentId: 'agent-1',
            role: AgentRole.Worker,
            status: AgentStatus.Active
        };
        const agent2 = {
            meshId: testMeshId,
            agentId: 'agent-2',
            role: AgentRole.Worker,
            status: AgentStatus.Active
        };
        await store.registerAgent(agent1);
        await store.registerAgent(agent2);
        const agents = await store.getAgents(testMeshId);
        expect(agents.size).toBe(2);
        expect(agents.has(agent1.agentId)).toBe(true);
        expect(agents.has(agent2.agentId)).toBe(true);
    });
});
//# sourceMappingURL=firebase.test.js.map