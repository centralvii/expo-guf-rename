import type {
  TaskHistoryEntry,
  TaskHistoryEntryMetadata,
  TaskHistoryEntryType,
  TaskItem,
  TaskSection,
  TaskTag,
} from '../types';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '../types';

export interface TaskChangeSummary {
  title: string;
  details: string[];
  changedFields: Array<
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
    | 'tags'
    | 'sections'
    | 'created'
    | 'deleted'
  >;
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

function tagsEqual(left: TaskTag[], right: TaskTag[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sectionsEqual(left: TaskSection[], right: TaskSection[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function truncate(value: string, maxLength = 48): string {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
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
  return summarizeTaskChangesDetailed(before, after).title;
}

export function summarizeTaskChangesDetailed(before: TaskItem | null, after: TaskItem | null): TaskChangeSummary {
  if (!before && after) {
    return {
      title: 'Создана задача',
      details: [
        `Статус: ${TASK_STATUS_LABELS[after.status]}`,
        `Приоритет: ${TASK_PRIORITY_LABELS[after.priority]}`,
        `Разделов: ${after.sections.length}`,
      ],
      changedFields: ['created'],
    };
  }

  if (before && !after) {
    return {
      title: 'Удалена задача',
      details: [],
      changedFields: ['deleted'],
    };
  }

  if (!before || !after) {
    return {
      title: 'Изменения задачи',
      details: [],
      changedFields: [],
    };
  }

  const changed: string[] = [];
  const details: string[] = [];
  const changedFields: TaskChangeSummary['changedFields'] = [];

  if (normalizeText(before.title) !== normalizeText(after.title)) {
    changed.push('название');
    changedFields.push('title');
    details.push(`Название: «${truncate(before.title)}» → «${truncate(after.title)}»`);
  }

  if (normalizeText(before.description) !== normalizeText(after.description)) {
    changed.push('описание');
    changedFields.push('description');
    details.push('Изменено описание');
  }

  if (before.status !== after.status) {
    changed.push('статус');
    changedFields.push('status');
    details.push(`Статус: ${TASK_STATUS_LABELS[before.status]} → ${TASK_STATUS_LABELS[after.status]}`);
  }

  if (before.priority !== after.priority) {
    changed.push('приоритет');
    changedFields.push('priority');
    details.push(`Приоритет: ${TASK_PRIORITY_LABELS[before.priority]} → ${TASK_PRIORITY_LABELS[after.priority]}`);
  }

  if (!tagsEqual(before.tags, after.tags)) {
    changed.push('теги');
    changedFields.push('tags');

    const beforeTags = new Map(before.tags.map((tag) => [tag.name, tag]));
    const afterTags = new Map(after.tags.map((tag) => [tag.name, tag]));

    after.tags
      .filter((tag) => !beforeTags.has(tag.name))
      .forEach((tag) => details.push(`Добавлен тег: ${tag.name}`));

    before.tags
      .filter((tag) => !afterTags.has(tag.name))
      .forEach((tag) => details.push(`Удалён тег: ${tag.name}`));
  }

  if (!sectionsEqual(before.sections, after.sections)) {
    changed.push('разделы');
    changedFields.push('sections');

    const beforeSections = new Map(before.sections.map((section) => [section.id, section]));
    const afterSections = new Map(after.sections.map((section) => [section.id, section]));

    after.sections
      .filter((section) => !beforeSections.has(section.id))
      .forEach((section) => details.push(`Добавлен раздел: ${section.title}`));

    before.sections
      .filter((section) => !afterSections.has(section.id))
      .forEach((section) => details.push(`Удалён раздел: ${section.title}`));

    before.sections.forEach((section) => {
      const nextSection = afterSections.get(section.id);
      if (!nextSection) {
        return;
      }

      if (
        normalizeText(section.title) !== normalizeText(nextSection.title) ||
        normalizeText(section.content) !== normalizeText(nextSection.content)
      ) {
        details.push(`Изменён раздел: ${nextSection.title || section.title}`);
      }
    });
  }

  if (changed.length === 0) {
    return {
      title: 'Изменений нет',
      details: [],
      changedFields: [],
    };
  }

  return {
    title: `Изменены: ${changed.join(', ')}`,
    details,
    changedFields,
  };
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
