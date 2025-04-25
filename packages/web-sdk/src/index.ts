// Core functionality
export { BrowserConnectionState } from './connection/BrowserConnectionState';
export { WorkerMeshStore, type WorkerMeshStoreConfig } from './stores/WorkerMeshStore';

// Components
export { BaseAgentGraph, type AgentGraphProps, type AgentNode, type AgentLink } from './components/base/AgentGraph';
export { StatusBadge, type StatusBadgeProps } from './components/base/StatusBadge';
export { AgentCard, type AgentCardProps } from './components/base/AgentCard';

// Theme
export { ThemeProvider, useTheme, type ThemeProviderProps } from './theme/ThemeProvider';
export { defaultTheme } from './theme/default';
export type { Theme, ColorPalette, Spacing, Typography, AgentColors } from './theme/types';

// Re-export types from core-sdk that are used in the web-sdk
export type {
    Heartbeat,
    ElectionMessage,
    AgentStatus,
    AgentRole,
    FirebaseMeshStore
} from '@ai-agent/core-sdk'; 