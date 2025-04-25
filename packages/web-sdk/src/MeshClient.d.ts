import { MeshClient as CoreMeshClient } from '@ai-agent/core-sdk';
import { BrowserConnectionState } from './connection/BrowserConnectionState';
export declare class MeshClient extends CoreMeshClient {
    private connectionState;
    constructor(config: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
    });
    getConnectionState(): BrowserConnectionState;
}
//# sourceMappingURL=MeshClient.d.ts.map