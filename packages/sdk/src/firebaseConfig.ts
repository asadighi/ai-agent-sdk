import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

let db: ReturnType<typeof getFirestore> | null = null;

function getFirebaseConfig() {
  if (isBrowser) {
    // Browser environment - use Vite environment variables
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    // Debug log in browser environment
    console.log('SDK (Browser): Firebase config:', {
      ...config,
      apiKey: config.apiKey ? '***' : undefined
    });

    return config;
  } else {
    // Node.js environment - use process.env
    const config = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    };

    // Debug log in Node.js environment
    console.log('SDK (Node.js): Firebase config:', {
      ...config,
      apiKey: config.apiKey ? '***' : undefined
    });

    return config;
  }
}

export function getFirestoreInstance() {
  if (!db) {
    const firebaseConfig = getFirebaseConfig();
    
    // Validate required fields
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
    
    if (missingFields.length > 0) {
      const error = new Error(`Missing required Firebase configuration fields: ${missingFields.join(', ')}`);
      console.error('SDK: Firebase configuration error:', error);
      throw error;
    }

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
} 