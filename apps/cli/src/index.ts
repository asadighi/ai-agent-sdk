import { Command } from 'commander';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { getMeshClient, IFirebaseConfig, AgentRole, AgentStatus, Heartbeat, Logger, Mesh } from '@ai-agent/core-sdk';
import { ensureEnvLoaded } from './nodeInit.js';
import { v4 as uuidv4 } from 'uuid';
import { Agent } from '@ai-agent/core-sdk';
import { FileStorage } from '@ai-agent/core-sdk';
import path from 'path';
import { LogLevel } from '@ai-agent/core-sdk';

// Ensure environment variables are loaded
ensureEnvLoaded();

// Get the current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packageJsonPath = resolve(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

// Get Firebase configuration from environment variables
const firebaseConfig: IFirebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || ''
};

// Log the loaded config (with sensitive data masked)
console.log('CLI: Environment variables loaded:', {
  ...firebaseConfig,
  apiKey: '***'
});

// Initialize Commander program
const program = new Command();

// Set program metadata
program
    .name(packageJson.name)
    .description(packageJson.description);

// Add version option
program
    .option('-v, --version', 'display version number')
    .action((options) => {
        if (options.version) {
            console.log(packageJson.version);
            process.exit(0);
        }
    });

// Create mesh command
program
    .command('create-mesh')
    .description('Create a new mesh')
    .argument('<meshId>', 'The ID of the mesh to create')
    .action(async (meshId: string) => {
        try {
            const client = getMeshClient(firebaseConfig);
            await client.registerAgent({
                meshId,
                agentId: 'manager',
                role: AgentRole.Manager,
                status: AgentStatus.Follower
            });
            console.log(`Mesh ${meshId} created successfully`);
        } catch (error) {
            console.error('Error creating mesh:', error);
        }
    });

// Start agent command
program
    .command('start')
    .description('Start an agent in a mesh')
    .argument('<meshId>', 'The ID of the mesh to join')
    .argument('<role>', 'The role of the agent (leader or worker)')
    .action(async (meshId: string, role: string) => {
        try {
            const client = getMeshClient(firebaseConfig);
            const agentRole = role.toLowerCase() === 'manager' ? AgentRole.Manager : AgentRole.Worker;
            const agentId = `${role}-${Date.now()}`;
            
            // Create and start the agent
            const agent = new Agent({
                meshId,
                agentId,
                role: agentRole,
                status: AgentStatus.Active,
                firebaseConfig,
                heartbeatInterval: 1000,
                electionInterval: 2000,
                maxElectionTimeout: 5000
            });

            // Start the agent
            await agent.start();
            console.log(`Agent ${agentId} started in mesh ${meshId} as ${role}`);

            // Subscribe to heartbeats
            const unsubscribe = client.subscribeToHeartbeats(meshId, (heartbeats: Map<string, Heartbeat>) => {
                console.log('Heartbeats:', Array.from(heartbeats.entries()));
            });

            // Handle cleanup on process termination
            const cleanup = async () => {
                console.log('Cleaning up...');
                await agent.stop();
                unsubscribe();
                process.exit(0);
            };

            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);

            // Keep the process alive
            setInterval(() => {}, 1000);
        } catch (error) {
            console.error('Error starting agent:', error);
            process.exit(1);
        }
    });

// List meshes command
program
    .command('list-meshes')
    .description('List all meshes')
    .action(async () => {
        try {
            const client = getMeshClient(firebaseConfig);
            const meshes = await client.getAgentStatuses('*');
            console.log('Meshes:', Array.from(meshes.keys()));
        } catch (error) {
            console.error('Error listing meshes:', error);
        }
    });

// Parse command line arguments
if (process.argv.length > 2) {
    // If we have arguments, prepend 'start' to make it a valid command
    process.argv.splice(2, 0, 'start');
}
program.parse(process.argv);

const logger = new Logger({
    logLevel: LogLevel.INFO,
    logToConsole: true,
    maxLogs: 1000,
    rotationInterval: 60000,
    storage: new FileStorage(path.join(__dirname, 'logs'))
});

async function main() {
    try {
        logger.info('Starting CLI application...');
        
        // ... existing code ...

        logger.info('Initializing mesh...');
        const mesh = new Mesh({
            meshId: process.env.MESH_ID!,
            firebaseConfig: firebaseConfig
        });

        logger.info('Starting mesh...');
        await mesh.start();
        logger.info('Mesh started successfully');

        // ... existing code ...

    } catch (error) {
        logger.error('Error in CLI application:', error);
        process.exit(1);
    }
}

main(); 