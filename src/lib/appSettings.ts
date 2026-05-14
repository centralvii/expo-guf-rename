import type { AppSettings } from '../types';

export const SETTINGS_KEY = 'gd-helper-settings';
export const SETTINGS_EVENT = 'gd-helper-settings-change';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'default',
  connectionMethod: 'supabase',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  postgresUrl: import.meta.env.VITE_POSTGRES_PROXY_URL || 'http://localhost:5432',
  neonApiUrl: import.meta.env.VITE_NEON_PROXY_URL || 'http://localhost:3001/api/db',
  neonProjectName: import.meta.env.VITE_NEON_PROJECT_NAME || '',
  neonDatabaseName: import.meta.env.VITE_NEON_DATABASE_NAME || '',
  neonSslMode: 'require',
  // Firebase config (frontend-safe)
  firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  firebaseMeasurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export function loadSettings(): AppSettings {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) {
    return DEFAULT_SETTINGS;
  }

  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (error) {
    console.error('Failed to parse settings', error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent<AppSettings>(SETTINGS_EVENT, { detail: settings }));
}
