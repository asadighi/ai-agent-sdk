import { Logger, LogLevel } from '@ai-agent/multi-logger';
export class ConnectionState {
    constructor() {
        this.isOnline = false;
        this.subscribers = [];
        this.logger = new Logger({
            logLevel: LogLevel.INFO,
            logToConsole: true,
            maxLogs: 1000,
            rotationInterval: 60000
        });
    }
    handleOnline() {
        if (!this.isOnline) {
            this.logger.info('Connection restored');
            this.isOnline = true;
            this.notifySubscribers(true);
        }
    }
    handleOffline() {
        if (this.isOnline) {
            this.logger.info('Connection lost');
            this.isOnline = false;
            this.notifySubscribers(false);
        }
    }
    notifySubscribers(isOnline) {
        this.subscribers.forEach(callback => {
            try {
                callback(isOnline);
            }
            catch (error) {
                this.logger.error('Error in connection state subscriber:', error);
            }
        });
    }
    subscribeToConnectionState(callback) {
        this.subscribers.push(callback);
        callback(this.isOnline);
    }
    unsubscribeFromConnectionState(callback) {
        this.subscribers = this.subscribers.filter(sub => sub !== callback);
    }
    getIsOnline() {
        return this.isOnline;
    }
}
//# sourceMappingURL=connection.js.map