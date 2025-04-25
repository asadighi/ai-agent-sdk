# AI Agent SDK

A distributed real-time multiplayer game infrastructure that allows running multiple agents (both CLI and web-based) that can communicate with each other through Firebase.

## 🎯 Quick Example: Running a Mesh with Multiple Agents

Let's run a mesh with 4 agents: 2 leaders and 2 workers. Open 4 terminal windows and run:

```bash
# Terminal 1 - Primary Leader
npm run start:cli mesh1 leader

# Terminal 2 - Backup Leader
npm run start:cli mesh1 leader

# Terminal 3 - Worker 1
npm run start:cli mesh1 active

# Terminal 4 - Worker 2
npm run start:cli mesh1 active

# Terminal 4 - Web Leader
npm run start:web
```

Or, if you prefer the web interface, open your browser to `http://localhost:5173` and:
1. Set the mesh ID to "mesh1"
2. Create 4 browser tabs
3. Set roles to "leader" in two tabs and "active" in the other two
4. Start all agents

The leaders will coordinate the mesh while the workers participate in the game. All agents will communicate in real-time through Firebase.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.16.1 or higher
- npm 9.8.0 or higher
- A Firebase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-agent-sdk
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root with your Firebase configuration:
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## 🛠️ Available Scripts

### From Root Directory

#### Building
- `npm run build` - Build all packages and apps
- `npm run build:web` - Build only the web app
- `npm run build:cli` - Build only the CLI app
- `npm run build:sdk` - Build only the SDK package

#### Development
- `npm run dev:web` - Start the web app in development mode
- `npm run dev:cli` - Start the CLI app in development mode
- `npm run dev:sdk` - Start the SDK package in development mode
- `npm run dev:all` - Start both SDK and web app in development mode

#### Production
- `npm run start:cli` - Start the CLI app in production mode
- `npm run start:web` - Start the web app in development mode

#### Clean and Rebuild
- `npm run rebuild:all` - Clean and rebuild everything
- `npm run rebuild:web` - Clean and rebuild the web app
- `npm run rebuild:cli` - Clean and rebuild the CLI app
- `npm run rebuild:sdk` - Clean and rebuild the SDK package

### From Web App Directory (`apps/web`)
- `npm run build` - Build the web app
- `npm run dev` - Start the web app in development mode
- `npm run start` - Same as dev (for consistency)
- `npm run start:root` - Start from root directory
- `npm run rebuild` - Clean and rebuild the web app

### From CLI App Directory (`apps/cli`)
- `npm run build` - Build the CLI app
- `npm run dev` - Start the CLI app in development mode
- `npm run start` - Start the CLI app in production mode
- `npm run start:root` - Start from root directory
- `npm run rebuild` - Clean and rebuild the CLI app

## 🎮 Running Agents

### CLI Agent

To run a CLI agent:
```bash
# From root directory
npm run start:cli [meshId] [role]

# From CLI directory
npm run start [meshId] [role]
```

Example:
```bash
npm run start:cli mesh1 leader
```

Available roles:
- `active` (participates in the game)
- `leader` (command central, validates actions)
- `observer` (read-only view)
- `public` (sees only public state)
- `banned` (no access)

### Web Interface

1. Start the development server:
```bash
# From root directory
npm run start:web

# From web directory
npm run dev
```

2. Open your browser to `http://localhost:5173`

The web interface allows you to:
- Set a custom mesh ID
- Choose an agent role
- Start/stop agents
- View real-time events from other agents
- Monitor agent status

## 🔧 Project Structure

This is a monorepo using npm workspaces with the following structure:

```
ai-agent-sdk/
├── packages/
│   ├── sdk/            # Core SDK package
│   │   ├── src/
│   │   │   ├── agent.ts         # Agent class implementation
│   │   │   ├── fireStoreClient.ts # Firebase integration
│   │   │   ├── firebaseConfig.ts # Firebase configuration
│   │   │   ├── memory.ts        # Memory management
│   │   │   ├── leader.ts        # Leader implementation
│   │   │   ├── types.ts         # TypeScript type definitions
│   │   │   └── webWorker.ts     # Web worker implementation
│   │   └── package.json
│   └── shared/         # Shared utilities and types
├── apps/
│   ├── cli/           # Command-line interface
│   │   ├── src/       # Source files
│   │   └── package.json
│   └── web/           # Web interface
│       ├── src/       # Source files
│       └── package.json
├── package.json       # Root package.json with workspace config
└── README.md          # This file
```

## 🔄 How It Works

1. **Mesh**: Each game session is a mesh with multiple agents
2. **Agents**: Each agent (CLI or web-based) has a unique ID and role
3. **Leadership**: Each mesh has:
   - A primary leader for command and control
   - Backup leaders for failover
4. **Memory Model**: Each agent maintains memory in three scopes:
   - `private`: Only accessible to the agent
   - `internal`: Visible to agents with appropriate claims
   - `public`: Visible to all agents
5. **Events**: Agents communicate through Firebase Firestore events

## 🛠️ Development

### Available Scripts

- `npm run build`: Build all packages and applications
- `npm run dev`: Start development mode for all packages
- `npm run clean`: Clean all build artifacts
- `npm run lint`: Run linting across all packages
- `npm run format`: Format code using Prettier

### Building Individual Packages

To build a specific package or app:
```bash
# Build SDK package
cd packages/sdk
npm run build

# Build CLI app
cd apps/cli
npm run build

# Build Web app
cd apps/web
npm run build
```

## 🔒 Security

The current Firebase security rules allow full read/write access for development purposes. In production, you should implement more restrictive rules based on your security requirements.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details. 