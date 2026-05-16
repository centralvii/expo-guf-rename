import { getSupabaseClient } from '../../lib/supabase';
import type { TaskHistoryEntry, TaskHistoryEntryMetadata } from '../../types';
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
const HISTORY_TABLE = 'task_helper_history';
let listTasksInFlight: Promise<TaskItemDb[]> | null = null;

type HistoryRow = {
  id: string;
  task_id: string;
  created_at: string;
  type: TaskHistoryEntry['type'];
  before: TaskRow | null;
  after: TaskRow | null;
  summary: string | null;
  metadata: TaskHistoryEntryMetadata | null;
};

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

function toTaskRowSnapshot(task: TaskItemDb | null) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    sections: task.sections,
    priority: task.priority,
    status: task.status,
    tags: task.tags,
    created_at: new Date(task.createdAt).toISOString(),
    updated_at: new Date(task.updatedAt).toISOString(),
  };
}

function mapHistoryRow(row: HistoryRow): TaskHistoryEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    createdAt: Date.parse(row.created_at),
    type: row.type,
    before: row.before ? mapTaskRow(row.before) : null,
    after: row.after ? mapTaskRow(row.after) : null,
    summary: row.summary ?? undefined,
    metadata: row.metadata ?? undefined,
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

  async getTaskById(taskId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(TASKS_TABLE)
      .select('id, title, description, sections, priority, status, tags, created_at, updated_at')
      .eq('id', taskId)
      .single();

    if (error) return null;
    return mapTaskRow(data as TaskRow);
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

  async listTaskHistory(taskId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(HISTORY_TABLE)
      .select('id, task_id, created_at, type, before, after, summary, metadata')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => mapHistoryRow(row as HistoryRow));
  },

  async createTaskHistoryEntry(entry) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(HISTORY_TABLE)
      .insert({
        id: entry.id,
        task_id: entry.taskId,
        created_at: new Date(entry.createdAt).toISOString(),
        type: entry.type,
        before: toTaskRowSnapshot(entry.before),
        after: toTaskRowSnapshot(entry.after),
        summary: entry.summary ?? null,
        metadata: entry.metadata ?? null,
      })
      .select('id, task_id, created_at, type, before, after, summary, metadata')
      .single();

    if (error) throw error;
    return mapHistoryRow(data as HistoryRow);
  },
};
