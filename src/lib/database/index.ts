// Re-export from the new service layer
export {
  getTaskRepositoryAdapter,
  SupabaseTaskAdapter,
  PostgresTaskAdapter,
  NeonTaskAdapter,
  FirebaseTaskAdapter,
} from '../../services/database';

export type {
  TaskRepositoryAdapter,
  TaskInsert,
  TaskUpdate,
  TaskItemDb,
} from '../../services/database/types';
