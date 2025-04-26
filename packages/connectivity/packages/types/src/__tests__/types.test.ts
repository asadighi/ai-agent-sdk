import { describe, it, expect } from 'vitest';
import { IConnection, ConnectionStatus } from '../index';

describe('Connectivity Types', () => {
  describe('IConnection', () => {
    it('should have required properties', () => {
      const connection: IConnection = {
        id: 'test-id',
        name: 'Test Connection',
        type: 'firebase',
        status: ConnectionStatus.CONNECTED,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(connection).toBeDefined();
      expect(connection.id).toBe('test-id');
      expect(connection.name).toBe('Test Connection');
      expect(connection.type).toBe('firebase');
      expect(connection.status).toBe(ConnectionStatus.CONNECTED);
    });
  });

  describe('ConnectionStatus', () => {
    it('should have all required status values', () => {
      expect(ConnectionStatus.CONNECTED).toBe('connected');
      expect(ConnectionStatus.DISCONNECTED).toBe('disconnected');
      expect(ConnectionStatus.CONNECTING).toBe('connecting');
      expect(ConnectionStatus.ERROR).toBe('error');
    });
  });
}); 