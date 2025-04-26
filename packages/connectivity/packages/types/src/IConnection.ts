export interface IConnection {
    id: string;
    name: string;
    type: string;
    status: ConnectionStatus;
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export enum ConnectionStatus {
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    ERROR = 'error'
} 