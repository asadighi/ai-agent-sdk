import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root directory
const envPath = resolve(__dirname, '../.env');
console.log('CLI: Attempting to load environment variables from:', envPath);

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('CLI: .env file not found at:', envPath);
  console.error('CLI: Please ensure the .env file exists in the CLI app directory');
  process.exit(1);
}

const result = config({ path: envPath });
if (result.error) {
  console.error('CLI: Error loading .env file:', result.error);
  process.exit(1);
}

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('CLI: Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Debug log environment variables
console.log('CLI: Environment variables loaded:', {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY ? '***' : undefined,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID
});

// Export a function to ensure environment variables are loaded
export function ensureEnvLoaded() {
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
} 