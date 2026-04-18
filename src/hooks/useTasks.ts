import { useState, useEffect, useCallback } from 'react';
import type { TaskItem } from '../types';
import { createTask, deleteTaskById, listTasks, updateTaskById } from '../lib/taskRepository';

export function useTasks() {
  const [tasks, setTasksState] = useState<TaskItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const data = await listTasks();
    return data;
  }, []);

  useEffect(() => {
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

        console.error('[tasks] Failed to load tasks from Supabase', err);
        setError('Не удалось загрузить задачи из Supabase.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadTasks = useCallback(async () => {
    try {
      const data = await loadTasks();
      setTasksState(data);
      setError(null);
    } catch (err) {
      console.error('[tasks] Failed to reload tasks from Supabase', err);
      setError('Не удалось загрузить задачи из Supabase.');
    } finally {
      setIsLoaded(true);
    }
  }, [loadTasks]);

  const addTask = useCallback(async (title: string, description: string) => {
    const createdTask = await createTask({
      id: crypto.randomUUID(),
      title,
      description,
      sections: [
        {
          id: crypto.randomUUID(),
          title: 'Описание',
          content: '',
        },
      ],
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
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await deleteTaskById(taskId);
    setTasksState((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    setError(null);
  }, []);

  const getTask = useCallback((taskId: string) => {
    return tasks.find((task) => task.id === taskId);
  }, [tasks]);

  return { tasks, isLoaded, error, addTask, updateTask, deleteTask, getTask, reloadTasks };
}
