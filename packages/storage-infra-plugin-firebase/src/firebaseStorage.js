import { collection, doc, setDoc, getDocs } from '@firebase/firestore';
export class FirebaseStorageClient {
    constructor(db) {
        this.db = db;
    }
    async registerAgent(params) {
        const agentRef = doc(collection(this.db, 'meshes', params.meshId, 'agents'), params.agentId);
        await setDoc(agentRef, {
            role: params.role,
            status: params.status,
            lastSeen: Date.now(),
            agentId: params.agentId
        });
    }
    async updateAgentStatus(meshId, agentId, status) {
        const agentRef = doc(collection(this.db, 'meshes', meshId, 'agents'), agentId);
        await setDoc(agentRef, { status, lastSeen: Date.now() }, { merge: true });
    }
    async getAgentStatuses(meshId) {
        const agentsRef = collection(this.db, 'meshes', meshId, 'agents');
        const snapshot = await getDocs(agentsRef);
        const statuses = new Map();
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
    async updateHeartbeat(meshId, heartbeat) {
        const heartbeatRef = doc(collection(this.db, 'meshes', meshId, 'heartbeats'), heartbeat.agentId);
        await setDoc(heartbeatRef, {
            ...heartbeat,
            timestamp: Date.now()
        });
    }
    async getHeartbeats(meshId) {
        const heartbeatsRef = collection(this.db, 'meshes', meshId, 'heartbeats');
        const snapshot = await getDocs(heartbeatsRef);
        const heartbeats = new Map();
        snapshot.forEach((doc) => {
            heartbeats.set(doc.id, doc.data());
        });
        return heartbeats;
    }
    async sendElectionMessage(meshId, message) {
        const electionRef = doc(collection(this.db, 'meshes', meshId, 'elections'), message.candidateId);
        await setDoc(electionRef, {
            ...message,
            timestamp: Date.now()
        });
    }
    async cleanup() {
        // No cleanup needed for regular Firebase SDK
    }
}
//# sourceMappingURL=firebaseStorage.js.map