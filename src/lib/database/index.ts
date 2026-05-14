// Re-export from the new service layer
export {
  getTaskRepositoryAdapter,
  getTaskRepositoryAdapterForProvider,
  SupabaseTaskAdapter,
  PostgresTaskAdapter,
  FirebaseTaskAdapter,
} from '../../services/database';

export type {
  TaskRepositoryAdapter,
  TaskInsert,
  TaskUpdate,
  TaskItemDb,
} from '../../services/database/types';
