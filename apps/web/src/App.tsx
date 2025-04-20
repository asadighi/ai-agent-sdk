import { useState, useEffect } from 'react';
import { Agent, AgentRole, AgentStatus, FirestoreClient } from '@ai-agent/sdk';
import './App.css';
import { Container, Typography, Box, Paper, TextField, Button, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseConfig } from './config';

interface Event {
  from: string;
  type: string;
  data: {
    message: string;
  };
  scope: string;
}

function App() {
  const [role, setRole] = useState<AgentRole>(AgentRole.Worker);
  const [status] = useState<AgentStatus>(AgentStatus.Active);
  const [meshId, setMeshId] = useState('default-mesh');
  const [agentId, setAgentId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [firestoreClient, setFirestoreClient] = useState<FirestoreClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Load Firebase configuration
      const firebaseConfig = getFirebaseConfig();
      
      // Initialize FirestoreClient with the configuration
      const client = FirestoreClient.getInstance(firebaseConfig);
      setFirestoreClient(client);
      setError(null);
    } catch (err) {
      console.error('Failed to initialize Firebase:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Firebase');
    }

    return () => {
      // Cleanup subscriptions if needed
    };
  }, []);

  useEffect(() => {
    if (agentId && firestoreClient) {
      const agent = new Agent({
        meshId: meshId,
        agentId: agentId,
        role: role,
        status: status,
        heartbeatInterval: 5000,
        electionInterval: 15000,
        maxElectionTimeout: 20000,
      });

      agent.start();

      return () => {
        agent.stop();
      };
    }
  }, [agentId, meshId, role, status, firestoreClient]);

  const startAgent = async () => {
    if (!firestoreClient) {
      setError('Firestore client not initialized');
      return;
    }

    try {
      const newAgentId = agentId || uuidv4();
      setAgentId(newAgentId);
      setIsRunning(true);

      // Register the agent
      await firestoreClient.registerAgent({
        meshId: meshId,
        agentId: newAgentId,
        role: role
      });

      // Emit a start event with public scope
      await firestoreClient.emitEvent({
        meshId: meshId,
        agentId: newAgentId,
        type: 'agent_started',
        data: { message: `Agent ${newAgentId} started` },
        scope: 'public'
      });

      // Subscribe to heartbeats
      const unsubscribe = firestoreClient.subscribeToHeartbeats(meshId, (heartbeats) => {
        // Update events with heartbeat information
        const newEvents: Event[] = [];
        heartbeats.forEach((heartbeat, agentId) => {
          // Safely convert timestamp to ISO string
          const timestamp = heartbeat.timestamp;
          const date = new Date(timestamp);
          const isoString = isNaN(date.getTime()) ? 'Invalid timestamp' : date.toISOString();
          
          newEvents.push({
            from: agentId,
            type: 'heartbeat',
            data: { message: `Heartbeat from ${agentId} at ${isoString}` },
            scope: 'public'
          });
        });
        setEvents(prev => [...prev, ...newEvents]);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('Error starting agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to start agent');
      setIsRunning(false);
    }
  };

  const stopAgent = () => {
    setIsRunning(false);
    setAgentId('');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Agent SDK Demo
        </Typography>
        
        {error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Typography variant="body1">{error}</Typography>
          </Paper>
        )}
        
        <Paper sx={{ p: 2, mb: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value as AgentRole)}
            >
              <MenuItem value={AgentRole.Worker}>Worker</MenuItem>
              <MenuItem value={AgentRole.Leader}>Leader</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Mesh ID"
            value={meshId}
            onChange={(e) => setMeshId(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Agent ID"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={startAgent}
              disabled={isRunning || !firestoreClient}
            >
              Start Agent
            </Button>
            <Button
              variant="outlined"
              onClick={stopAgent}
              disabled={!isRunning}
            >
              Stop Agent
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Events
          </Typography>
          <List>
            {events.map((event, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={event.data.message}
                  secondary={`From: ${event.from} | Type: ${event.type}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
