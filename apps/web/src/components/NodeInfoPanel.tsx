import { Box, Paper, Typography, IconButton, Collapse } from '@mui/material';
import { AgentRole, AgentStatus } from '@ai-agent/core-sdk';
import CloseIcon from '@mui/icons-material/Close';

interface NodeInfoPanelProps {
  node: {
    id: string;
    role: AgentRole;
    status: AgentStatus;
    lastHeartbeat: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function NodeInfoPanel({ node, isOpen, onClose }: NodeInfoPanelProps) {
  if (!node) return null;

  const timeSinceLastHeartbeat = Date.now() - node.lastHeartbeat;
  const isDisconnected = timeSinceLastHeartbeat > 10000; // 10 seconds threshold

  return (
    <Collapse in={isOpen} orientation="horizontal" sx={{ position: 'absolute', right: 0, top: 0, height: '100%' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          width: 300, 
          height: '100%', 
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Node Details</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Agent ID</Typography>
            <Typography variant="body1">{node.id}</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">Role</Typography>
            <Typography variant="body1" sx={{ 
              color: node.role === AgentRole.Manager ? '#4CAF50' : '#2196F3',
              fontWeight: 'bold'
            }}>
              {node.role === AgentRole.Manager ? 'Manager' : 'Worker'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
            <Typography variant="body1" sx={{ 
              color: node.status === AgentStatus.Active ? '#4CAF50' : '#FFC107',
              fontWeight: 'bold'
            }}>
              {node.status === AgentStatus.Active ? 'Active' : 'Inactive'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">Last Heartbeat</Typography>
            <Typography variant="body1" sx={{ 
              color: isDisconnected ? '#FF5252' : '#4CAF50',
              fontWeight: 'bold'
            }}>
              {isDisconnected ? 'Disconnected' : new Date(node.lastHeartbeat).toLocaleTimeString()}
            </Typography>
            {!isDisconnected && (
              <Typography variant="caption" color="text.secondary">
                {Math.floor(timeSinceLastHeartbeat / 1000)} seconds ago
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">Health Status</Typography>
            <Typography variant="body1" sx={{ 
              color: isDisconnected ? '#FF5252' : '#4CAF50',
              fontWeight: 'bold'
            }}>
              {isDisconnected ? 'Critical' : 'Healthy'}
            </Typography>
          </Box>

          {isDisconnected && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#FFEBEE', borderRadius: 1 }}>
              <Typography variant="body2" color="error">
                This node has been disconnected for more than 10 seconds. It may have stopped or encountered an error.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Collapse>
  );
} 