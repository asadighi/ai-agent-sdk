import React from 'react';
import { AgentRole, AgentStatus } from '@ai-agent/core-sdk';
export interface AgentCardProps {
    agentId: string;
    role: AgentRole;
    status: AgentStatus;
    lastSeen: number;
    isLeader?: boolean;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}
export declare const AgentCard: React.FC<AgentCardProps>;
//# sourceMappingURL=AgentCard.d.ts.map