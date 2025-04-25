import { MeshClient as CoreMeshClient } from '@ai-agent/core-sdk';
import { BrowserConnectionState } from './connection/BrowserConnectionState';
export class MeshClient extends CoreMeshClient {
    constructor(config) {
        super(config);
        this.connectionState = new BrowserConnectionState(this.getDb());
    }
    getConnectionState() {
        return this.connectionState;
    }
}
//# sourceMappingURL=MeshClient.js.map