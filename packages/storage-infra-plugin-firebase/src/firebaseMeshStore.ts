import { initializeApp, getApps, getApp, FirebaseApp, deleteApp, FirebaseOptions } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
    collection,
    doc,
    setDoc,
    addDoc,
    onSnapshot,
    serverTimestamp,
    Firestore,
    Transaction,
    runTransaction,
    query,
    where,
    orderBy,
    limit,
    writeBatch,
    updateDoc,
    getDocs,
    DocumentReference,
    CollectionReference,
    getFirestore,
    WriteBatch,
    DocumentData,
    QueryDocumentSnapshot,
    getDoc,
    disableNetwork,
    enableNetwork,
    initializeFirestore,
    FirestoreSettings,
    persistentLocalCache,
    persistentMultipleTabManager,
    Timestamp
} from 'firebase/firestore';
import { AgentRole, MemoryScope, Heartbeat, ElectionMessage, PresenceStatus, AgentStatus, AgentConfig, Agent } from '@ai-agent/common-sdk';
import { validateRole, validateAgentConfig, validateMemoryScope, ValidationError } from '@ai-agent/common-sdk';
import { IMeshStore } from '@ai-agent/common-sdk';
import { IFirebaseConfig } from './firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Logger, LogLevel } from '@ai-agent/multi-logger';


export class FirebaseMeshStore implements IMeshStore {
    private static instance: FirebaseMeshStore | null = null;
    private app!: FirebaseApp;
    private db!: Firestore;
    private auth: Auth | null = null;
    private heartbeatSubscriptions: Map<string, () => void> = new Map();
    private electionSubscriptions: Map<string, () => void> = new Map();
    private heartbeats: Map<string, Map<string, Heartbeat>> = new Map();
    private elections: Map<string, Map<string, ElectionMessage>> = new Map();
    private agents: Map<string, Map<string, PresenceStatus>> = new Map();
    private rateLimiter: RateLimiter = new RateLimiter(60000, 60);
    private registeredAgents: Set<string> = new Set();
    private logger: Logger = new Logger({
        logLevel: LogLevel.INFO,
        logToConsole: true,
        maxLogs: 1000,
        rotationInterval: 60000
    });
    private isOffline: boolean = false;
    private lastCleanupTime: Map<string, number> = new Map();
    private currentAgentId: string = '';

    private constructor(config: IFirebaseConfig, agentId: string) {
        this.currentAgentId = agentId;
        this.initializeFirebase(config);
    }

    private initializeFirebase(config: IFirebaseConfig): void {
        // Initialize Firebase app
        if (getApps().length === 0) {
            this.app = initializeApp(config);
        } else {
            this.app = getApp();
        }
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
    }

    public static getInstance(config: IFirebaseConfig, agentId: string): FirebaseMeshStore {
        if (!FirebaseMeshStore.instance) {
            FirebaseMeshStore.instance = new FirebaseMeshStore(config, agentId);
        }
        return FirebaseMeshStore.instance;
    }

    // ... rest of the implementation ...
} 