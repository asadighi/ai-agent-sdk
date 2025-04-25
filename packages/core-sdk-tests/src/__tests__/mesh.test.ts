import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Mesh, Agent, AgentRole, AgentStatus, MeshClient, FirebaseMeshStore, IFirebaseConfig } from '@ai-agent/core-sdk';
import { config } from 'dotenv';
import { meshClient } from './setup.js';

// Load environment variables
config();

describe('Mesh Network', () => {
    let mesh: Mesh;
    let agent1: Agent;
    let agent2: Agent;
    let agent3: Agent;
    let meshId: string;
    let firebaseConfig: IFirebaseConfig;

    beforeEach(async () => {
        meshId = 'test-mesh';
        firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY || '',
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
            projectId: process.env.FIREBASE_PROJECT_ID || '',
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
            appId: process.env.FIREBASE_APP_ID || ''
        };
        mesh = new Mesh({ meshId, firebaseConfig });
        
        agent1 = new Agent({
            meshId,
            agentId: 'agent1',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000,
            firebaseConfig
        });

        agent2 = new Agent({
            meshId,
            agentId: 'agent2',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000,
            firebaseConfig
        });

        agent3 = new Agent({
            meshId,
            agentId: 'agent3',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000,
            firebaseConfig
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
    });

    it('should initialize mesh with multiple agents and elect a leader', async () => {
        // Wait for leader election
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get agent statuses
        const statuses = await agent1.getAgentStatuses();
        const leaderStatus = Array.from(statuses.values()).find(status => status.role === AgentRole.Manager);
        expect(leaderStatus).toBeDefined();
        expect(leaderStatus?.status).toBe(AgentStatus.Active);
        
        // Verify agent statuses
        expect(agent1.status).toBe(AgentStatus.Active);
        expect(agent2.status).toBe(AgentStatus.Active);
        expect(agent3.status).toBe(AgentStatus.Active);
    });

    it('should handle leader failover when first leader goes offline', async () => {
        // Stop the leader
        await agent1.stop();
        
        // Wait for new leader election
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Verify new leader is elected
        const agentStatuses = await agent2.getAgentStatuses();
        const leaderStatus = Array.from(agentStatuses.values()).find(status => status.role === AgentRole.Manager);
        expect(leaderStatus).toBeDefined();
        expect(leaderStatus?.agentId).not.toBe('agent1');
    });

    it('should handle leader returning after being offline', async () => {
        // Stop the leader
        await agent1.stop();
        
        // Wait for status to be updated
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify leader is offline
        const statuses = await agent1.getAgentStatuses();
        const leaderStatus = Array.from(statuses.values()).find(status => status.role === AgentRole.Manager);
        expect(leaderStatus).toBeDefined();
        expect(leaderStatus?.status).toBe(AgentStatus.Offline);
        
        // Restart the leader
        await agent1.start();
        
        // Wait for leader to rejoin
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Verify leader is back online
        const agentStatusesAfterRestart = await agent1.getAgentStatuses();
        const leaderStatusAfterRestart = Array.from(agentStatusesAfterRestart.values()).find(status => status.role === AgentRole.Manager);
        expect(leaderStatusAfterRestart).toBeDefined();
        expect(leaderStatusAfterRestart?.status).toBe(AgentStatus.Active);
    });

    it('should initialize agents with correct status', () => {
        expect(agent1.status).toBe(AgentStatus.Active);
        expect(agent2.status).toBe(AgentStatus.Active);
        expect(agent3.status).toBe(AgentStatus.Active);
    });
}); 