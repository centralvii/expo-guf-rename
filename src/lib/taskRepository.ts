import { getTaskRepositoryAdapter } from '../services/database';
import type { TaskInsert, TaskUpdate } from '../services/database/types';
import type { TaskHistoryEntry, TaskHistoryEntryMetadata, TaskItem } from '../types';
import {
  buildTaskHistoryEntry,
  createCreationSummary,
  summarizeTaskChanges,
} from './taskHistory';

export type { TaskInsert, TaskUpdate } from '../services/database/types';

export async function listTasks() {
  return getTaskRepositoryAdapter().listTasks();
}

export async function createTask(task: TaskInsert) {
  const adapter = getTaskRepositoryAdapter();
  const createdTask = await adapter.createTask(task);

  try {
    await adapter.createTaskHistoryEntry(
      buildTaskHistoryEntry({
        taskId: createdTask.id,
        type: 'created',
        before: null,
        after: createdTask,
        summary: createCreationSummary(task.historyMetadata),
        metadata: task.historyMetadata,
      })
    );
  } catch (error) {
    console.warn('[task-history] Failed to record created entry', error);
  }

  return createdTask;
}

export async function updateTaskById(taskId: string, updates: TaskUpdate) {
  const adapter = getTaskRepositoryAdapter();
  const before = (await adapter.listTasks()).find((task) => task.id === taskId) ?? null;
  const updatedTask = await adapter.updateTaskById(taskId, updates);

  try {
    await adapter.createTaskHistoryEntry(
      buildTaskHistoryEntry({
        taskId,
        type: 'updated',
        before,
        after: updatedTask,
        summary: summarizeTaskChanges(before, updatedTask),
      })
    );
  } catch (error) {
    console.warn('[task-history] Failed to record updated entry', error);
  }

  return updatedTask;
}

export async function deleteTaskById(taskId: string) {
  return getTaskRepositoryAdapter().deleteTaskById(taskId);
}

export async function listTaskHistory(taskId: string) {
  return getTaskRepositoryAdapter().listTaskHistory(taskId);
}

export async function createTaskHistoryEntry(entry: TaskHistoryEntry) {
  return getTaskRepositoryAdapter().createTaskHistoryEntry(entry);
}

export async function restoreTaskVersion(
  taskId: string,
  restoredSnapshot: TaskItem,
  options?: {
    summary?: string;
    metadata?: TaskHistoryEntryMetadata;
  }
) {
  const adapter = getTaskRepositoryAdapter();
  const before = (await adapter.listTasks()).find((task) => task.id === taskId) ?? null;
  const restoredTask = await adapter.updateTaskById(taskId, {
    title: restoredSnapshot.title,
    description: restoredSnapshot.description,
    priority: restoredSnapshot.priority,
    status: restoredSnapshot.status,
    tags: restoredSnapshot.tags,
    sections: restoredSnapshot.sections,
  });

  try {
    await adapter.createTaskHistoryEntry(
      buildTaskHistoryEntry({
        taskId,
        type: 'restored',
        before,
        after: restoredTask,
        summary: options?.summary ?? 'Восстановлена версия задачи',
        metadata: options?.metadata,
      })
    );
  } catch (error) {
    console.warn('[task-history] Failed to record restored entry', error);
  }

  return restoredTask;
}

export async function checkConnection() {
  return getTaskRepositoryAdapter().checkConnection();
}
