import type { Firestore } from '@firebase/firestore-types';
import { IStorageClient, IStorageConfig, Heartbeat, PresenceStatus, ElectionMessage } from '@ai-agent/common-sdk';
import { AgentRole, AgentStatus } from '@ai-agent/common-sdk';
export interface IFirebaseConfig extends IStorageConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}
export declare class FirebaseStorageClient implements IStorageClient {
    private db;
    constructor(db: Firestore);
    registerAgent(params: {
        meshId: string;
        agentId: string;
        role: AgentRole;
        status: AgentStatus;
    }): Promise<void>;
    updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void>;
    getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>>;
    updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void>;
    getHeartbeats(meshId: string): Promise<Map<string, Heartbeat>>;
    sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=firebaseStorage.d.ts.map