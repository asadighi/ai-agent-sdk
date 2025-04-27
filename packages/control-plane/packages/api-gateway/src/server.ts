import { ApiGateway } from './ApiGateway';
import { NodeLogger } from '@ai-agent/multi-logger/node';
import { Request, Response } from 'express';
import { WebSocket } from 'ws';

const logger = new NodeLogger();
const port = parseInt(process.env.PORT || '3000', 10);
const gateway = new ApiGateway({
    port,
    logger
});

// Register REST endpoints
gateway.registerRestRoute('GET', '/health', async (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

gateway.registerRestRoute('POST', '/echo', async (req: Request, res: Response) => {
    res.json({ echo: req.body });
});

// Register WebSocket endpoints
gateway.registerWebSocketRoute('/ws/echo', async (ws: WebSocket, message: any) => {
    if (typeof message === 'string') {
        try {
            const data = JSON.parse(message);
            ws.send(JSON.stringify({ echo: data }));
        } catch (error) {
            ws.send(JSON.stringify({ error: 'Invalid JSON message' }));
        }
    } else {
        ws.send(JSON.stringify({ echo: message }));
    }
});

async function startServer() {
    try {
        await gateway.start();
        logger.info(`API Gateway is running on port ${port}`);
    } catch (error) {
        logger.error('Failed to start API Gateway:', error);
        process.exit(1);
    }
}

startServer(); 