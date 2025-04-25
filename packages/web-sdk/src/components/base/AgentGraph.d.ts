import React from 'react';
import { AgentRole, AgentStatus } from '@ai-agent/core-sdk';
export interface AgentNode {
    id: string;
    role: AgentRole;
    status: AgentStatus;
    lastSeen: number;
}
export interface AgentLink {
    source: string;
    target: string;
    type: string;
}
export interface AgentGraphProps {
    nodes: AgentNode[];
    links: AgentLink[];
    width?: number;
    height?: number;
    onNodeClick?: (node: AgentNode) => void;
    onNodeHover?: (node: AgentNode | null) => void;
    className?: string;
    style?: React.CSSProperties;
}
export declare const BaseAgentGraph: React.FC<AgentGraphProps>;
//# sourceMappingURL=AgentGraph.d.ts.map