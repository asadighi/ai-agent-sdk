import { AgentRole, FirestoreClient, getFirestoreInstance } from '@ai-agent/sdk';
import { useState, useEffect } from 'react';
import './App.css';
import { Container, Typography, Box, Paper, TextField, Button, Select, MenuItem, FormControl, InputLabel, List, ListItem, ListItemText } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

interface Event {
  from: string;
  type: string;
  payload: {
    message: string;
  };
  permission: {
    scope: string;
  };
}

function App() {
  const [meshId, setMeshId] = useState('default-mesh');
  const [role, setRole] = useState<AgentRole>('active');
  const [agentId, setAgentId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Initialize Firebase when component mounts
    getFirestoreInstance(); // Initialize Firebase
  }, []);

  useEffect(() => {
    if (isRunning) {
      const unsubscribe = FirestoreClient.subscribeToEvents(meshId, (event: any) => {
        if (event.from !== agentId) {
          setEvents(prev => [...prev, event]);
        }
      });

      return () => unsubscribe();
    }
  }, [isRunning, meshId, agentId]);

  const startAgent = async () => {
    const newAgentId = uuidv4();
    setAgentId(newAgentId);
    await FirestoreClient.registerAgent(newAgentId, meshId, role);
    setIsRunning(true);

    // Start sending periodic messages
    setInterval(async () => {
      await FirestoreClient.emitEvent(meshId, {
        from: newAgentId,
        type: 'action',
        payload: { message: `Hello from browser agent ${newAgentId} at ${new Date().toISOString()}` },
        permission: { scope: 'public' }
      });
    }, 5000);
  };

  const stopAgent = () => {
    setIsRunning(false);
    setAgentId('');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Agent SDK
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Agent Configuration
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Mesh ID"
              value={meshId}
              onChange={(e) => setMeshId(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as AgentRole)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="leader">Leader</MenuItem>
                <MenuItem value="observer">Observer</MenuItem>
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="banned">Banned</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={startAgent}
              disabled={isRunning}
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
          {agentId && (
            <Typography sx={{ mt: 2 }}>
              Agent ID: {agentId}
            </Typography>
          )}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Events
          </Typography>
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {events.map((event, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={event.payload.message}
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
