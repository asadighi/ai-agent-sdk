self.onmessage = (e) => {
    const { meshId, snapshot } = e.data;
    const messages = new Map();
    snapshot.forEach((doc) => {
        const data = doc.data();
        let message;
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
export {};
//# sourceMappingURL=electionWorker.js.map