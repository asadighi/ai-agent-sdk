import { useState, useEffect, useRef, useCallback } from 'react';
import { AgentRole, AgentStatus, MeshClient, Heartbeat, Agent, Mesh, Logger, LogLevel, ConnectionState } from '@ai-agent/core-sdk';
import { BrowserStorage } from '@ai-agent/multi-logger';
import './App.css';
import { Container, Typography, Box, Paper, TextField, Button, Select, MenuItem, FormControl, InputLabel, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { AgentGraph } from './components/AgentGraph';
import { LogViewer } from './components/LogViewer';
import { useSearchParams } from 'react-router-dom';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [meshId, setMeshId] = useState<string>(() => {
    const meshIdParam = searchParams.get('meshId');
    return meshIdParam || '';
  });
  const [agentId, setAgentId] = useState<string>(() => {
    const agentIdParam = searchParams.get('agentId');
    return agentIdParam || '';
  });
  const [workerType, setWorkerType] = useState<AgentRole>(() => {
    const workerTypeParam = searchParams.get('workerType');
    return workerTypeParam as AgentRole || AgentRole.Worker;
  });
  const [client, setClient] = useState<MeshClient | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [mesh, setMesh] = useState<Mesh | null>(null);
  const [heartbeats, setHeartbeats] = useState<Map<string, Heartbeat>>(new Map());
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState<number>(0);
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);
  const [quotaResetTime, setQuotaResetTime] = useState<Date | null>(null);
  const [localCache, setLocalCache] = useState<Map<string, unknown>>(new Map());
  const [lastCacheUpdate, setLastCacheUpdate] = useState<number>(0);
  const [activeTab, setActiveTab] = useState(0);
  const connectionStateRef = useRef<ConnectionState | null>(null);
  const unsubscribeRef = useRef<() => void>();
  const logger = useRef(new Logger({
    logLevel: LogLevel.INFO,
    logToConsole: true,
    maxLogs: 1000,
    rotationInterval: 60000,
    storage: new BrowserStorage()
  })).current;
  const [isOffline, setIsOffline] = useState(false);
  const [agentExists, setAgentExists] = useState<boolean>(false);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const withRetry = useCallback(async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 5000,
    cacheKey?: string
  ): Promise<T> => {
    let lastError: Error | null = null;
    
    if (isOffline) {
      const errorMessage = 'You are offline. Please check your internet connection.';
      setError(errorMessage);
      setStatusMessage(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (cacheKey && localCache.has(cacheKey)) {
      const cachedValue = localCache.get(cacheKey);
      if (Date.now() - lastCacheUpdate < 30000) {
        logger.info('Using cached value for', { cacheKey });
        return cachedValue as T;
      }
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (isQuotaExceeded) {
          const waitTime = 60000;
          logger.warn(`Quota exceeded, waiting ${waitTime}ms before retry`);
          const errorMessage = `Firebase quota exceeded. Please wait ${Math.ceil(waitTime/1000)} seconds before retrying.`;
          setError(errorMessage);
          setStatusMessage(errorMessage);
          await sleep(waitTime);
          setIsQuotaExceeded(false);
          setError(null);
          setStatusMessage('');
        }

        const now = Date.now();
        if (now - lastRequestTime < rateLimit) {
          const waitTime = rateLimit - (now - lastRequestTime);
          logger.warn(`Rate limited, waiting ${waitTime}ms`);
          const errorMessage = `Rate limited. Please wait ${Math.ceil(waitTime/1000)} seconds before retrying.`;
          setError(errorMessage);
          setStatusMessage(errorMessage);
          await sleep(waitTime);
          setError(null);
          setStatusMessage('');
        }
        setLastRequestTime(Date.now());

        const result = await operation();
        
        if (cacheKey) {
          setLocalCache(prev => {
            const newCache = new Map(prev);
            newCache.set(cacheKey, result);
            return newCache;
          });
          setLastCacheUpdate(Date.now());
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.error(`Attempt ${attempt + 1} failed:`, error);

        if (error instanceof Error && 
            (error.message.includes('quota-exceeded') || 
             error.message.includes('resource-exhausted'))) {
          logger.warn('Quota exceeded detected, entering quota exceeded state');
          setIsQuotaExceeded(true);
          setRateLimit(prev => Math.min(prev + 10000, 60000));
          
          // Calculate next quota reset time (assuming daily reset)
          const now = new Date();
          const nextReset = new Date(now);
          nextReset.setDate(nextReset.getDate() + 1);
          nextReset.setHours(0, 0, 0, 0);
          setQuotaResetTime(nextReset);
          
          const errorMessage = `Firebase quota exceeded. Quota will reset at ${nextReset.toLocaleTimeString()}. Please try again later.`;
          setError(errorMessage);
          setStatusMessage(errorMessage);
          throw new Error(errorMessage); // Re-throw to be caught by startAgent
        }

        const jitter = Math.random() * 2000;
        const delay = baseDelay * Math.pow(2, attempt) + jitter;
        logger.info(`Retrying in ${delay}ms...`);
        const retryMessage = `Operation failed. Retrying in ${Math.ceil(delay/1000)} seconds...`;
        setError(retryMessage);
        setStatusMessage(retryMessage);
        await sleep(delay);
        setError(null);
        setStatusMessage('');
      }
    }

    if (cacheKey && localCache.has(cacheKey)) {
      logger.warn('All retries failed, using cached value as fallback');
      return localCache.get(cacheKey) as T;
    }

    throw lastError || new Error('Max retries exceeded');
  }, [isOffline, isQuotaExceeded, rateLimit, lastRequestTime, logger, setError, setStatusMessage, setIsQuotaExceeded, setRateLimit, setQuotaResetTime, localCache, lastCacheUpdate, setLocalCache, setLastCacheUpdate]);

  useEffect(() => {
    let isMounted = true;

    const initializeClient = async () => {
      try {
        const meshClient = new MeshClient(firebaseConfig);
        if (isMounted) {
          setClient(meshClient);
          setStatusMessage('Mesh client initialized');
          
          // Initialize connection state
          const db = meshClient.getDb();
          connectionStateRef.current = ConnectionState.getInstance(db);
          
          // Subscribe to connection state changes
          connectionStateRef.current.subscribeToConnectionState((isOnline: boolean) => {
            if (isMounted) {
              setIsOffline(!isOnline);
              if (!isOnline) {
                setError('You are offline. Some features may be unavailable.');
                setStatusMessage('Offline - waiting for connection...');
                // Clear heartbeats when offline
                setHeartbeats(new Map());
              } else {
                setError(null);
                setStatusMessage('Back online');
              }
            }
          });
        }
      } catch (error) {
        logger.error('Failed to initialize client:', error);
        if (isMounted) {
          setError('Failed to initialize client. Please try again.');
        }
      }
    };

    initializeClient();

    return () => {
      isMounted = false;
      if (connectionStateRef.current) {
        connectionStateRef.current.unsubscribeFromConnectionState();
      }
    };
  }, [logger, setError, setStatusMessage, setHeartbeats, setIsOffline]);

  // Update the heartbeat subscription effect
  useEffect(() => {
    if (!client || !meshId) return;

    // Don't subscribe to heartbeats if we're offline
    if (isOffline) {
      setHeartbeats(new Map());
      return;
    }

    const unsubscribe = client.subscribeToHeartbeats(meshId, (newHeartbeats) => {
      try {
        // Create a new map with the latest heartbeats
        const updatedHeartbeats = new Map(heartbeats);

        // Update existing heartbeats and add new ones
        for (const [id, hb] of newHeartbeats) {
          // Preserve the original heartbeat data
          updatedHeartbeats.set(id, hb);
        }

        // Remove heartbeats that are no longer present
        for (const id of heartbeats.keys()) {
          if (!newHeartbeats.has(id)) {
            updatedHeartbeats.delete(id);
          }
        }

        // Update the state with the new heartbeats
        setHeartbeats(updatedHeartbeats);
        
        // Update status message
        const agentCount = updatedHeartbeats.size;
        setStatusMessage(`Detected ${agentCount} agents in mesh ${meshId}`);
        setError(null);
      } catch (error) {
        logger.error('Error processing heartbeats:', error);
      }
    });

    // Store unsubscribe function
    unsubscribeRef.current = unsubscribe;

    // Only cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [client, meshId, isOffline, heartbeats, logger, setError, setStatusMessage, setHeartbeats]);

  // Add effect to check if agent exists in mesh
  useEffect(() => {
    const checkAgentExists = async () => {
      if (!client || !meshId || !agentId) {
        setAgentExists(false);
        return;
      }

      try {
        const agents = await client.getAgents(meshId);
        // Check if the agent exists in the Map
        const exists = agents.has(agentId);
        setAgentExists(exists);
      } catch (error) {
        logger.error('Error checking if agent exists:', error instanceof Error ? error.message : 'Unknown error');
        setAgentExists(false);
      }
    };

    checkAgentExists();
  }, [client, meshId, agentId, logger]);

  const handleAgentAction = async () => {
    if (agentExists) {
      await reconnectAgent();
    } else {
      await startAgent();
    }
  };

  const startAgent = async () => {
    if (!meshId || meshId.trim() === '') {
      setError('Please enter a mesh ID');
      setStatusMessage('Please enter a mesh ID');
      return;
    }

    if (!client) {
      setError('Mesh client not initialized');
      setStatusMessage('Mesh client not initialized');
      return;
    }

    // Don't start agent if we're offline
    if (isOffline) {
      setError('Cannot start agent while offline');
      setStatusMessage('Please check your internet connection');
      return;
    }

    // Use provided agentId or generate a new one if not provided
    const newAgentId = agentId || uuidv4();
    if (!agentId) {
      setAgentId(newAgentId);
      const params = new URLSearchParams(searchParams);
      params.set('agentId', newAgentId);
      setSearchParams(params);
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage(`Starting new agent ${newAgentId} in mesh ${meshId}...`);

    try {
      // Initialize mesh
      const newMesh = new Mesh({ 
        meshId,
        firebaseConfig 
      });
      
      setMesh(newMesh);
      
      // Wait for mesh to be fully initialized
      await newMesh.start();
      logger.info(`[MESH] Mesh ${meshId} initialized successfully`);
      
      // Create agent with proper configuration
      logger.info(`Creating and starting new agent ${newAgentId}...`);
      const newAgent = new Agent({
        meshId,
        agentId: newAgentId,
        role: workerType,
        status: AgentStatus.Follower,
        firebaseConfig,
        heartbeatInterval: 30000,
        electionInterval: 45000,
        maxElectionTimeout: 60000
      });

      // Register agent with mesh before starting
      await newMesh.addAgent({
        agentId: newAgentId,
        role: workerType,
        status: AgentStatus.Follower,
        heartbeatInterval: 30000,
        electionInterval: 45000,
        maxElectionTimeout: 60000
      });

      // Start agent with retry
      await withRetry(async () => {
        await newAgent.start();
      }, 5, 10000, `agent-${newAgentId}`);
      
      setAgent(newAgent);
      setStatusMessage(`New agent ${newAgentId} started successfully as ${workerType}`);
      logger.info(`New agent ${newAgentId} started successfully`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start new agent';
      const errorDetails = err instanceof Error ? err.stack : String(err);
      logger.error(`Error starting new agent ${newAgentId}:`, { error: errorMessage, details: errorDetails });
      setError(errorMessage);
      setStatusMessage(`Error: ${errorMessage}`);
      setAgent(null);
      setMesh(null);
      setIsLoading(false);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const reconnectAgent = async () => {
    if (!meshId || meshId.trim() === '') {
      setError('Please enter a mesh ID');
      setStatusMessage('Please enter a mesh ID');
      return;
    }

    if (!client) {
      setError('Mesh client not initialized');
      setStatusMessage('Mesh client not initialized');
      return;
    }

    if (!agentId) {
      setError('No agent ID provided for reconnection');
      setStatusMessage('Please provide an agent ID to reconnect');
      return;
    }

    // Don't reconnect agent if we're offline
    if (isOffline) {
      setError('Cannot reconnect agent while offline');
      setStatusMessage('Please check your internet connection');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage(`Reconnecting agent ${agentId} in mesh ${meshId}...`);

    try {
      // Clean up any existing agent and mesh first
      if (agent) {
        logger.info(`Cleaning up existing agent ${agentId}...`);
        await agent.stop();
        setAgent(null);
      }
      if (mesh) {
        logger.info(`Cleaning up existing mesh ${meshId}...`);
        await mesh.cleanup();
        setMesh(null);
      }

      // Wait a moment to ensure cleanup is complete
      await sleep(1000);

      // Initialize mesh
      const newMesh = new Mesh({ 
        meshId,
        firebaseConfig 
      });
      
      setMesh(newMesh);
      
      // Wait for mesh to be fully initialized
      await newMesh.start();
      logger.info(`[MESH] Mesh ${meshId} initialized successfully`);
      
      // Create agent with proper configuration
      logger.info(`Creating and reconnecting agent ${agentId}...`);
      const newAgent = new Agent({
        meshId,
        agentId,
        role: workerType,
        status: AgentStatus.Follower,
        firebaseConfig,
        heartbeatInterval: 30000,
        electionInterval: 45000,
        maxElectionTimeout: 60000
      });

      // Register agent with mesh before starting
      await newMesh.addAgent({
        agentId,
        role: workerType,
        status: AgentStatus.Follower,
        heartbeatInterval: 30000,
        electionInterval: 45000,
        maxElectionTimeout: 60000
      });

      // Start agent with retry
      await withRetry(async () => {
        await newAgent.start();
      }, 5, 10000, `agent-${agentId}`);
      
      setAgent(newAgent);
      setStatusMessage(`Agent ${agentId} reconnected successfully as ${workerType}`);
      logger.info(`Agent ${agentId} reconnected successfully`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reconnect agent';
      const errorDetails = err instanceof Error ? err.stack : String(err);
      logger.error(`Error reconnecting agent ${agentId}:`, { error: errorMessage, details: errorDetails });
      setError(errorMessage);
      setStatusMessage(`Error: ${errorMessage}`);
      setAgent(null);
      setMesh(null);
      setIsLoading(false);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const stopAgent = async () => {
    if (agent) {
      try {
        setStatusMessage(`Stopping agent ${agentId}...`);
        await agent.stop();
        setAgent(null);
        if (mesh) {
          await mesh.cleanup();
          setMesh(null);
        }
        setStatusMessage(`Agent ${agentId} stopped`);
      } catch (error) {
        const errorMessage = `Error stopping agent: ${error instanceof Error ? error.message : String(error)}`;
        setError(errorMessage);
        setStatusMessage(errorMessage);
        logger.error(errorMessage);
      }
    }
  };

  // Update the cleanup effect to only run on unmount and handle cleanup properly
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          if (agent) {
            logger.info(`Stopping agent ${agentId}...`);
            await agent.stop();
            logger.info(`Agent ${agentId} stopped successfully`);
          }
          if (mesh) {
            logger.info(`Stopping mesh ${meshId}...`);
            await mesh.stop();
            logger.info(`Mesh ${meshId} stopped successfully`);
          }
        } catch (error) {
          logger.error('Error during cleanup:', error);
        }
      };
      cleanup();
    };
  }, []); // Empty dependency array means this only runs on unmount

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {isOffline && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              position: 'sticky',
              top: 0,
              zIndex: 1000
            }}
          >
            You are offline. Some features may be unavailable. Please check your internet connection.
          </Alert>
        )}
        
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            color: '#333',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          AI Agent SDK Demo
        </Typography>
        
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="body1">
            Status: {statusMessage}
          </Typography>
          {quotaResetTime && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Firebase quota exceeded. Next reset at: {quotaResetTime.toLocaleTimeString()}
            </Typography>
          )}
        </Paper>

        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label="Agent Network" />
          <Tab label="Logs" />
        </Tabs>

        {activeTab === 0 && (
          <>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={workerType}
                    label="Role"
                    onChange={(e) => {
                      const newRole = e.target.value as AgentRole;
                      setWorkerType(newRole);
                      const params = new URLSearchParams(searchParams);
                      params.set('workerType', newRole);
                      setSearchParams(params);
                    }}
                  >
                    <MenuItem value={AgentRole.Worker}>Worker</MenuItem>
                    <MenuItem value={AgentRole.Manager}>Manager</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Mesh ID"
                  value={meshId}
                  onChange={(e) => {
                    const newMeshId = e.target.value;
                    setMeshId(newMeshId);
                    const params = new URLSearchParams(searchParams);
                    params.set('meshId', newMeshId);
                    setSearchParams(params);
                  }}
                />

                <TextField
                  label="Agent ID"
                  value={agentId}
                  onChange={(e) => {
                    const newAgentId = e.target.value;
                    setAgentId(newAgentId);
                    const params = new URLSearchParams(searchParams);
                    params.set('agentId', newAgentId);
                    setSearchParams(params);
                  }}
                />

                <Button
                  variant="contained"
                  onClick={handleAgentAction}
                  disabled={isLoading || !!agent || !meshId || !agentId || !client}
                >
                  {isLoading 
                    ? (agentExists ? 'Reconnecting...' : 'Starting...') 
                    : (agentExists ? 'Reconnect Agent' : 'Start Agent')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={stopAgent}
                  disabled={!agent || isLoading}
                >
                  Stop Agent
                </Button>
              </Box>

              {agent && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="h6" gutterBottom>Current Agent Details</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Agent ID</Typography>
                      <Typography variant="body1">{agentId}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Role</Typography>
                      <Typography variant="body1" sx={{ 
                        color: workerType === AgentRole.Manager ? '#4CAF50' : '#2196F3',
                        fontWeight: 'bold'
                      }}>
                        {workerType === AgentRole.Manager ? 'Manager' : 'Worker'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Mesh ID</Typography>
                      <Typography variant="body1">{meshId}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                      <Typography variant="body1" sx={{ 
                        color: '#4CAF50',
                        fontWeight: 'bold'
                      }}>
                        Running
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Last Heartbeat</Typography>
                      <Typography variant="body1">
                        {new Date().toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Connection</Typography>
                      <Typography variant="body1" sx={{ 
                        color: isOffline ? '#FF5252' : '#4CAF50',
                        fontWeight: 'bold'
                      }}>
                        {isOffline ? 'Offline' : 'Online'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Agent Network
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#4CAF50' }} />
                  <Typography variant="body2">Worker</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#2196F3' }} />
                  <Typography variant="body2">Manager</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#9E9E9E' }} />
                  <Typography variant="body2">Inactive</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #4CAF50' }} />
                  <Typography variant="body2">Healthy</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #FFC107' }} />
                  <Typography variant="body2">Warning</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid #FF5252' }} />
                  <Typography variant="body2">Critical</Typography>
                </Box>
              </Box>
              <AgentGraph 
                heartbeats={heartbeats}
                logger={logger}
              />
            </Paper>
          </>
        )}

        {activeTab === 1 && (
          <LogViewer logger={logger} />
        )}

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => {
            setError(null);
            setStatusMessage('');
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => {
              setError(null);
              setStatusMessage('');
            }} 
            severity="error" 
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
}

export default App;
