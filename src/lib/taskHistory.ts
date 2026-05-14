import type {
  TaskHistoryEntry,
  TaskHistoryEntryMetadata,
  TaskHistoryEntryType,
  TaskItem,
  TaskSection,
  TaskTag,
} from '../types';

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

function tagsEqual(left: TaskTag[], right: TaskTag[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sectionsEqual(left: TaskSection[], right: TaskSection[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneTaskSnapshot(task: TaskItem | null): TaskItem | null {
  if (!task) {
    return null;
  }

  return {
    ...task,
    tags: task.tags.map((tag) => ({ ...tag })),
    sections: task.sections.map((section) => ({ ...section })),
  };
}

export function summarizeTaskChanges(before: TaskItem | null, after: TaskItem | null): string {
  if (!before && after) {
    return 'Создана задача';
  }

  if (before && !after) {
    return 'Удалена задача';
  }

  if (!before || !after) {
    return 'Изменения задачи';
  }

  const changed: string[] = [];

  if (normalizeText(before.title) !== normalizeText(after.title)) changed.push('название');
  if (normalizeText(before.description) !== normalizeText(after.description)) changed.push('описание');
  if (before.status !== after.status) changed.push('статус');
  if (before.priority !== after.priority) changed.push('приоритет');
  if (!tagsEqual(before.tags, after.tags)) changed.push('теги');
  if (!sectionsEqual(before.sections, after.sections)) changed.push('разделы');

  if (changed.length === 0) {
    return 'Изменений нет';
  }

  return `Изменены: ${changed.join(', ')}`;
}

export function createCreationSummary(metadata?: TaskHistoryEntryMetadata): string {
  if (metadata?.templateName) {
    return `Создана из шаблона «${metadata.templateName}»`;
  }

  return 'Создана задача';
}

export function buildTaskHistoryEntry(input: {
  taskId: string;
  type: TaskHistoryEntryType;
  before: TaskItem | null;
  after: TaskItem | null;
  summary?: string;
  metadata?: TaskHistoryEntryMetadata;
}): TaskHistoryEntry {
  return {
    id: crypto.randomUUID(),
    taskId: input.taskId,
    createdAt: Date.now(),
    type: input.type,
    before: cloneTaskSnapshot(input.before),
    after: cloneTaskSnapshot(input.after),
    summary: input.summary,
    metadata: input.metadata,
  };
}

export function cloneTaskHistoryEntry(entry: TaskHistoryEntry): TaskHistoryEntry {
  return {
    ...entry,
    before: cloneTaskSnapshot(entry.before),
    after: cloneTaskSnapshot(entry.after),
    metadata: entry.metadata ? { ...entry.metadata } : undefined,
  };
}
