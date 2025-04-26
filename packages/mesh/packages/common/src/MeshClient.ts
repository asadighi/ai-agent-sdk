import { IMeshClient } from "@ai-agent/mesh/types";
import { ILogger } from "@ai-agent/multi-logger/types";


export class MeshClient implements IMeshClient {
    constructor(private readonly logger: ILogger) {
        if (!logger) {
            throw new Error("Logger is required");
        }
        this.logger = logger;
    }
} 