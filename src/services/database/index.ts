import { loadSettings } from '../../lib/appSettings';
import { SupabaseTaskAdapter } from './supabaseAdapter';
import { PostgresTaskAdapter, NeonTaskAdapter } from './postgresAdapter';
import { FirebaseTaskAdapter } from './firebaseAdapter';
import type { TaskRepositoryAdapter } from './types';

export type { TaskRepositoryAdapter, TaskInsert, TaskUpdate, TaskItemDb } from './types';

const adapters: Record<string, TaskRepositoryAdapter> = {
  supabase: SupabaseTaskAdapter,
  postgres: PostgresTaskAdapter,
  neon: NeonTaskAdapter,
  firebase: FirebaseTaskAdapter,
};

export function getTaskRepositoryAdapter(): TaskRepositoryAdapter {
  const settings = loadSettings();
  const method = settings.connectionMethod || 'supabase';
  
  const adapter = adapters[method];
  if (!adapter) {
    throw new Error(`Unknown connection method: ${method}`);
  }
  
  return adapter;
}

export { SupabaseTaskAdapter, PostgresTaskAdapter, NeonTaskAdapter, FirebaseTaskAdapter };
