import { FirebaseFirestoreClient } from '../fireStoreClient';
import { getFirestore } from 'firebase/firestore';

describe('Firebase Configuration', () => {
  it('should initialize Firestore with valid configuration', async () => {
    // Increase timeout for Firebase initialization
    jest.setTimeout(10000);

    try {
      const client = FirebaseFirestoreClient.getInstance();
      const db = getFirestore(client['app']);
      expect(db).toBeDefined();
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  });
}); 