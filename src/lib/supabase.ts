import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadSettings } from './appSettings';

let supabaseClient: SupabaseClient | null = null;

export function resetSupabaseClient() {
  supabaseClient = null;
}

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const settings = loadSettings();
  const supabaseUrl = settings.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = settings.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase configuration is missing. Please check your Settings.'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}
