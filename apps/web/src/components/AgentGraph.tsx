import { useEffect, useRef, useState, FC } from 'react';
import { AgentRole, AgentStatus, Heartbeat } from '@ai-agent/core-sdk';
import { Logger } from '@ai-agent/multi-logger';
import { Box } from '@mui/material';
import { NodeInfoPanel } from './NodeInfoPanel';
import PropTypes from 'prop-types';

interface AgentNode {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  lastHeartbeat: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  source: string;
  target: string;
}

interface AgentGraphProps {
  width?: number;
  height?: number;
  heartbeats: Map<string, Heartbeat>;
  logger: Logger;
}

// Constants
const NODE_RADIUS = 20;

const getNodeColor = (node: AgentNode): string => {
  if (node.role === AgentRole.Manager) {
    return node.status === AgentStatus.Active ? '#4CAF50' : '#8BC34A';
  }
  return node.status === AgentStatus.Active ? '#2196F3' : '#90CAF9';
};

export const AgentGraph: FC<AgentGraphProps> = ({ width = 800, height = 600, heartbeats, logger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Map<string, AgentNode>>(new Map());
  const edgesRef = useRef<Edge[]>([]);
  const animationFrameRef = useRef<number>();
  const [hoveredNode, setHoveredNode] = useState<AgentNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Update node data without triggering canvas redraw
  useEffect(() => {
    const updateNodes = () => {
      const newNodes = new Map<string, AgentNode>();
      const newEdges = new Set<Edge>();

      // Process each heartbeat
      Array.from(heartbeats.entries()).forEach(([id, heartbeat]) => {
        if (!heartbeat) {
          logger.warn('Received undefined heartbeat for id:', { id });
          return;
        }

        // Get existing node if it exists
        const existingNode = nodesRef.current.get(id);
        
        // Always update the node with the latest heartbeat timestamp
        const node: AgentNode = {
          id,
          x: existingNode?.x ?? Math.random() * width,
          y: existingNode?.y ?? Math.random() * height,
          vx: existingNode?.vx ?? 0,
          vy: existingNode?.vy ?? 0,
          role: heartbeat.role,
          status: heartbeat.status,
          lastHeartbeat: heartbeat.timestamp
        };
        newNodes.set(id, node);

        // Create edges to other nodes
        Array.from(heartbeats.entries()).forEach(([otherId, otherHeartbeat]) => {
          if (otherId !== id && otherHeartbeat) {
            newEdges.add({
              source: id,
              target: otherId
            });
          }
        });
      });

      nodesRef.current = newNodes;
      edgesRef.current = Array.from(newEdges);
      setRenderTrigger(prev => prev + 1);

      // Update hovered/selected nodes with latest data
      if (hoveredNode) {
        const updatedHoveredNode = newNodes.get(hoveredNode.id);
        if (updatedHoveredNode) {
          setHoveredNode(updatedHoveredNode);
        }
      }
      if (selectedNode) {
        const updatedSelectedNode = newNodes.get(selectedNode.id);
        if (updatedSelectedNode) {
          setSelectedNode(updatedSelectedNode);
        }
      }
    };

    updateNodes();
  }, [heartbeats, width, height, logger, hoveredNode, selectedNode]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update node positions
      const updatedNodes = new Map<string, AgentNode>();
      nodesRef.current.forEach((node, id) => {
        // Reset forces
        let fx = 0;
        let fy = 0;

        // Repulsion from other nodes
        nodesRef.current.forEach((otherNode, otherId) => {
          if (id === otherId) return;

          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Stronger repulsion with larger range
          if (distance < 200) {
            const repulsion = 5000 / (distance * distance);
            fx += (dx / distance) * repulsion;
            fy += (dy / distance) * repulsion;
          }
        });

        // Very weak attraction to center
        const centerDx = width / 2 - node.x;
        const centerDy = height / 2 - node.y;
        const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
        const centerForce = centerDistance * 0.001; // Much weaker center force
        
        fx += (centerDx / centerDistance) * centerForce;
        fy += (centerDy / centerDistance) * centerForce;

        // Apply forces with stronger damping
        node.vx = (node.vx + fx) * 0.7; // Increased damping
        node.vy = (node.vy + fy) * 0.7;

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Keep nodes within bounds with padding
        const padding = NODE_RADIUS * 2;
        node.x = Math.max(padding, Math.min(width - padding, node.x));
        node.y = Math.max(padding, Math.min(height - padding, node.y));

        updatedNodes.set(id, node);
      });

      nodesRef.current = updatedNodes;

      // Draw edges
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      edgesRef.current.forEach(edge => {
        const source = nodesRef.current.get(edge.source);
        const target = nodesRef.current.get(edge.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodesRef.current.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = getNodeColor(node);
        ctx.fill();
        ctx.strokeStyle = node === hoveredNode ? '#FFC107' : '#000';
        ctx.lineWidth = node === hoveredNode ? 3 : 2;
        ctx.stroke();

        // Draw node label
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id, node.x, node.y);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height, renderTrigger, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if mouse is over any node
    const nodeUnderMouse = Array.from(nodesRef.current.values()).find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS;
    });

    setHoveredNode(nodeUnderMouse || null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on a node
    const clickedNode = Array.from(nodesRef.current.values()).find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setIsPanelOpen(true);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <Box sx={{ width, height, border: '1px solid #ccc', borderRadius: 1, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ width: '100%', height: '100%' }}
      />
      <NodeInfoPanel
        node={selectedNode}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
      />
    </Box>
  );
};

AgentGraph.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  heartbeats: (props: { [key: string]: unknown }, propName: string, componentName: string) => {
    const prop = props[propName];
    if (!(prop instanceof Map)) {
      return new Error(
        `Invalid prop \`${propName}\` supplied to \`${componentName}\`. Expected a Map.`
      );
    }
    for (const [key, value] of prop.entries()) {
      if (typeof key !== 'string') {
        return new Error(
          `Invalid prop \`${propName}\` supplied to \`${componentName}\`. Map keys must be strings.`
        );
      }
      if (!value || typeof value !== 'object') {
        return new Error(
          `Invalid prop \`${propName}\` supplied to \`${componentName}\`. Map values must be objects.`
        );
      }
      if (!('agentId' in value) || !('role' in value) || !('status' in value) || !('timestamp' in value)) {
        return new Error(
          `Invalid prop \`${propName}\` supplied to \`${componentName}\`. Map values must have required Heartbeat properties.`
        );
      }
    }
    return null;
  },
  logger: PropTypes.instanceOf(Logger).isRequired
}; 