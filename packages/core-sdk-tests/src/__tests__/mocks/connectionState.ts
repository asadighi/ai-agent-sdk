import { vi } from 'vitest';

type ConnectionStateCallback = (isOnline: boolean) => void;

export class MockConnectionState {
  private _isOnline: boolean = true;
  private _subscribers: ConnectionStateCallback[] = [];

  constructor() {
    // Initialize with default online state
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  subscribeToConnectionState = vi.fn().mockImplementation((callback: ConnectionStateCallback) => {
    this._subscribers.push(callback);
    callback(this._isOnline);
  });

  unsubscribeFromConnectionState = vi.fn().mockImplementation((callback: ConnectionStateCallback) => {
    this._subscribers = this._subscribers.filter(sub => sub !== callback);
  });

  // Test helper methods
  setMockOnline(online: boolean): void {
    this._isOnline = online;
    this._subscribers.forEach(callback => callback(online));
  }
}

module.exports = { MockConnectionState }; 