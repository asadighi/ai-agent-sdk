import { FirebaseOptions } from 'firebase/app';

export interface IFirebaseConfig extends FirebaseOptions {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
} 