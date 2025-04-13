# AI Agent SDK

A distributed real-time multiplayer game infrastructure that allows running multiple agents (both CLI and web-based) that can communicate with each other through Firebase.

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

4. Build all packages:
```bash
npm run build
```

### Running Agents

#### CLI Agent

To run a CLI agent:
```bash
cd apps/cli
npm run start [meshId] [role]
```

Example:
```bash
npm run start mesh1 leader
```

Available roles:
- `active` (participates in the game)
- `leader` (command central, validates actions)
- `observer` (read-only view)
- `public` (sees only public state)
- `banned` (no access)

#### Web Interface

1. Start the development server:
```bash
cd apps/web
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
│   │   ├── dist/      # Compiled output
│   │   └── package.json
│   └── web/           # React web interface
│       ├── src/       # Source files
│       └── package.json
├── package.json       # Root package.json
└── turbo.json        # Turborepo configuration
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