import { FirestoreClient, AgentRole } from '@ai-agent/sdk';
import { v4 as uuidv4 } from 'uuid';
import { ensureEnvLoaded } from './nodeInit.js';

// Ensure environment variables are loaded
ensureEnvLoaded();

const agentId = uuidv4();

/**
 * Start an agent in a mesh with a specific role
 */
async function startAgent(meshId: string, role: AgentRole) {
  try {
    console.log(`Starting agent ${agentId} in mesh ${meshId} with role ${role}`);

    await FirestoreClient.registerAgent(agentId, meshId, role);

    // Subscribe to events
    FirestoreClient.subscribeToEvents(meshId, (event: any) => {
      if (event.from !== agentId) { // Only log events from other agents
        console.log('\nReceived event from another agent:', {
          from: event.from,
          type: event.type,
          payload: event.payload
        });

        // Example: Emit a response event
        if (event.type === 'action') {
          FirestoreClient.emitEvent(meshId, {
            from: agentId,
            type: 'state_update',
            payload: {
              message: `Agent ${agentId} processed action from ${event.from}`,
              originalEvent: event
            },
            permission: {
              scope: 'public'
            }
          });
        }
      }
    });

    // Emit periodic events
    setInterval(async () => {
      try {
        await FirestoreClient.emitEvent(meshId, {
          from: agentId,
          type: 'action',
          payload: {
            message: `Hello from agent ${agentId} at ${new Date().toISOString()}`
          },
          permission: {
            scope: 'public'
          }
        });
        console.log(`\nEmitted heartbeat event from agent ${agentId}`);
      } catch (error) {
        console.error('Error emitting event:', error);
      }
    }, 5000); // Emit every 5 seconds

    // Keep the process running
    setInterval(() => {}, 1000);
  } catch (error) {
    console.error('Error starting agent:', error);
    console.error('Available roles:', Object.values(AgentRole).join(', '));
    process.exit(1);
  }
}

// Get mesh ID from command line arguments
const meshId = process.argv[2];
const role = (process.argv[3] || 'active') as AgentRole;

if (!meshId) {
  console.error('Usage: npm run start:agent <meshId> [role]');
  console.error('Available roles:', Object.values(AgentRole).join(', '));
  process.exit(1);
}

startAgent(meshId, role); 