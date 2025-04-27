# API Gateway

The API Gateway module provides a unified interface for handling both REST and WebSocket connections in the AI Agent Control Plane.

## Features

- REST API endpoints
- WebSocket connections
- Built-in rate limiting
- CORS support
- JWT authentication
- Health check endpoint
- Echo endpoint for testing

## Prerequisites

- Node.js (v18 or higher)
- pnpm
- TypeScript

## Installation

1. Navigate to the project root directory
2. Install dependencies:
```bash
pnpm install
```

## Running the Server

### Development Mode

To run the server in development mode with hot reloading:

```bash
pnpm run dev
```

The server will start on port 3000 by default. You can change the port by setting the `PORT` environment variable:

```bash
PORT=4000 pnpm run dev
```

### Production Mode

1. First, build the project:
```bash
pnpm run build
```

2. Then run the server:
```bash
node dist/server.js
```

## Testing

### Running Tests

To run all tests:
```bash
pnpm test
```

To run tests in watch mode (useful during development):
```bash
pnpm run test:watch
```

To generate test coverage report:
```bash
pnpm run test:coverage
```

## Available Endpoints

### REST Endpoints

- `GET /health` - Health check endpoint
- `POST /echo` - Echo endpoint that returns the request body

### WebSocket Endpoints

- `ws://localhost:3000/ws/echo` - WebSocket echo endpoint

## Testing the API

### Testing REST Endpoints

1. Health Check:
```bash
curl http://localhost:3000/health
```

2. Echo Endpoint:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"message":"hello"}' http://localhost:3000/echo
```

### Testing WebSocket Endpoints

You can use any WebSocket client to test the WebSocket endpoint. Here's an example using `wscat`:

1. Install wscat:
```bash
pnpm add -g wscat
```

2. Connect to the WebSocket server:
```bash
wscat -c ws://localhost:3000/ws/echo
```

3. Send a message:
```json
{"message": "hello"}
```

## Development

### Code Quality

To run linting:
```bash
pnpm run lint
```

To format code:
```bash
pnpm run format
```

### Building

To build the project:
```bash
pnpm run build
```

To clean the build directory:
```bash
pnpm run clean
```

## Troubleshooting

If you encounter any issues:

1. Check that all dependencies are installed correctly
2. Ensure no other service is running on the default port (3000)
3. Check the logs for any error messages
4. Verify that the environment variables are set correctly

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests and ensure they pass
4. Submit a pull request

## License

This project is licensed under the terms of the MIT license. 