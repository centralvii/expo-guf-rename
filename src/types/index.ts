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
  /** Пользовательское поле: префикс */
  prefix: string;
  /** Пользовательское поле: модуль */
  module: string;
  /** Пользовательское поле: код */
  code: string;
  /** Пользовательское поле: номер документа */
  docNumber: string;
  /** Пользовательское поле: custom1 */
  custom1: string;
  /** Пользовательское поле: custom2 */
  custom2: string;
  /** Рассчитанное новое имя файла (превью) */
  newName: string;
};

/**
 * Редактируемые пользователем поля FileRow
 */
export type EditableField =
  | 'prefix'
  | 'module'
  | 'code'
  | 'docNumber'
  | 'custom1'
  | 'custom2';

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
 * Доступные теги для шаблона переименования
 */
export const AVAILABLE_TAGS = [
  '{index}',
  '{indexPad6}',
  '{originalName}',
  '{extension}',
  '{date}',
  '{time}',
  '{cleanName}',
  '{prefix}',
  '{module}',
  '{code}',
  '{docNumber}',
  '{custom1}',
  '{custom2}',
] as const;

/**
 * Шаблон переименования по умолчанию
 */
export const DEFAULT_TEMPLATE =
  '{indexPad6}_{prefix}_{module}-{docNumber}_{cleanName}{code}';

/**
 * Список редактируемых полей для UI
 */
export const EDITABLE_FIELDS: { key: EditableField; label: string }[] = [
  { key: 'prefix', label: 'Префикс' },
  { key: 'module', label: 'Модуль' },
  { key: 'code', label: 'Код' },
  { key: 'docNumber', label: '№ документа' },
  { key: 'custom1', label: 'Custom 1' },
  { key: 'custom2', label: 'Custom 2' },
];

/**
 * Task Helper — Инструмент для ведения экземпляров задач
 */
export interface TaskSection {
  id: string;
  title: string;
  content: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  sections: TaskSection[];
}
