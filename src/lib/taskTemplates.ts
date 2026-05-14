import type {
  TaskHistoryEntryMetadata,
  TaskItem,
  TaskPriority,
  TaskSection,
  TaskStatus,
  TaskTag,
  TaskTemplate,
} from '../types';

const EMPTY_TAGS: TaskTag[] = [];

const SYSTEM_TEMPLATES: TaskTemplate[] = [
  {
    id: 'empty',
    name: 'Пустая задача',
    description: 'Базовая пустая задача с одной секцией описания.',
    titleTemplate: '',
    descriptionTemplate: '',
    priority: 'medium',
    status: 'open',
    tags: EMPTY_TAGS,
    sections: [{ title: 'Описание', content: '' }],
    isSystem: true,
  },
  {
    id: 'bg-implementation',
    name: 'БГ / Реализация',
    description: 'Шаблон для согласований и реализации бизнес-гипотез.',
    titleTemplate: 'БГ / Реализация',
    descriptionTemplate: 'Поддержка нового сценария согласования БГ, sections и статуса.',
    priority: 'high',
    status: 'in_progress',
    tags: [
      { id: 'tag-bg', name: 'БГ', color: '#ef4444' },
      { id: 'tag-impl', name: 'Реализация', color: '#f97316' },
    ],
    sections: [
      { title: 'Контекст', content: '' },
      { title: 'Требования', content: '' },
      { title: 'План работ', content: '' },
      { title: 'Проверка', content: '' },
    ],
    isSystem: true,
  },
  {
    id: 'bg-hotfix',
    name: 'БГ / Датафикс',
    description: 'Быстрый шаблон для исправлений в проде.',
    titleTemplate: 'БГ / Датафикс',
    descriptionTemplate: 'Проверка данных, поиск причины и rollback-план для оперативного фикса.',
    priority: 'critical',
    status: 'in_progress',
    tags: [
      { id: 'tag-bg', name: 'БГ', color: '#ef4444' },
      { id: 'tag-hotfix', name: 'Датафикс', color: '#f59e0b' },
    ],
    sections: [
      { title: 'Симптом', content: '' },
      { title: 'Причина', content: '' },
      { title: 'Фикс', content: '' },
      { title: 'Rollback', content: '' },
    ],
    isSystem: true,
  },
  {
    id: 'bg-bug',
    name: 'БГ / Баг',
    description: 'Шаблон расследования и фикса дефекта.',
    titleTemplate: 'БГ / Баг',
    descriptionTemplate: 'Описание бага, воспроизведение и план исправления.',
    priority: 'high',
    status: 'open',
    tags: [
      { id: 'tag-bg', name: 'БГ', color: '#ef4444' },
      { id: 'tag-bug', name: 'Баг', color: '#a855f7' },
    ],
    sections: [
      { title: 'Шаги воспроизведения', content: '' },
      { title: 'Ожидаемый результат', content: '' },
      { title: 'Фактический результат', content: '' },
      { title: 'План исправления', content: '' },
    ],
    isSystem: true,
  },
  {
    id: 'api-integration',
    name: 'API-интеграция',
    description: 'Шаблон для внешних интеграций и contract-work.',
    titleTemplate: 'API-интеграция',
    descriptionTemplate: 'Переменные, URL, схема авторизации и сценарии обмена данными.',
    priority: 'medium',
    status: 'review',
    tags: [
      { id: 'tag-api', name: 'API', color: '#3b82f6' },
      { id: 'tag-integration', name: 'Интеграция', color: '#22c55e' },
    ],
    sections: [
      { title: 'Контракт', content: '' },
      { title: 'Авторизация', content: '' },
      { title: 'Payload / response', content: '' },
      { title: 'Тест-кейсы', content: '' },
    ],
    isSystem: true,
  },
  {
    id: 'release-note',
    name: 'Релизная заметка',
    description: 'Шаблон заметки по релизу и change log.',
    titleTemplate: 'Релизная заметка',
    descriptionTemplate: 'Сводка изменений, риски и действия после выката.',
    priority: 'medium',
    status: 'review',
    tags: [
      { id: 'tag-release', name: 'Релиз', color: '#f59e0b' },
    ],
    sections: [
      { title: 'Что вошло', content: '' },
      { title: 'Риски', content: '' },
      { title: 'Проверка после релиза', content: '' },
    ],
    isSystem: true,
  },
];

export interface BuildTaskFromTemplateOptions {
  id?: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  tags?: TaskTag[];
}

export function listTaskTemplates(): TaskTemplate[] {
  return SYSTEM_TEMPLATES.map((template) => ({
    ...template,
    tags: template.tags.map((tag) => ({ ...tag })),
    sections: template.sections.map((section) => ({ ...section })),
  }));
}

export function getTaskTemplateById(templateId: string): TaskTemplate | undefined {
  return listTaskTemplates().find((template) => template.id === templateId);
}

export function cloneTemplateSections(sections: TaskTemplate['sections']): TaskSection[] {
  return sections.map((section) => ({
    id: crypto.randomUUID(),
    title: section.title,
    content: section.content,
  }));
}

export function createTaskPayloadFromTemplate(
  template: TaskTemplate,
  options: BuildTaskFromTemplateOptions = {}
): Omit<TaskItem, 'createdAt' | 'updatedAt'> & { historyMetadata: TaskHistoryEntryMetadata } {
  return {
    id: options.id ?? crypto.randomUUID(),
    title: options.title ?? template.titleTemplate,
    description: options.description ?? template.descriptionTemplate,
    priority: options.priority ?? template.priority,
    status: options.status ?? template.status,
    tags: (options.tags ?? template.tags).map((tag) => ({ ...tag })),
    sections: cloneTemplateSections(template.sections),
    historyMetadata: {
      templateId: template.id,
      templateName: template.name,
    },
  };
}

export function getEmptyTaskTemplate(): TaskTemplate {
  return getTaskTemplateById('empty') ?? SYSTEM_TEMPLATES[0];
}
