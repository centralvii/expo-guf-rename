/**
 * Основная модель данных файла в таблице переименования
 */
export type FileRow = {
  /** Уникальный идентификатор строки */
  id: string;
  /** Текущий порядковый номер (1-based) */
  order: number;
  /** Полный оригинальный путь файла в ZIP */
  originalPath: string;
  /** Оригинальное имя файла (без пути) */
  originalName: string;
  /** Расширение файла (без точки, например "guf") */
  extension: string;
  /** Содержимое файла как Blob */
  file: Blob;
  /** Дата, извлечённая из имени файла (YYYY-MM-DD) */
  detectedDate: string;
  /** Время, извлечённое из имени файла (HH-MM-SS) */
  detectedTime: string;
  /** Очищенное имя файла (без даты, времени, префиксов) */
  cleanName: string;
  /** Динамические переменные, назначенные файлу */
  variables: Record<string, string>;
  /** Рассчитанное новое имя файла (превью) */
  newName: string;
};

/**
 * Пользовательская переменная для шаблона
 */
export interface CustomVariable {
  /** Уникальный ключ (имя переменной в шаблоне без фигурных скобок) */
  key: string;
  /** Отображаемое название поля */
  label: string;
  /** Текущее значение */
  value: string;
}

/**
 * Ошибка валидации для одной строки
 */
export type ValidationError = {
  /** ID файла, к которому относится ошибка */
  fileId: string;
  /** Тип ошибки */
  type: 'empty' | 'duplicate' | 'forbidden_chars' | 'no_extension';
  /** Сообщение об ошибке для пользователя */
  message: string;
};

/**
 * Встроенные теги шаблона (не пользовательские)
 */
export const BUILTIN_TAGS = [
  '{index}',
  '{indexPad6}',
  '{originalName}',
  '{extension}',
  '{date}',
  '{time}',
  '{cleanName}',
] as const;

/**
 * Шаблон переименования по умолчанию
 */
export const DEFAULT_TEMPLATE = '{indexPad6}_{cleanName}';

/**
 * Переменные-заготовки по умолчанию
 */
export const DEFAULT_VARIABLES: CustomVariable[] = [
  { key: 'prefix', label: 'Префикс', value: '' },
  { key: 'module', label: 'Модуль', value: '' },
  { key: 'code', label: 'Код', value: '' },
  { key: 'docNumber', label: '№ документа', value: '' },
];

/**
 * Task Helper — Инструмент для ведения экземпляров задач
 */
export interface TaskSection {
  id: string;
  title: string;
  content: string;
}

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'open' | 'in_progress' | 'review' | 'done' | 'closed';

export interface TaskTag {
  id: string;
  name: string;
  color: string; // hex color
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags: TaskTag[];
  createdAt: number;
  updatedAt: number;
  sections: TaskSection[];
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'Критический',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  review: 'Ревью',
  done: 'Готово',
  closed: 'Закрыта',
};

export const TAG_COLOR_PRESETS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#6b7280', // gray
] as const;

/**
 * Настройки подключения к базе данных
 */
export type ConnectionMethod = 'supabase' | 'postgres';

export interface AppSettings {
  connectionMethod: ConnectionMethod;
  supabaseUrl: string;
  supabaseAnonKey: string;
  postgresUrl: string; // URL для локального API или прямого подключения (если используется прокси)
}
