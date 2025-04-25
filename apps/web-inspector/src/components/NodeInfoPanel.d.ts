import { AgentRole, AgentStatus } from '@ai-agent/core-sdk';
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
export declare function NodeInfoPanel({ node, isOpen, onClose }: NodeInfoPanelProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=NodeInfoPanel.d.ts.map