import { useState, useEffect, useCallback } from 'react';
import type {
  TaskHistoryEntry,
  TaskHistoryEntryMetadata,
  TaskItem,
  TaskPriority,
  TaskSection,
  TaskStatus,
  TaskTag,
} from '../types';
import {
  createTask,
  createTaskHistoryEntry,
  deleteTaskById,
  listTaskHistory,
  listTasks,
  restoreTaskVersion,
  updateTaskById,
} from '../lib/taskRepository';

interface UseTasksOptions {
  autoLoad?: boolean;
}

interface AddTaskOptions {
  priority?: TaskPriority;
  status?: TaskStatus;
  tags?: TaskTag[];
  sections?: TaskSection[];
  historyMetadata?: TaskHistoryEntryMetadata;
}

export function useTasks({ autoLoad = true }: UseTasksOptions = {}) {
  const [tasks, setTasksState] = useState<TaskItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(() => !autoLoad);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const data = await listTasks();
    return data;
  }, []);

  useEffect(() => {
    if (!autoLoad) return;

    let isMounted = true;

    listTasks()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setTasksState(data);
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) {
          return;
        }

        console.error('[tasks] Failed to load tasks from database', err);
        setError('Не удалось загрузить задачи из базы данных.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [autoLoad]);

  const reloadTasks = useCallback(async () => {
    try {
      const data = await loadTasks();
      setTasksState(data);
      setError(null);
    } catch (err) {
      console.error('[tasks] Failed to reload tasks from database', err);
      setError('Не удалось загрузить задачи из базы данных.');
    } finally {
      setIsLoaded(true);
    }
  }, [loadTasks]);

  const addTask = useCallback(async (
    title: string,
    description: string,
    options?: AddTaskOptions
  ) => {
    const createdTask = await createTask({
      id: crypto.randomUUID(),
      title,
      description,
      priority: options?.priority ?? 'medium',
      status: options?.status ?? 'open',
      tags: options?.tags ?? [],
      sections: options?.sections ?? [
        {
          id: crypto.randomUUID(),
          title: 'Описание',
          content: '',
        },
      ],
      historyMetadata: options?.historyMetadata,
    });

    setTasksState((currentTasks) => [createdTask, ...currentTasks]);
    setError(null);
    return createdTask;
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<TaskItem, 'id'>>) => {
    const updatedTask = await updateTaskById(taskId, updates);
    setTasksState((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? updatedTask : task))
    );
    setError(null);
    return updatedTask;
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await deleteTaskById(taskId);
    setTasksState((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    setError(null);
  }, []);

  const getTask = useCallback((taskId: string) => {
    return tasks.find((task) => task.id === taskId);
  }, [tasks]);

  const getTaskHistory = useCallback(async (taskId: string) => {
    return listTaskHistory(taskId);
  }, []);

  const recordTaskHistory = useCallback(async (entry: TaskHistoryEntry) => {
    return createTaskHistoryEntry(entry);
  }, []);

  const restoreTask = useCallback(async (
    taskId: string,
    snapshot: TaskItem,
    options?: {
      summary?: string;
      metadata?: TaskHistoryEntryMetadata;
    }
  ) => {
    const restoredTask = await restoreTaskVersion(taskId, snapshot, options);
    setTasksState((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? restoredTask : task))
    );
    setError(null);
    return restoredTask;
  }, []);

  return {
    tasks,
    isLoaded,
    error,
    addTask,
    updateTask,
    deleteTask,
    getTask,
    reloadTasks,
    getTaskHistory,
    recordTaskHistory,
    restoreTask,
  };
}
