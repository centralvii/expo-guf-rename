import type { TaskHistoryEntry, TaskItem } from '../types';
import { getTaskRepositoryAdapterForProvider } from '../services/database';

export type MigrationProvider = 'supabase' | 'firebase' | 'postgres';

export type MigrationEntityType = 'tasks' | 'taskHistory';

export type MigrationConflictStrategy = 'skip_existing' | 'overwrite';

export interface MigrationPlan {
  id: string;
  source: MigrationProvider;
  target: MigrationProvider;
  entities: MigrationEntityPlan[];
  conflictStrategy: MigrationConflictStrategy;
  createdAt: number;
}

export interface MigrationEntityPlan {
  type: MigrationEntityType;
  sourceCount: number;
  targetCount: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  conflicts: MigrationConflict[];
}

export interface MigrationConflict {
  entityType: MigrationEntityType;
  entityId: string;
  reason: 'exists_newer' | 'exists_different' | 'invalid_data';
  message: string;
}

export interface MigrationProgress {
  state: 'idle' | 'checking' | 'ready' | 'running' | 'done' | 'failed';
  currentEntity?: MigrationEntityType;
  total: number;
  completed: number;
  errors: MigrationError[];
}

export interface MigrationError {
  entityType: MigrationEntityType;
  entityId?: string;
  message: string;
}

function compareTasks(source: TaskItem, target: TaskItem): 'same' | 'newer-target' | 'different' {
  if (JSON.stringify(source) === JSON.stringify(target)) {
    return 'same';
  }

  if (target.updatedAt > source.updatedAt) {
    return 'newer-target';
  }

  return 'different';
}

function compareHistoryEntries(source: TaskHistoryEntry, target: TaskHistoryEntry): 'same' | 'newer-target' | 'different' {
  if (JSON.stringify(source) === JSON.stringify(target)) {
    return 'same';
  }

  if (target.createdAt > source.createdAt) {
    return 'newer-target';
  }

  return 'different';
}

function shouldIncludeEntity(
  selectedEntities: MigrationEntityType[] | undefined,
  entityType: MigrationEntityType
) {
  return selectedEntities?.includes(entityType) ?? true;
}

export async function buildMigrationPlan(input: {
  source: MigrationProvider;
  target: MigrationProvider;
  conflictStrategy: MigrationConflictStrategy;
  entities?: MigrationEntityType[];
}): Promise<MigrationPlan> {
  if (input.source === input.target) {
    throw new Error('Source и target provider должны отличаться.');
  }

  const sourceAdapter = getTaskRepositoryAdapterForProvider(input.source);
  const targetAdapter = getTaskRepositoryAdapterForProvider(input.target);

  const [sourceTasks, targetTasks] = await Promise.all([
    sourceAdapter.listTasks(),
    targetAdapter.listTasks(),
  ]);

  const targetTasksMap = new Map(targetTasks.map((task) => [task.id, task]));

  let tasksToCreate = 0;
  let tasksToUpdate = 0;
  let tasksToSkip = 0;
  const taskConflicts: MigrationConflict[] = [];

  if (shouldIncludeEntity(input.entities, 'tasks')) {
    sourceTasks.forEach((task) => {
      const targetTask = targetTasksMap.get(task.id);

      if (!targetTask) {
        tasksToCreate += 1;
        return;
      }

      const comparison = compareTasks(task, targetTask);

      if (comparison === 'same') {
        tasksToSkip += 1;
        return;
      }

      if (comparison === 'newer-target') {
        tasksToSkip += 1;
        taskConflicts.push({
          entityType: 'tasks',
          entityId: task.id,
          reason: 'exists_newer',
          message: 'В target уже есть более новая версия задачи.',
        });
        return;
      }

      if (input.conflictStrategy === 'overwrite') {
        tasksToUpdate += 1;
      } else {
        tasksToSkip += 1;
        taskConflicts.push({
          entityType: 'tasks',
          entityId: task.id,
          reason: 'exists_different',
          message: 'Задача уже существует в target и отличается по содержимому.',
        });
      }
    });
  }

  let sourceHistoryEntries: TaskHistoryEntry[] = [];
  let targetHistoryEntries: TaskHistoryEntry[] = [];
  let historyToCreate = 0;
  let historyToUpdate = 0;
  let historyToSkip = 0;
  const historyConflicts: MigrationConflict[] = [];

  if (shouldIncludeEntity(input.entities, 'taskHistory')) {
    try {
      sourceHistoryEntries = (
        await Promise.all(sourceTasks.map((task) => sourceAdapter.listTaskHistory(task.id)))
      ).flat();
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (msg.includes('404') || msg.includes('not found') || msg.includes('does not exist') || msg.includes('relation')) {
        throw new Error(
          'Таблица task_helper_history не найдена в Supabase. ' +
          'Выполните скрипт supabase/migrations/20260514_task_helper_history.sql в Supabase SQL Editor.'
        );
      }
      throw error;
    }
    try {
      targetHistoryEntries = (
        await Promise.all(targetTasks.map((task) => targetAdapter.listTaskHistory(task.id)))
      ).flat();
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (msg.includes('404') || msg.includes('not found') || msg.includes('does not exist') || msg.includes('relation')) {
        throw new Error(
          'Таблица task_helper_history не найдена в target. ' +
          'Выполните скрипт supabase/migrations/20260514_task_helper_history.sql в Supabase SQL Editor.'
        );
      }
      throw error;
    }

    const targetHistoryMap = new Map(targetHistoryEntries.map((entry) => [entry.id, entry]));

    sourceHistoryEntries.forEach((entry) => {
      const targetEntry = targetHistoryMap.get(entry.id);

      if (!targetEntry) {
        historyToCreate += 1;
        return;
      }

      const comparison = compareHistoryEntries(entry, targetEntry);

      if (comparison === 'same') {
        historyToSkip += 1;
        return;
      }

      if (comparison === 'newer-target') {
        historyToSkip += 1;
        historyConflicts.push({
          entityType: 'taskHistory',
          entityId: entry.id,
          reason: 'exists_newer',
          message: 'В target уже есть более новая запись истории.',
        });
        return;
      }

      if (input.conflictStrategy === 'overwrite') {
        historyToUpdate += 1;
      } else {
        historyToSkip += 1;
        historyConflicts.push({
          entityType: 'taskHistory',
          entityId: entry.id,
          reason: 'exists_different',
          message: 'Запись истории уже существует в target и отличается.',
        });
      }
    });
  }

  return {
    id: crypto.randomUUID(),
    source: input.source,
    target: input.target,
    conflictStrategy: input.conflictStrategy,
    createdAt: Date.now(),
    entities: [
      shouldIncludeEntity(input.entities, 'tasks')
        ? {
            type: 'tasks' as const,
            sourceCount: sourceTasks.length,
            targetCount: targetTasks.length,
            toCreate: tasksToCreate,
            toUpdate: tasksToUpdate,
            toSkip: tasksToSkip,
            conflicts: taskConflicts,
          }
        : null,
      shouldIncludeEntity(input.entities, 'taskHistory')
        ? {
            type: 'taskHistory' as const,
            sourceCount: sourceHistoryEntries.length,
            targetCount: targetHistoryEntries.length,
            toCreate: historyToCreate,
            toUpdate: historyToUpdate,
            toSkip: historyToSkip,
            conflicts: historyConflicts,
          }
        : null,
    ].filter((entity): entity is MigrationEntityPlan => entity !== null),
  };
}

