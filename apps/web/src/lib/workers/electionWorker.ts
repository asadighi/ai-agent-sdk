import { ElectionMessage } from '@ai-agent/core-sdk';
import { QueryDocumentSnapshot } from 'firebase/firestore';

interface WorkerMessage {
    meshId: string;
    snapshot: QueryDocumentSnapshot[];
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { meshId, snapshot } = e.data;
    const messages = new Map<string, ElectionMessage>();

    snapshot.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        let message: ElectionMessage;
        
        switch (data.type) {
            case 'request_vote':
                message = {
                    type: 'request_vote',
                    term: data.term || 0,
                    candidateId: data.candidateId,
                    lastLogIndex: data.lastLogIndex || 0,
                    lastLogTerm: data.lastLogTerm || 0,
                    timestamp: data.timestamp?.toDate() || new Date()
                };
                break;
            case 'vote':
                message = {
                    type: 'vote',
                    term: data.term || 0,
                    candidateId: data.candidateId,
                    voterId: data.voterId,
                    granted: data.granted,
                    timestamp: data.timestamp?.toDate() || new Date()
                };
                break;
            case 'initial_leader':
                message = {
                    type: 'initial_leader',
                    term: data.term || 0,
                    leaderId: data.leaderId,
                    timestamp: data.timestamp?.toDate() || new Date()
                };
                break;
            default:
                return;
        }
        messages.set(doc.id, message);
    });

    self.postMessage({ meshId, messages });
}; 