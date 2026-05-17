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
  /** Описание файла для README */
  description: string;
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

export interface TaskTemplateSection {
  title: string;
  content: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  titleTemplate: string;
  descriptionTemplate: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags: TaskTag[];
  sections: TaskTemplateSection[];
  isSystem?: boolean;
}

export type TaskHistoryEntryType = 'created' | 'updated' | 'restored';

export interface TaskHistoryEntryMetadata {
  templateId?: string;
  templateName?: string;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  createdAt: number;
  type: TaskHistoryEntryType;
  before: TaskItem | null;
  after: TaskItem | null;
  summary?: string;
  metadata?: TaskHistoryEntryMetadata;
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
export type ConnectionMethod = 'supabase' | 'postgres' | 'firebase';
export type AppTheme = 'default' | 'nothing' | '099';

export interface AppSettings {
  theme: AppTheme;
  connectionMethod: ConnectionMethod;
  supabaseUrl: string;
  supabaseAnonKey: string;
  postgresUrl: string;
  // Firebase config (frontend-safe)
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  firebaseMeasurementId: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  iconUrl?: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * API Client "Запросник" — Инструмент для тестирования API запросов
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export type ApiAuthType = 'none' | 'bearer' | 'basic' | 'api-key';

export type ApiBodyType = 'none' | 'json' | 'text' | 'form-urlencoded';

/** Универсальная пара ключ-значение для headers / params / form */
export interface ApiKeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

/** Конфигурация аутентификации */
export interface ApiAuthConfig {
  type: ApiAuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyIn?: 'header' | 'query';
}

export interface ApiEnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  secret?: boolean;
}

export interface ApiEnvironment {
  id: string;
  name: string;
  variables: ApiEnvironmentVariable[];
  isActive?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ApiCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

/** Описание одного запроса (вкладка / сохранённый коллекционный запрос) */
export interface ApiRequest {
  id: string;
  name: string;
  collectionId?: string;
  linkedTaskId?: string;
  environmentId?: string;
  method: HttpMethod;
  url: string;
  params: ApiKeyValue[];
  headers: ApiKeyValue[];
  auth: ApiAuthConfig;
  bodyType: ApiBodyType;
  bodyContent: string;
  createdAt: number;
  updatedAt: number;
}

/** Результат выполнения запроса */
export interface ApiResponse {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  /** Время выполнения запроса в ms */
  durationMs: number;
  /** Размер тела ответа в bytes */
  sizeBytes: number;
  /** Время получения ответа */
  timestamp: number;
}

/** Запись в истории запросов */
export interface ApiHistoryEntry {
  id: string;
  requestId?: string;
  linkedTaskId?: string;
  environmentId?: string;
  method: HttpMethod;
  url: string;
  resolvedUrl?: string;
  status: number;
  durationMs: number;
  timestamp: number;
  errorMessage?: string;
}

export const DEFAULT_API_REQUEST: Omit<ApiRequest, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Новый запрос',
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  auth: { type: 'none' },
  bodyType: 'none',
  bodyContent: '',
};