export async function runMigrationPlan(input: {
  plan: MigrationPlan;
  onProgress?: (progress: MigrationProgress) => void;
}): Promise<MigrationProgress> {
  const sourceAdapter = getTaskRepositoryAdapterForProvider(input.plan.source);
  const targetAdapter = getTaskRepositoryAdapterForProvider(input.plan.target);

  const progress: MigrationProgress = {
    state: 'running',
    total: input.plan.entities.reduce((sum, entity) => sum + entity.toCreate + entity.toUpdate, 0),
    completed: 0,
    errors: [],
  };

  input.onProgress?.(progress);

  try {
    const shouldRunTasks = input.plan.entities.some((entity) => entity.type === 'tasks');
    const shouldRunHistory = input.plan.entities.some((entity) => entity.type === 'taskHistory');

    let sourceTasks: TaskItem[] = [];
    let targetTasks: TaskItem[] = [];

    if (shouldRunTasks || shouldRunHistory) {
      [sourceTasks, targetTasks] = await Promise.all([
        sourceAdapter.listTasks(),
        targetAdapter.listTasks(),
      ]);
    }

    if (shouldRunTasks) {
      const targetTaskMap = new Map(targetTasks.map((task) => [task.id, task]));
      progress.currentEntity = 'tasks';
      input.onProgress?.({ ...progress });

      for (const task of sourceTasks) {
        const targetTask = targetTaskMap.get(task.id);
        const comparison = targetTask ? compareTasks(task, targetTask) : null;

        if (!targetTask) {
          await targetAdapter.createTask({
            id: task.id,
            title: task.title,
            description: task.description,
            sections: task.sections,
            priority: task.priority,
            status: task.status,
            tags: task.tags,
          });
          progress.completed += 1;
          input.onProgress?.({ ...progress });
          continue;
        }

        if (input.plan.conflictStrategy === 'overwrite' && comparison === 'different') {
          await targetAdapter.updateTaskById(task.id, {
            title: task.title,
            description: task.description,
            sections: task.sections,
            priority: task.priority,
            status: task.status,
            tags: task.tags,
          });
          progress.completed += 1;
          input.onProgress?.({ ...progress });
        }
      }
    }

    if (shouldRunHistory) {
      const sourceHistoryEntries = (
        await Promise.all(sourceTasks.map((task) => sourceAdapter.listTaskHistory(task.id)))
      ).flat();
      const targetHistoryEntries = (
        await Promise.all(targetTasks.map((task) => targetAdapter.listTaskHistory(task.id)))
      ).flat();
      const targetHistoryMap = new Map(targetHistoryEntries.map((entry) => [entry.id, entry]));

      progress.currentEntity = 'taskHistory';
      input.onProgress?.({ ...progress });

      for (const entry of sourceHistoryEntries) {
        const targetEntry = targetHistoryMap.get(entry.id);
        const comparison = targetEntry ? compareHistoryEntries(entry, targetEntry) : null;

        if (!targetEntry) {
          await targetAdapter.createTaskHistoryEntry(entry);
          progress.completed += 1;
          input.onProgress?.({ ...progress });
          continue;
        }

        if (input.plan.conflictStrategy === 'overwrite' && comparison === 'different') {
          progress.errors.push({
            entityType: 'taskHistory',
            entityId: entry.id,
            message: 'Overwrite для task history пока не поддержан текущим adapter-layer без upsert/delete semantics.',
          });
          input.onProgress?.({ ...progress });
        }
      }
    }

    progress.state = 'done';
    progress.currentEntity = undefined;
    input.onProgress?.({ ...progress });
    return progress;
  } catch (error) {
    progress.state = 'failed';
    progress.errors.push({
      entityType: progress.currentEntity ?? 'tasks',
      message: error instanceof Error ? error.message : String(error),
    });
    input.onProgress?.({ ...progress });
    return progress;
  }
}
