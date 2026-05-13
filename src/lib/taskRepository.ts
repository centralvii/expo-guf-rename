import { getTaskRepositoryAdapter } from '../services/database';
import type { TaskInsert, TaskUpdate } from '../services/database/types';

export type { TaskInsert, TaskUpdate } from '../services/database/types';

export async function listTasks() {
  return getTaskRepositoryAdapter().listTasks();
}

export async function createTask(task: TaskInsert) {
  return getTaskRepositoryAdapter().createTask(task);
}

export async function updateTaskById(taskId: string, updates: TaskUpdate) {
  return getTaskRepositoryAdapter().updateTaskById(taskId, updates);
}

export async function deleteTaskById(taskId: string) {
  return getTaskRepositoryAdapter().deleteTaskById(taskId);
}

export async function checkConnection() {
  return getTaskRepositoryAdapter().checkConnection();
}
