import { getFirestoreInstance } from './firebaseConfig.js';
import { collection, doc, setDoc, addDoc, onSnapshot, serverTimestamp, Firestore, Transaction, runTransaction } from 'firebase/firestore';
import { AgentRole, MemoryScope } from './types.js';
import { validateRole, validateAgentConfig, validateMemoryScope, ValidationError } from './validation.js';

export class FirestoreClient {
    private db: Firestore;

    constructor() {
        this.db = getFirestoreInstance();
    }

    static async registerAgent(agentId: string, meshId: string, role: string) {
      const db = getFirestoreInstance();
      
      try {
        // Validate inputs
        const validatedConfig = validateAgentConfig({ agentId, meshId, role });
        const validatedRole = validatedConfig.role;
        
        const meshRef = doc(db, 'meshes', meshId);
        const agentRef = doc(db, 'meshes', meshId, 'agents', agentId);

        await runTransaction(db, async (transaction) => {
          // Check if mesh exists
          const meshDoc = await transaction.get(meshRef);
          
          if (!meshDoc.exists()) {
            // Create new mesh
            transaction.set(meshRef, {
              leaders: [agentId],
              primaryLeader: validatedRole === 'leader' ? agentId : null,
              status: 'active',
              createdAt: serverTimestamp()
            });
          } else {
            // Update existing mesh
            const meshData = meshDoc.data();
            const leaders = meshData?.leaders || [];
            if (!leaders.includes(agentId)) {
              leaders.push(agentId);
            }
            transaction.update(meshRef, {
              leaders,
              primaryLeader: validatedRole === 'leader' ? agentId : meshData?.primaryLeader,
              updatedAt: serverTimestamp()
            });
          }

          // Create or update agent
          transaction.set(agentRef, {
            role: validatedRole,
            status: 'healthy',
            heartbeat: serverTimestamp(),
            memory: {
              private: {},
              internal: {},
              public: {}
            }
          });
        });

        console.log(`Successfully registered agent ${agentId} in mesh ${meshId}`);
      } catch (error) {
        if (error instanceof ValidationError) {
          console.error('Validation error:', error.message);
        } else {
          console.error('Error in registerAgent:', error);
          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              name: error.name,
              stack: error.stack
            });
          }
        }
        throw error;
      }
    }
  
    static async emitEvent(meshId: string, event: {
      from: string;
      type: 'action' | 'state_update';
      payload: any;
      permission: {
        scope: string;
      };
    }) {
      const db = getFirestoreInstance();
      
      try {
        // Validate inputs
        if (!meshId || !event.from || !event.type || !event.payload || !event.permission) {
          throw new ValidationError('Missing required parameters for event');
        }

        const validatedScope = validateMemoryScope(event.permission.scope);

        const eventsRef = collection(db, 'meshes', meshId, 'events');
        
        const eventData = {
          from: event.from,
          type: event.type,
          payload: event.payload,
          permission: {
            scope: validatedScope
          },
          timestamp: serverTimestamp()
        };

        console.log('Emitting event with data:', JSON.stringify(eventData, null, 2));
        console.log('Events collection path:', eventsRef.path);

        await addDoc(eventsRef, eventData);
        console.log('Successfully emitted event');
      } catch (error) {
        if (error instanceof ValidationError) {
          console.error('Validation error:', error.message);
        } else {
          console.error('Error in emitEvent:', error);
          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              name: error.name,
              stack: error.stack
            });
          }
        }
        throw error;
      }
    }

    static subscribeToEvents(meshId: string, callback: (event: any) => void) {
      const db = getFirestoreInstance();
      const eventsRef = collection(db, 'meshes', meshId, 'events');
      
      console.log('Subscribing to events in mesh:', meshId);
      console.log('Events collection path:', eventsRef.path);

      return onSnapshot(eventsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const event = change.doc.data();
            console.log('Received event:', event);
            callback(event);
          }
        });
      }, (error) => {
        console.error('Error in event subscription:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
        }
      });
    }

    async registerAgent(config: { meshId: string; agentId: string; role: AgentRole }) {
      try {
        const validatedConfig = validateAgentConfig(config);
        console.log('Creating mesh and agent with config:', validatedConfig);

        const meshRef = doc(this.db, 'meshes', validatedConfig.meshId);
        const agentRef = doc(this.db, 'meshes', validatedConfig.meshId, 'agents', validatedConfig.agentId);

        await runTransaction(this.db, async (transaction: Transaction) => {
          const meshDoc = await transaction.get(meshRef);
          if (!meshDoc.exists) {
            transaction.set(meshRef, {
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }

          transaction.set(agentRef, {
            role: validatedConfig.role,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });

        console.log('Successfully created mesh and agent');
        return { meshId: validatedConfig.meshId, agentId: validatedConfig.agentId };
      } catch (error) {
        if (error instanceof ValidationError) {
          console.error('Validation error:', error.message);
          throw error;
        }
        console.error('Error creating mesh and agent:', error);
        throw error;
      }
    }

    async emitEvent(event: {
      meshId: string;
      agentId: string;
      type: string;
      data: any;
      scope: string;
    }) {
      try {
        if (!event.meshId) {
          throw new ValidationError('meshId is required');
        }
        if (!event.agentId) {
          throw new ValidationError('agentId is required');
        }
        if (!event.type) {
          throw new ValidationError('type is required');
        }
        if (!event.scope) {
          throw new ValidationError('scope is required');
        }

        const validatedScope = validateMemoryScope(event.scope);
        console.log('Emitting event with scope:', validatedScope);

        const meshDocRef = doc(this.db, 'meshes', event.meshId);
        const eventsCollRef = collection(meshDocRef, 'events');
        const eventRef = doc(eventsCollRef);

        await setDoc(eventRef, {
          type: event.type,
          data: event.data,
          scope: validatedScope,
          agentId: event.agentId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        console.log('Successfully emitted event');
        return eventRef.id;
      } catch (error) {
        if (error instanceof ValidationError) {
          console.error('Validation error:', error.message);
          throw error;
        }
        console.error('Error emitting event:', error);
        throw error;
      }
    }
} 