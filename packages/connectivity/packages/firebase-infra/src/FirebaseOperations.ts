import { IDatabaseOperations, IDocumentReference, IDocumentSnapshot, IDatabaseError } from '@ai-agent/connectivity/types';
import { DocumentReference, DocumentSnapshot, FirestoreError, onSnapshot } from '@firebase/firestore';

export class FirebaseOperations implements IDatabaseOperations {
    private connectionStatusRef: DocumentReference;

    constructor(connectionStatusRef: DocumentReference) {
        this.connectionStatusRef = connectionStatusRef;
    }

    setupConnectionListener(
        onNext: (snapshot: IDocumentSnapshot) => void,
        onError: (error: IDatabaseError) => void
    ): () => void {
        return onSnapshot(
            this.connectionStatusRef,
            (snapshot: DocumentSnapshot) => {
                onNext(this.mapToIDocumentSnapshot(snapshot));
            },
            (error: FirestoreError) => {
                onError(this.mapToIDatabaseError(error));
            }
        );
    }

    getConnectionStatusRef(): IDocumentReference {
        return this.mapToIDocumentReference(this.connectionStatusRef);
    }

    private mapToIDocumentSnapshot(snapshot: DocumentSnapshot): IDocumentSnapshot {
        return {
            id: snapshot.id,
            exists: snapshot.exists(),
            data: () => snapshot.data() as Record<string, unknown> | undefined
        };
    }

    private mapToIDatabaseError(error: FirestoreError): IDatabaseError {
        return {
            code: error.code,
            message: error.message,
            stack: error.stack
        };
    }

    private mapToIDocumentReference(ref: DocumentReference): IDocumentReference {
        return {
            id: ref.id,
            path: ref.path
        };
    }
} 