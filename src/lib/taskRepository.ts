import { getSupabaseClient } from './supabase';
import type { TaskItem, TaskSection } from '../types';

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

export async function listTasks(): Promise<TaskItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .select('id, title, description, sections, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTaskRow(row as TaskRow));
}

export async function createTask(task: TaskInsert): Promise<TaskItem> {
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

  if (error) {
    throw error;
  }

  return mapTaskRow(data as TaskRow);
}

export async function updateTaskById(taskId: string, updates: TaskUpdate): Promise<TaskItem> {
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

  if (error) {
    throw error;
  }

  return mapTaskRow(data as TaskRow);
}

export async function deleteTaskById(taskId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', taskId);

  if (error) {
    throw error;
  }
}
