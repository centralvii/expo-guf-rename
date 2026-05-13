import { getSupabaseClient } from '../../lib/supabase';
import type { TaskRepositoryAdapter, TaskItemDb } from './types';

type TaskRow = {
  id: string;
  title: string;
  description: string;
  sections: Array<{ id: string; title: string; content: string }>;
  priority: string;
  status: string;
  tags: Array<{ id: string; name: string; color: string }>;
  created_at: string;
  updated_at: string;
};

const TASKS_TABLE = 'task_helper_tasks';
let listTasksInFlight: Promise<TaskItemDb[]> | null = null;

function mapTaskRow(row: TaskRow): TaskItemDb {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sections: Array.isArray(row.sections) ? row.sections : [],
    priority: (row.priority as TaskItemDb['priority']) ?? 'medium',
    status: (row.status as TaskItemDb['status']) ?? 'open',
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

function isTransientNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|fetch failed|networkerror|load failed|http2|ping/i.test(message);
}

async function withTransientRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0 || !isTransientNetworkError(error)) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    return withTransientRetry(operation, retries - 1);
  }
}

export const SupabaseTaskAdapter: TaskRepositoryAdapter = {
  async checkConnection() {
    return withTransientRetry(async () => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from(TASKS_TABLE).select('id').limit(1);
      if (error) throw new Error(error.message);
      return true;
    });
  },

  async listTasks() {
    if (listTasksInFlight) {
      return listTasksInFlight;
    }

    listTasksInFlight = withTransientRetry(async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(TASKS_TABLE)
        .select('id, title, description, sections, priority, status, tags, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => mapTaskRow(row as TaskRow));
    });

    try {
      return await listTasksInFlight;
    } finally {
      listTasksInFlight = null;
    }
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
        priority: task.priority,
        status: task.status,
        tags: task.tags,
      })
      .select('id, title, description, sections, priority, status, tags, created_at, updated_at')
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
      .select('id, title, description, sections, priority, status, tags, created_at, updated_at')
      .single();

    if (error) throw error;
    return mapTaskRow(data as TaskRow);
  },

  async deleteTaskById(taskId) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', taskId);
    if (error) throw error;
  },
};
