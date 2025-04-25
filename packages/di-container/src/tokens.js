/**
 * Common dependency tokens used across the application
 */
export const Tokens = {
    /**
     * Logger implementation token
     * Expected type: ILogger
     */
    Logger: Symbol('Logger'),
    /**
     * Storage implementation token
     * Expected type: IStorage
     */
    Storage: Symbol('Storage'),
    /**
     * Configuration token
     * Expected type: AppConfig
     */
    Config: Symbol('Config'),
    /**
     * Event bus token
     * Expected type: EventBus
     */
    EventBus: Symbol('EventBus'),
};
//# sourceMappingURL=tokens.js.map