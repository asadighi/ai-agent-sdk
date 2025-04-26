import { IMeshClient } from "@ai-agent/mesh/types";
import { ILogger } from "@ai-agent/multi-logger/types";

/**
 * MeshClient is a class that implements the IMeshClient interface.
 * It is used to register agents, update their status, and get their statuses.
 * It also subscribes to heartbeats and election messages.
 * 
 * 
 */
export class MeshClient implements IMeshClient {
    constructor(private readonly logger: ILogger) {
        if (!logger) {
            throw new Error("Logger is required");
        }
        this.logger = logger;
    }
} 