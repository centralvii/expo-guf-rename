/**
 * Migration script: Supabase → Firebase
 * 
 * This script exports data from Supabase and imports it into Firebase Firestore.
 * 
 * Prerequisites:
 * 1. Install dependencies: npm install @supabase/supabase-js firebase
 * 2. Set environment variables in .env:
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_ANON_KEY
 *    - VITE_FIREBASE_API_KEY
 *    - VITE_FIREBASE_AUTH_DOMAIN
 *    - VITE_FIREBASE_PROJECT_ID
 *    - VITE_FIREBASE_STORAGE_BUCKET
 *    - VITE_FIREBASE_MESSAGING_SENDER_ID
 *    - VITE_FIREBASE_APP_ID
 * 
 * Usage:
 *   npx tsx scripts/migrate-supabase-to-firebase.ts [--dry-run]
 * 
 * Options:
 *   --dry-run  Export data without writing to Firebase
 */

import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import { loadEnv } from 'vite';

const env = {
  ...loadEnv('', process.cwd(), ''),
  ...process.env,
};

// Load environment variables
const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';
const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

const TASKS_TABLE = 'task_helper_tasks';
const TASKS_COLLECTION = 'tasks';
const BATCH_SIZE = 500; // Firestore batch write limit

interface TaskRow {
  id: string;
  title: string;
  description: string;
  sections: Array<{ id: string; title: string; content: string }>;
  priority: string;
  status: string;
  tags: Array<{ id: string; name: string; color: string }>;
  created_at: string;
  updated_at: string;
}

function transformTaskToFirestore(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sections: Array.isArray(row.sections) ? row.sections : [],
    priority: row.priority ?? 'medium',
    status: row.status ?? 'open',
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('=== Supabase → Firebase Migration ===\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE MIGRATION'}\n`);

  // Validate configuration
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('ERROR: Missing Supabase configuration');
    console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
    process.exit(1);
  }

  if (!isDryRun && (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId)) {
    console.error('ERROR: Missing Firebase configuration');
    console.error('Set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID environment variables');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch all tasks from Supabase
  console.log('Fetching tasks from Supabase...');
  const { data: tasks, error } = await supabase
    .from(TASKS_TABLE)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('ERROR: Failed to fetch tasks from Supabase');
    console.error(error);
    process.exit(1);
  }

  console.log(`Found ${tasks?.length ?? 0} tasks\n`);

  if (!tasks || tasks.length === 0) {
    console.log('No tasks to migrate. Exiting.');
    return;
  }

  // Transform data
  const firestoreTasks = tasks.map(transformTaskToFirestore);
  console.log('Sample transformed task:');
  console.log(JSON.stringify(firestoreTasks[0], null, 2));
  console.log('');

  if (isDryRun) {
    console.log('=== DRY RUN COMPLETE ===');
    console.log(`Would migrate ${firestoreTasks.length} tasks to Firestore`);
    console.log('\nTo perform actual migration, run without --dry-run flag');
    return;
  }

  // Initialize Firebase
  console.log('Initializing Firebase...');
  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);

  // Migrate in batches
  console.log('Starting migration to Firestore...');
  let migrated = 0;
  let batches = 0;

  for (let i = 0; i < firestoreTasks.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchTasks = firestoreTasks.slice(i, i + BATCH_SIZE);

    for (const task of batchTasks) {
      const docRef = doc(collection(db, TASKS_COLLECTION), task.id);
      batch.set(docRef, task);
    }

    await batch.commit();
    migrated += batchTasks.length;
    batches++;
    console.log(`  Batch ${batches}: Migrated ${migrated}/${firestoreTasks.length} tasks`);
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(`Successfully migrated ${migrated} tasks to Firestore`);
  console.log('\nIMPORTANT:');
  console.log('1. Verify data in Firebase Console');
  console.log('2. Update Firebase Security Rules');
  console.log('3. Do NOT delete Supabase data until verification is complete');
}

main().catch(console.error);
