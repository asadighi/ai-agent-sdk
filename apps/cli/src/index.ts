import { FirestoreClient, AgentRole, Heartbeat } from '@ai-agent/sdk';
import { Command } from 'commander';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { ensureEnvLoaded } from './nodeInit.js';
import { getFirebaseConfig } from './config.js';

// Ensure environment variables are loaded
ensureEnvLoaded();
dotenv.config();

const program = new Command();

program
  .name('ai-agent')
  .description('CLI for AI Agent SDK')
  .version('0.1.0');

program
  .command('create-mesh')
  .description('Create a new mesh')
  .action(async () => {
    const meshId = uuidv4();
    const client = FirestoreClient.getInstance(getFirebaseConfig());
    await client.registerAgent({
      meshId,
      agentId: uuidv4(),
      role: AgentRole.Worker
    });
    console.log(`Created new mesh with ID: ${meshId}`);
  });

program
  .command('start-agent')
  .description('Start a new agent in a mesh')
  .requiredOption('-m, --mesh-id <meshId>', 'Mesh ID')
  .option('-r, --role <role>', 'Agent role (leader or worker)', 'worker')
  .action(async (options) => {
    const { meshId, role } = options;
    await startAgent(meshId, role === 'leader' ? AgentRole.Leader : AgentRole.Worker);
  });

/**
 * Start an agent in a mesh with a specific role
 */
async function startAgent(meshId: string, role: AgentRole) {
  const agentId = uuidv4();
  const client = FirestoreClient.getInstance(getFirebaseConfig());
  
  try {
    console.log(`Starting agent ${agentId} in mesh ${meshId} with role ${role}`);

    // Register the agent
    await client.registerAgent({
      meshId,
      agentId,
      role
    });

    console.log(`Started agent ${agentId} in mesh ${meshId} with role ${role}`);

    // Subscribe to heartbeats
    const unsubscribe = client.subscribeToHeartbeats(meshId, (heartbeats: Map<string, Heartbeat>) => {
      heartbeats.forEach((heartbeat: Heartbeat) => {
        if (heartbeat.agentId !== agentId) {
          console.log(`Received heartbeat from ${heartbeat.agentId}`);
        }
      });
    });

    // Keep the process running and handle cleanup
    process.on('SIGINT', () => {
      unsubscribe();
      process.exit();
    });

    // Keep the process running
    setInterval(() => {}, 1000);
  } catch (error) {
    console.error('Error starting agent:', error);
    console.error('Available roles:', Object.values(AgentRole).join(', '));
    process.exit(1);
  }
}

// Handle command line usage
if (process.argv.length > 2 && !process.argv[2].startsWith('-')) {
  const meshId = process.argv[2];
  const role = (process.argv[3] || 'worker') as AgentRole;

  if (!meshId) {
    console.error('Usage: npm run start:agent <meshId> [role]');
    console.error('Available roles:', Object.values(AgentRole).join(', '));
    process.exit(1);
  }

  startAgent(meshId, role);
} else {
  program.parse();
} 