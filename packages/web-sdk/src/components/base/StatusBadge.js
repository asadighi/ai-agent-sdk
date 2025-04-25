import React from 'react';
import { AgentStatus } from '@ai-agent/core-sdk';
import { useTheme } from '../../theme/ThemeProvider';
export const StatusBadge = ({ status, className, style }) => {
    const theme = useTheme();
    const getStatusColor = (status) => {
        switch (status) {
            case AgentStatus.Active:
                return theme.agents.active;
            case AgentStatus.Offline:
                return theme.agents.offline;
            case AgentStatus.Error:
                return theme.agents.error;
            default:
                return theme.colors.info;
        }
    };
    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
        borderRadius: theme.borderRadius,
        backgroundColor: getStatusColor(status),
        color: '#FFFFFF',
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        ...style
    };
    return (<div className={className} style={baseStyle}>
            {status}
        </div>);
};
//# sourceMappingURL=StatusBadge.js.map