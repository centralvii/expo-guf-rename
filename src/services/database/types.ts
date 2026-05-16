import type {
  TaskHistoryEntry,
  TaskHistoryEntryMetadata,
  TaskPriority,
  TaskStatus,
  TaskTag,
  TaskSection,
} from '../../types';

export interface TaskInsert {
  id: string;
  title: string;
  description: string;
  sections: TaskSection[];
  priority: TaskPriority;
  status: TaskStatus;
  tags: TaskTag[];
  historyMetadata?: TaskHistoryEntryMetadata;
}

export type TaskUpdate = Partial<
  Pick<TaskInsert, 'title' | 'description' | 'sections' | 'priority' | 'status' | 'tags'>
>;

export interface TaskItemDb {
  id: string;
  title: string;
  description: string;
  sections: TaskSection[];
  priority: TaskPriority;
  status: TaskStatus;
  tags: TaskTag[];
  createdAt: number;
  updatedAt: number;
}

export interface TaskRepositoryAdapter {
  listTasks(): Promise<TaskItemDb[]>;
  getTaskById(taskId: string): Promise<TaskItemDb | null>;
  createTask(task: TaskInsert): Promise<TaskItemDb>;
  updateTaskById(taskId: string, updates: TaskUpdate): Promise<TaskItemDb>;
  deleteTaskById(taskId: string): Promise<void>;
  listTaskHistory(taskId: string): Promise<TaskHistoryEntry[]>;
  createTaskHistoryEntry(entry: TaskHistoryEntry): Promise<TaskHistoryEntry>;
  checkConnection(): Promise<boolean>;
}
