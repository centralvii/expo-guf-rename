import { loadSettings } from '../../lib/appSettings';
import type { ConnectionMethod } from '../../types';
import { SupabaseTaskAdapter } from './supabaseAdapter';
import { PostgresTaskAdapter } from './postgresAdapter';
import { FirebaseTaskAdapter } from './firebaseAdapter';
import type { TaskRepositoryAdapter } from './types';

export type { TaskRepositoryAdapter, TaskInsert, TaskUpdate, TaskItemDb } from './types';

const adapters: Record<ConnectionMethod, TaskRepositoryAdapter> = {
  supabase: SupabaseTaskAdapter,
  postgres: PostgresTaskAdapter,
  firebase: FirebaseTaskAdapter,
};

export function getTaskRepositoryAdapterForProvider(provider: ConnectionMethod): TaskRepositoryAdapter {
  return adapters[provider];
}

export function getTaskRepositoryAdapter(): TaskRepositoryAdapter {
  const settings = loadSettings();
  const method = settings.connectionMethod || 'supabase';
  
  const adapter = adapters[method];
  if (!adapter) {
    throw new Error(`Unknown connection method: ${method}`);
  }
  
  return adapter;
}

export { SupabaseTaskAdapter, PostgresTaskAdapter, FirebaseTaskAdapter };
