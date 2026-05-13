import type {
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
  createTask(task: TaskInsert): Promise<TaskItemDb>;
  updateTaskById(taskId: string, updates: TaskUpdate): Promise<TaskItemDb>;
  deleteTaskById(taskId: string): Promise<void>;
  checkConnection(): Promise<boolean>;
}
