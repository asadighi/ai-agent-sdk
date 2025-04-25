import type { Firestore } from '@firebase/firestore-types';
import { IStorageClient, IStorageConfig, Heartbeat, PresenceStatus, ElectionMessage } from '@ai-agent/common-sdk';
import { AgentRole, AgentStatus } from '@ai-agent/common-sdk';
import { collection, doc, setDoc, getDoc, getDocs } from '@firebase/firestore';

export interface IFirebaseConfig extends IStorageConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export class FirebaseStorageClient implements IStorageClient {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async registerAgent(params: {
    meshId: string;
    agentId: string;
    role: AgentRole;
    status: AgentStatus;
  }): Promise<void> {
    const agentRef = doc(collection(this.db, 'meshes', params.meshId, 'agents'), params.agentId);
    await setDoc(agentRef, {
      role: params.role,
      status: params.status,
      lastSeen: Date.now(),
      agentId: params.agentId
    });
  }

  async updateAgentStatus(meshId: string, agentId: string, status: AgentStatus): Promise<void> {
    const agentRef = doc(collection(this.db, 'meshes', meshId, 'agents'), agentId);
    await setDoc(agentRef, { status, lastSeen: Date.now() }, { merge: true });
  }

  async getAgentStatuses(meshId: string): Promise<Map<string, PresenceStatus>> {
    const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
    const snapshot = await getDocs(agentsRef);
    const statuses = new Map<string, PresenceStatus>();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      statuses.set(doc.id, {
        role: data.role,
        status: data.status,
        lastSeen: data.lastSeen
      });
    });
    
    return statuses;
  }

  async updateHeartbeat(meshId: string, heartbeat: Heartbeat): Promise<void> {
    const heartbeatRef = doc(collection(this.db, 'meshes', meshId, 'heartbeats'), heartbeat.agentId);
    await setDoc(heartbeatRef, {
      ...heartbeat,
      timestamp: Date.now()
    });
  }

  async getHeartbeats(meshId: string): Promise<Map<string, Heartbeat>> {
    const heartbeatsRef = collection(this.db, 'meshes', meshId, 'heartbeats');
    const snapshot = await getDocs(heartbeatsRef);
    const heartbeats = new Map<string, Heartbeat>();
    
    snapshot.forEach((doc) => {
      heartbeats.set(doc.id, doc.data() as Heartbeat);
    });
    
    return heartbeats;
  }

  async sendElectionMessage(meshId: string, message: ElectionMessage): Promise<void> {
    const electionRef = doc(collection(this.db, 'meshes', meshId, 'elections'), message.candidateId);
    await setDoc(electionRef, {
      ...message,
      timestamp: Date.now()
    });
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for regular Firebase SDK
  }
} 