import { ILogger } from '@ai-agent/multi-logger/types';
/**
 * Common dependency tokens used across the application
 */
export declare const Tokens: {
    /**
     * Logger implementation token
     * Expected type: ILogger
     */
    readonly Logger: symbol;
    /**
     * Storage implementation token
     * Expected type: IStorage
     */
    readonly Storage: symbol;
    /**
     * Configuration token
     * Expected type: AppConfig
     */
    readonly Config: symbol;
    /**
     * Event bus token
     * Expected type: EventBus
     */
    readonly EventBus: symbol;
};
export type { ILogger };
//# sourceMappingURL=tokens.d.ts.map