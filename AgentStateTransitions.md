# Agent State Transitions

This document describes the state transitions for both Worker and Manager agents in the mesh network.

## Agent Statuses

- `Active`: Agent is healthy and participating in the mesh
- `Follower`: Agent is following another agent (Manager-specific)
- `Offline`: Agent has lost connection
- `Terminated`: Agent has been intentionally stopped

## Worker State Transitions

Workers have a simpler state machine:

1. **Initial State**
   - Workers start as `Active` when they join the mesh

2. **Connection Changes**
   - When connection is lost: `Active` → `Offline`
   - When connection is restored: `Offline` → `Active`

3. **Termination**
   - When intentionally stopped: `Active` → `Terminated`
   - When intentionally stopped while offline: `Offline` → `Terminated`

## Manager State Transitions

Managers have a more complex state machine due to their role in elections:

1. **Initial State**
   - Managers start as `Follower` when they join the mesh

2. **Election-Related Changes**
   - When winning an election: `Follower` → `Active`
   - When losing an election: `Active` → `Follower`
   - When detecting another active manager: `Active` → `Follower`

3. **Connection Changes**
   - When connection is lost: `Active`/`Follower` → `Offline`
   - When connection is restored: `Offline` → `Follower`

4. **Termination**
   - When intentionally stopped: `Active`/`Follower` → `Terminated`
   - When intentionally stopped while offline: `Offline` → `Terminated`

## Notes

- Workers never participate in elections
- Workers never become `Follower`
- Managers always start as `Follower` and can only become `Active` through winning an election
- Both Workers and Managers can become `Offline` due to connection issues
- Both Workers and Managers can become `Terminated` when intentionally stopped 