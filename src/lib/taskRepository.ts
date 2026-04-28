import { getSupabaseClient } from './supabase';
import type { TaskItem, TaskSection, ConnectionMethod } from '../types';

type TaskRow = {
  id: string;
  title: string;
  description: string;
  sections: TaskSection[];
  created_at: string;
  updated_at: string;
};

type TaskInsert = {
  id: string;
  title: string;
  description: string;
  sections: TaskSection[];
};

type TaskUpdate = Partial<Pick<TaskItem, 'title' | 'description' | 'sections'>>;

const TASKS_TABLE = 'task_helper_tasks';

function mapTaskRow(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sections: Array.isArray(row.sections) ? row.sections : [],
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

function getSettings() {
  const saved = localStorage.getItem('gd-helper-settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Интерфейс репозитория для работы с задачами
 */
interface TaskRepository {
  listTasks(): Promise<TaskItem[]>;
  createTask(task: TaskInsert): Promise<TaskItem>;
  updateTaskById(taskId: string, updates: TaskUpdate): Promise<TaskItem>;
  deleteTaskById(taskId: string): Promise<void>;
  checkConnection(): Promise<boolean>;
}

/**
 * Реализация для Supabase
 */
const SupabaseRepo: TaskRepository = {
  async checkConnection() {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from(TASKS_TABLE).select('id').limit(1);
      return !error;
    } catch (e) {
      return false;
    }
  },

  async listTasks() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(TASKS_TABLE)
      .select('id, title, description, sections, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => mapTaskRow(row as TaskRow));
  },

  async createTask(task) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(TASKS_TABLE)
      .insert({
        id: task.id,
        title: task.title,
        description: task.description,
        sections: task.sections,
      })
      .select('id, title, description, sections, created_at, updated_at')
      .single();

    if (error) throw error;
    return mapTaskRow(data as TaskRow);
  },

  async updateTaskById(taskId, updates) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(TASKS_TABLE)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('id, title, description, sections, created_at, updated_at')
      .single();

    if (error) throw error;
    return mapTaskRow(data as TaskRow);
  },

  async deleteTaskById(taskId) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', taskId);
    if (error) throw error;
  }
};

/**
 * Реализация для Локального PostgreSQL (через API/Прокси)
 */
const PostgresRepo: TaskRepository = {
  async checkConnection() {
    try {
      const settings = getSettings();
      const response = await fetch(`${settings.postgresUrl}/tasks`, { method: 'HEAD' });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async listTasks() {
    const settings = getSettings();
    const response = await fetch(`${settings.postgresUrl}/tasks`);
    if (!response.ok) throw new Error('Failed to fetch tasks from local Postgres');
    const data = await response.json();
    return data;
  },

  async createTask(task) {
    const settings = getSettings();
    const response = await fetch(`${settings.postgresUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error('Failed to create task in local Postgres');
    return await response.json();
  },

  async updateTaskById(taskId, updates) {
    const settings = getSettings();
    const response = await fetch(`${settings.postgresUrl}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update task in local Postgres');
    return await response.json();
  },

  async deleteTaskById(taskId) {
    const settings = getSettings();
    const response = await fetch(`${settings.postgresUrl}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete task in local Postgres');
  }
};

/**
 * Выбирает текущий репозиторий на основе настроек
 */
function getRepo(): TaskRepository {
  const settings = getSettings();
  const method: ConnectionMethod = settings?.connectionMethod || 'supabase';
  return method === 'supabase' ? SupabaseRepo : PostgresRepo;
}

// Публичные функции делегируют выполнение выбранному репозиторию
export async function listTasks() {
  return getRepo().listTasks();
}

export async function createTask(task: TaskInsert) {
  return getRepo().createTask(task);
}

export async function updateTaskById(taskId: string, updates: TaskUpdate) {
  return getRepo().updateTaskById(taskId, updates);
}

export async function deleteTaskById(taskId: string) {
  return getRepo().deleteTaskById(taskId);
}

export async function checkConnection() {
  return getRepo().checkConnection();
}
