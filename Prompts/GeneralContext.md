# Agent-Based Game Infrastructure Context

## 🧠 Overview

I'm building a distributed real-time multiplayer game infrastructure.

Each **game session (mesh)** has **12–15 agents**. Each agent is either:
- a **human** (running in the browser, ideally as a Web Worker), or
- an **AI agent** (running in Lambda, Firebase Function, Fargate, etc.).

## 🧩 Agent Roles

Each agent has a **role**:
1. **Active** (participates in the game)
2. **Leader** (command central, validates all actions, cascades state)
3. **Observer** (read-only view scoped to another agent)
4. **Public** (sees only public state)
5. **Banned** (no access or visibility)

## 🧠 Agent Memory Model

Each agent maintains memory in 3 scopes:
- `private`: only accessible to the agent
- `internal`: visible to agents with appropriate claims
- `public`: visible to all agents

## 🎮 Leader Responsibilities

The **leader** is the source of truth:
- During bootstrap, it provides agents with their initial view of the world.
- It receives all actions from agents, determines outcomes, and selectively broadcasts results based on scope.
- It informs each agent of their available actions at each moment.
- It may queue, delay, or filter what gets broadcast.

## 🧭 Failover Strategy

Each game session has **at least 2 leaders**:
- One is the **primary leader**.
- A **backup leader** handles failover via timeout + confirmation loop.

## 🛠️ Architecture

Using a **hybrid Firebase-first architecture**:
- **Firestore** for state and real-time updates
- **Firebase Functions** for leadership, triggers, and orchestration
- **TypeScript SDK (`ai-agent-sdk`)** encapsulates agent logic (memory, action, health) to be deployable across environments

## 🎯 Goals

- Spin up multiple independent meshes
- Dynamically add/remove agents
- Perform proper leader election among leaders
- Test state cascading and dummy actions before layering real game logic
