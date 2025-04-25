import { Mesh } from './mesh.js';
import { Agent } from './agent.js';
import { AgentRole, AgentStatus } from './types.js';
import { IFirebaseConfig } from './firebaseConfig.js';

const firebaseConfig: IFirebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || ''
};

const meshId = 'test-mesh';
const mesh = new Mesh({ meshId, firebaseConfig });

// Create agents with proper configuration
const agent1 = new Agent({
    meshId,
    agentId: 'agent1',
    role: AgentRole.Worker,
    status: AgentStatus.Active,
    heartbeatInterval: 1000,
    electionInterval: 2000,
    maxElectionTimeout: 5000,
    firebaseConfig
});

const agent2 = new Agent({
    meshId,
    agentId: 'agent2',
    role: AgentRole.Worker,
    status: AgentStatus.Active,
    heartbeatInterval: 1000,
    electionInterval: 2000,
    maxElectionTimeout: 5000,
    firebaseConfig
});

async function testMesh() {
    const meshId = 'test-mesh-' + Date.now();

    // Create 4 agents with different roles and statuses
    const agents: Agent[] = [
        new Agent({
            meshId,
            agentId: 'agent-1',
            role: AgentRole.Manager,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000,
            firebaseConfig
        }),
        new Agent({
            meshId,
            agentId: 'agent-2',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000,
            firebaseConfig
        }),
        new Agent({
            meshId,
            agentId: 'agent-3',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000,
            firebaseConfig
        }),
        new Agent({
            meshId,
            agentId: 'agent-4',
            role: AgentRole.Worker,
            status: AgentStatus.Active,
            heartbeatInterval: 1000,
            electionInterval: 2000,
            maxElectionTimeout: 5000,
            firebaseConfig
        })
    ];

    console.log('Starting all agents...');
    await Promise.all(agents.map(agent => agent.start()));

    // Wait for initial leader election
    console.log('Waiting for initial leader election...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check initial state
    console.log('\nChecking initial state:');
    for (const agent of agents) {
        const health = agent.healthCheck();
        console.log(`Agent ${health.agentId}:`);
        console.log(`  Role: ${health.role}`);
        console.log(`  Status: ${health.status}`);
        console.log(`  Term: ${health.term}`);
        console.log(`  Fencing Token: ${health.fencingToken}`);
    }

    // Simulate first leader going offline
    console.log('\nSimulating first leader going offline...');
    await agents[0].stop();
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check state after first leader failure
    console.log('\nChecking state after first leader failure:');
    for (const agent of agents.slice(1)) {
        const health = agent.healthCheck();
        console.log(`Agent ${health.agentId}:`);
        console.log(`  Role: ${health.role}`);
        console.log(`  Status: ${health.status}`);
        console.log(`  Term: ${health.term}`);
        console.log(`  Fencing Token: ${health.fencingToken}`);
    }

    // Simulate second leader going offline
    console.log('\nSimulating second leader going offline...');
    await agents[1].stop();
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check state with no leaders
    console.log('\nChecking state with no leaders:');
    for (const agent of agents.slice(2)) {
        const health = agent.healthCheck();
        console.log(`Agent ${health.agentId}:`);
        console.log(`  Role: ${health.role}`);
        console.log(`  Status: ${health.status}`);
        console.log(`  Term: ${health.term}`);
        console.log(`  Fencing Token: ${health.fencingToken}`);
    }

    // Bring first leader back online
    console.log('\nBringing first leader back online...');
    await agents[0].start();
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check state after first leader returns
    console.log('\nChecking state after first leader returns:');
    for (const agent of [agents[0], ...agents.slice(2)]) {
        const health = agent.healthCheck();
        console.log(`Agent ${health.agentId}:`);
        console.log(`  Role: ${health.role}`);
        console.log(`  Status: ${health.status}`);
        console.log(`  Term: ${health.term}`);
        console.log(`  Fencing Token: ${health.fencingToken}`);
    }

    // Bring second leader back online
    console.log('\nBringing second leader back online...');
    await agents[1].start();
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check final state
    console.log('\nChecking final state:');
    for (const agent of agents) {
        const health = agent.healthCheck();
        console.log(`Agent ${health.agentId}:`);
        console.log(`  Role: ${health.role}`);
        console.log(`  Status: ${health.status}`);
        console.log(`  Term: ${health.term}`);
        console.log(`  Fencing Token: ${health.fencingToken}`);
    }

    // Cleanup
    console.log('\nCleaning up...');
    await Promise.all(agents.map(agent => agent.stop()));
}

// Run the test
testMesh().catch(console.error); 