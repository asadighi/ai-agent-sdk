import { config } from 'dotenv';
import path from 'path';
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { FirebaseFirestoreClient } from '../fireStoreClient';
import dotenv from 'dotenv';

// Load environment variables from SDK package's .env file
const envPath = path.resolve(__dirname, '../../.env');
const result = config({ path: envPath });

if (result.error) {
  throw new Error(`Error loading .env file: ${result.error.message}`);
}

// Check if all required environment variables are present
const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Load environment variables
dotenv.config();

// Initialize Firebase
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize the app if it hasn't been initialized
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

// Initialize FirestoreClient
try {
  const client = FirebaseFirestoreClient.getInstance();
  console.log('Firebase configuration loaded successfully');
} catch (error) {
  throw new Error(`Error initializing Firebase: ${error instanceof Error ? error.message : String(error)}`);
} 