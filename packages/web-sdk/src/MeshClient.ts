import { MeshClient as CoreMeshClient } from '@ai-agent/core-sdk';
import { BrowserConnectionState } from './connection/BrowserConnectionState';

export class MeshClient extends CoreMeshClient {
    private connectionState: BrowserConnectionState;

    constructor(config: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
    }) {
        super(config);
        this.connectionState = new BrowserConnectionState(this.getDb());
    }

    getConnectionState(): BrowserConnectionState {
        return this.connectionState;
    }
} 