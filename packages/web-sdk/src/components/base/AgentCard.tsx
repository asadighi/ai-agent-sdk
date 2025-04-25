import React from 'react';
import { AgentRole, AgentStatus } from '@ai-agent/core-sdk';
import { useTheme } from '../../theme/ThemeProvider';
import { StatusBadge } from './StatusBadge';

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

export const AgentCard: React.FC<AgentCardProps> = ({
    agentId,
    role,
    status,
    lastSeen,
    isLeader = false,
    onClick,
    className,
    style
}) => {
    const theme = useTheme();

    const baseStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius,
        boxShadow: theme.shadows.sm,
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${theme.colors.text.disabled}`,
        transition: 'box-shadow 0.2s ease-in-out',
        ':hover': {
            boxShadow: theme.shadows.md
        },
        ...style
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm
    };

    const titleStyle: React.CSSProperties = {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs
    };

    const subtitleStyle: React.CSSProperties = {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm
    };

    const formatLastSeen = (timestamp: number): string => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    return (
        <div className={className} style={baseStyle} onClick={onClick}>
            <div style={headerStyle}>
                <StatusBadge status={status} />
                {isLeader && (
                    <div style={{
                        backgroundColor: theme.agents.leader,
                        color: '#FFFFFF',
                        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                        borderRadius: theme.borderRadius,
                        fontSize: theme.typography.fontSize.sm
                    }}>
                        Leader
                    </div>
                )}
            </div>
            <div style={titleStyle}>{agentId}</div>
            <div style={subtitleStyle}>Role: {role}</div>
            <div style={subtitleStyle}>Last seen: {formatLastSeen(lastSeen)}</div>
        </div>
    );
}; 