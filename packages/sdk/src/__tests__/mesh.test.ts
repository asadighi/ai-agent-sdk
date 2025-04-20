import { Agent } from '../agent';
import { AgentRole, AgentStatus, PresenceStatus } from '../types';
import * as admin from 'firebase-admin';
import { FirebaseFirestoreClient } from '../fireStoreClient';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Mesh Network', () => {
    let agent1: Agent;
    let agent2: Agent;
    let agent3: Agent;
    const meshId = 'test-mesh';

    beforeAll(async () => {
        // Initialize Firebase Admin SDK if not already initialized
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
                })
            });
        }
    });

    beforeEach(async () => {
        jest.setTimeout(30000);

        // Clean up any existing test data
        const db = admin.firestore();
        const meshRef = db.collection('meshes').doc(meshId);
        await meshRef.delete().catch(() => {});

        // Initialize Firestore client
        const client = FirebaseFirestoreClient.getInstance();

        // Create agents with proper configuration
        agent1 = new Agent({
            meshId,
            agentId: 'agent1',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000
        });

        agent2 = new Agent({
            meshId,
            agentId: 'agent2',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000
        });

        agent3 = new Agent({
            meshId,
            agentId: 'agent3',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000
        });

        // Start all agents
        await Promise.all([
            agent1.start(),
            agent2.start(),
            agent3.start()
        ]);
    });

    afterEach(async () => {
        // Stop all agents
        await Promise.all([
            agent1?.stop(),
            agent2?.stop(),
            agent3?.stop()
        ]);

        // Clean up test data
        const db = admin.firestore();
        const meshRef = db.collection('meshes').doc(meshId);
        await meshRef.delete().catch(() => {});
    });

    afterAll(async () => {
        // Clean up Firebase Admin app
        await Promise.all(admin.apps.map(app => app?.delete()));
    });

    it('should initialize mesh with multiple agents and elect a leader', async () => {
        jest.setTimeout(30000);
        
        // Wait for leader election
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get agent statuses
        const statuses = await agent1['client'].getAgentStatuses(meshId);
        const leaderStatus = Array.from(statuses.values()).find((status: PresenceStatus) => status.role === AgentRole.Leader);
        expect(leaderStatus).toBeDefined();
        expect(leaderStatus?.status).toBe(AgentStatus.Active);
        
        // Verify agent statuses
        expect(agent1['config'].status).toBe(AgentStatus.Active);
        expect(agent2['config'].status).toBe(AgentStatus.Active);
        expect(agent3['config'].status).toBe(AgentStatus.Active);
    }, 30000);

    it('should handle leader failover when first leader goes offline', async () => {
        jest.setTimeout(30000);
        
        // Stop the leader
        await agent1.stop();
        
        // Wait for new leader election
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Verify new leader is elected
        const agentStatuses = await agent2['client'].getAgentStatuses(meshId);
        const leaderStatus = Array.from(agentStatuses.values()).find((status) => (status as PresenceStatus).role === AgentRole.Leader) as PresenceStatus;
        expect(leaderStatus).toBeDefined();
        expect(leaderStatus?.agentId).not.toBe('agent1');
    }, 30000);

    it('should handle leader returning after being offline', async () => {
        jest.setTimeout(30000);
        
        // Stop the leader
        await agent1.stop();
        
        // Wait for status to be updated
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify leader is offline
        const statuses = await agent1['client'].getAgentStatuses(meshId);
        const leaderStatus = Array.from(statuses.values()).find((status: PresenceStatus) => status.role === AgentRole.Leader);
        expect(leaderStatus).toBeDefined();
        expect(leaderStatus?.status).toBe(AgentStatus.Offline);
        
        // Restart the leader
        await agent1.start();
        
        // Wait for leader to rejoin
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Verify leader is back online
        const agentStatusesAfterRestart = await agent1['client'].getAgentStatuses(meshId);
        const leaderStatusAfterRestart = Array.from(agentStatusesAfterRestart.values()).find((status: PresenceStatus) => status.role === AgentRole.Leader);
        expect(leaderStatusAfterRestart).toBeDefined();
        expect(leaderStatusAfterRestart?.status).toBe(AgentStatus.Active);
    }, 30000);
}); 