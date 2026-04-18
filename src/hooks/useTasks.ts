import { useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';
import type { TaskItem } from '../types';

const TASKS_STORAGE_KEY = 'gd_helper_tasks';

export function useTasks() {
  const [tasks, setTasksState] = useState<TaskItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    get<TaskItem[]>(TASKS_STORAGE_KEY).then((data) => {
      if (data) {
        setTasksState(data);
      }
      setIsLoaded(true);
    });
  }, []);

  const saveTasks = useCallback(async (newTasks: TaskItem[]) => {
    setTasksState(newTasks);
    await set(TASKS_STORAGE_KEY, newTasks);
  }, []);

  const addTask = useCallback(async (title: string, description: string) => {
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: [
        {
          id: crypto.randomUUID(),
          title: 'Описание',
          content: '',
        },
      ],
    };
    await saveTasks([...tasks, newTask]);
    return newTask;
  }, [tasks, saveTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<TaskItem, 'id'>>) => {
    const newTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
    );
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    const newTasks = tasks.filter((t) => t.id !== taskId);
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const getTask = useCallback((taskId: string) => {
    return tasks.find(t => t.id === taskId);
  }, [tasks]);

  return { tasks, isLoaded, addTask, updateTask, deleteTask, getTask };
}
