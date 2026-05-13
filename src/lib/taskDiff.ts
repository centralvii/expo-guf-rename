import type { TaskItem, TaskSection, TaskTag } from '../types';

export type DiffLineType = 'added' | 'removed' | 'unchanged';
export type TaskChangeKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffLine {
  type: DiffLineType;
  value: string;
}

export interface TaskFieldDiff {
  key: 'title' | 'description' | 'status' | 'priority' | 'tags';
  label: string;
  changed: boolean;
  lines: DiffLine[];
}

export interface TaskSectionDiff {
  sectionId: string;
  title: string;
  kind: Exclude<TaskChangeKind, 'unchanged'>;
  titleDiff: DiffLine[];
  contentDiff: DiffLine[];
}

export interface TaskDiffEntry {
  taskId: string;
  title: string;
  kind: Exclude<TaskChangeKind, 'unchanged'>;
  fieldDiffs: TaskFieldDiff[];
  sectionDiffs: TaskSectionDiff[];
}

export interface TaskCollectionDiff {
  hasChanges: boolean;
  tasks: TaskDiffEntry[];
}

function toLines(value: string): string[] {
  return value.split(/\r?\n/);
}

function normalizeMultiline(value: string | null | undefined): string {
  return String(value ?? '').replace(/\r\n/g, '\n');
}

function serializeTags(tags: TaskTag[]): string {
  return tags.map((tag) => `${tag.name} [${tag.color}]`).join('\n');
}

function createUniformLines(values: string[], type: DiffLineType): DiffLine[] {
  if (values.length === 0) {
    return [{ type, value: '' }];
  }

  return values.map((value) => ({ type, value }));
}

