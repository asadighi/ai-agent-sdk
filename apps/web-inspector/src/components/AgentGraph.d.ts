import { FC } from 'react';
import { Heartbeat } from '@ai-agent/core-sdk';
import { Logger } from '@ai-agent/multi-logger';
interface AgentGraphProps {
    width?: number;
    height?: number;
    heartbeats: Map<string, Heartbeat>;
    logger: Logger;
}
export declare const AgentGraph: FC<AgentGraphProps>;
export {};
//# sourceMappingURL=AgentGraph.d.ts.map