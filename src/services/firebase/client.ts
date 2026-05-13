import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { loadSettings } from '../../lib/appSettings';

let firebaseApp: FirebaseApp | null = null;
let firestore: Firestore | null = null;

export function resetFirebaseClient() {
  firebaseApp = null;
  firestore = null;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

function getFirebaseConfig(): FirebaseConfig {
  const settings = loadSettings();
  
  const config: FirebaseConfig = {
    apiKey: settings.firebaseApiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: settings.firebaseAuthDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: settings.firebaseProjectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: settings.firebaseStorageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: settings.firebaseMessagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: settings.firebaseAppId || import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: settings.firebaseMeasurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };

  return config;
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId && config.appId);
}

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  const config = getFirebaseConfig();

  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase configuration is missing. Please check your Settings.'
    );
  }

  firebaseApp = initializeApp(config);
  return firebaseApp;
}

export function getFirestoreDb(): Firestore {
  if (firestore) {
    return firestore;
  }

  const app = getFirebaseApp();
  firestore = getFirestore(app);
  return firestore;
}