export function createLineDiff(previousText: string, nextText: string): DiffLine[] {
  const previous = toLines(normalizeMultiline(previousText));
  const next = toLines(normalizeMultiline(nextText));

  if (previousText === nextText) {
    return createUniformLines(previous, 'unchanged');
  }

  const dp = Array.from({ length: previous.length + 1 }, () =>
    Array<number>(next.length + 1).fill(0)
  );

  for (let i = previous.length - 1; i >= 0; i -= 1) {
    for (let j = next.length - 1; j >= 0; j -= 1) {
      if (previous[i] === next[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < previous.length && j < next.length) {
    if (previous[i] === next[j]) {
      lines.push({ type: 'unchanged', value: previous[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ type: 'removed', value: previous[i] });
      i += 1;
    } else {
      lines.push({ type: 'added', value: next[j] });
      j += 1;
    }
  }

  while (i < previous.length) {
    lines.push({ type: 'removed', value: previous[i] });
    i += 1;
  }

  while (j < next.length) {
    lines.push({ type: 'added', value: next[j] });
    j += 1;
  }

  return lines;
}

function hasChangedLines(lines: DiffLine[]): boolean {
  return lines.some((line) => line.type !== 'unchanged');
}

function createFieldDiff(
  key: TaskFieldDiff['key'],
  label: string,
  previousValue: string,
  nextValue: string
): TaskFieldDiff | null {
  const lines = createLineDiff(previousValue, nextValue);
  const changed = hasChangedLines(lines);

  if (!changed) {
    return null;
  }

  return { key, label, changed, lines };
}

function buildChangedSectionDiffs(previousSections: TaskSection[], nextSections: TaskSection[]): TaskSectionDiff[] {
  const previousMap = new Map(previousSections.map((section) => [section.id, section]));
  const nextMap = new Map(nextSections.map((section) => [section.id, section]));
  const orderedIds = [
    ...previousSections.map((section) => section.id),
    ...nextSections.map((section) => section.id).filter((id) => !previousMap.has(id)),
  ];

  const diffs: TaskSectionDiff[] = [];

  for (const sectionId of orderedIds) {
    const previous = previousMap.get(sectionId);
    const next = nextMap.get(sectionId);

    if (!previous && next) {
      diffs.push({
        sectionId,
        title: next.title || 'Новый раздел',
        kind: 'added',
        titleDiff: createUniformLines(toLines(normalizeMultiline(next.title)), 'added'),
        contentDiff: createUniformLines(toLines(normalizeMultiline(next.content)), 'added'),
      });
      continue;
    }

    if (previous && !next) {
      diffs.push({
        sectionId,
        title: previous.title || 'Удалённый раздел',
        kind: 'removed',
        titleDiff: createUniformLines(toLines(normalizeMultiline(previous.title)), 'removed'),
        contentDiff: createUniformLines(toLines(normalizeMultiline(previous.content)), 'removed'),
      });
      continue;
    }

    if (!previous || !next) {
      continue;
    }

    const titleDiff = createLineDiff(previous.title, next.title);
    const contentDiff = createLineDiff(previous.content, next.content);

    if (hasChangedLines(titleDiff) || hasChangedLines(contentDiff)) {
      diffs.push({
        sectionId,
        title: next.title || previous.title || 'Раздел без названия',
        kind: 'changed',
        titleDiff,
        contentDiff,
      });
    }
  }

  return diffs;
}

function buildTaskDiff(previousTask: TaskItem | null, nextTask: TaskItem | null): TaskDiffEntry | null {
  if (!previousTask && !nextTask) {
    return null;
  }

  if (!previousTask && nextTask) {
    return {
      taskId: nextTask.id,
      title: nextTask.title,
      kind: 'added',
      fieldDiffs: [
        {
          key: 'title',
          label: 'Название',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(nextTask.title)), 'added'),
        },
        {
          key: 'description',
          label: 'Описание',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(nextTask.description)), 'added'),
        },
        {
          key: 'status',
          label: 'Статус',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(nextTask.status)), 'added'),
        },
        {
          key: 'priority',
          label: 'Приоритет',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(nextTask.priority)), 'added'),
        },
        {
          key: 'tags',
          label: 'Теги',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(serializeTags(nextTask.tags))), 'added'),
        },
      ],
      sectionDiffs: nextTask.sections.map((section) => ({
        sectionId: section.id,
        title: section.title || 'Новый раздел',
        kind: 'added',
        titleDiff: createUniformLines(toLines(normalizeMultiline(section.title)), 'added'),
        contentDiff: createUniformLines(toLines(normalizeMultiline(section.content)), 'added'),
      })),
    };
  }

  if (previousTask && !nextTask) {
    return {
      taskId: previousTask.id,
      title: previousTask.title,
      kind: 'removed',
      fieldDiffs: [
        {
          key: 'title',
          label: 'Название',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(previousTask.title)), 'removed'),
        },
        {
          key: 'description',
          label: 'Описание',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(previousTask.description)), 'removed'),
        },
        {
          key: 'status',
          label: 'Статус',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(previousTask.status)), 'removed'),
        },
        {
          key: 'priority',
          label: 'Приоритет',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(previousTask.priority)), 'removed'),
        },
        {
          key: 'tags',
          label: 'Теги',
          changed: true,
          lines: createUniformLines(toLines(normalizeMultiline(serializeTags(previousTask.tags))), 'removed'),
        },
      ],
      sectionDiffs: previousTask.sections.map((section) => ({
        sectionId: section.id,
        title: section.title || 'Удалённый раздел',
        kind: 'removed',
        titleDiff: createUniformLines(toLines(normalizeMultiline(section.title)), 'removed'),
        contentDiff: createUniformLines(toLines(normalizeMultiline(section.content)), 'removed'),
      })),
    };
  }

  if (!previousTask || !nextTask) {
    return null;
  }

  const fieldDiffs = [
    createFieldDiff('title', 'Название', previousTask.title, nextTask.title),
    createFieldDiff('description', 'Описание', previousTask.description, nextTask.description),
    createFieldDiff('status', 'Статус', previousTask.status, nextTask.status),
    createFieldDiff('priority', 'Приоритет', previousTask.priority, nextTask.priority),
    createFieldDiff('tags', 'Теги', serializeTags(previousTask.tags), serializeTags(nextTask.tags)),
  ].filter((value): value is TaskFieldDiff => Boolean(value));

  const sectionDiffs = buildChangedSectionDiffs(previousTask.sections, nextTask.sections);

  if (fieldDiffs.length === 0 && sectionDiffs.length === 0) {
    return null;
  }

  return {
    taskId: nextTask.id,
    title: nextTask.title,
    kind: 'changed',
    fieldDiffs,
    sectionDiffs,
  };
}

export function diffTaskCollections(previousTasks: TaskItem[], nextTasks: TaskItem[]): TaskCollectionDiff {
  const previousMap = new Map(previousTasks.map((task) => [task.id, task]));
  const nextMap = new Map(nextTasks.map((task) => [task.id, task]));
  const orderedIds = [
    ...previousTasks.map((task) => task.id),
    ...nextTasks.map((task) => task.id).filter((id) => !previousMap.has(id)),
  ];

  const tasks = orderedIds
    .map((taskId) => buildTaskDiff(previousMap.get(taskId) ?? null, nextMap.get(taskId) ?? null))
    .filter((value): value is TaskDiffEntry => Boolean(value));

  return {
    hasChanges: tasks.length > 0,
    tasks,
  };
}
