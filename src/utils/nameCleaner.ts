/**
 * Модуль парсинга и очистки имени файла.
 *
 * Пример:
 *   Вход:  "2026-04-17_16-16-17-ДО. Связь атрибута и алгоритма для сервисного действия"
 *   Выход: "Связь атрибута и алгоритма для сервисного действия"
 */

/** Результат парсинга имени файла */
export interface ParsedName {
  detectedDate: string;
  detectedTime: string;
  cleanName: string;
}

/**
 * Парсит исходное имя файла (без расширения):
 * - Извлекает дату в формате YYYY-MM-DD
 * - Извлекает время в формате HH-MM-SS
 * - Удаляет служебные префиксы типа «ДО.», «ПОСЛЕ.»
 * - Убирает лишние разделители и пробелы
 */
export function parseFileName(rawName: string): ParsedName {
  let remaining = rawName;
  let detectedDate = '';
  let detectedTime = '';

  // 1. Извлечь дату YYYY-MM-DD (может быть разделена _ или пробелом)
  const dateRegex = /^(\d{4}-\d{2}-\d{2})[_\s-]?/;
  const dateMatch = remaining.match(dateRegex);
  if (dateMatch) {
    detectedDate = dateMatch[1];
    remaining = remaining.slice(dateMatch[0].length);
  }

  // 2. Извлечь время HH-MM-SS (может быть разделено _ или -)
  const timeRegex = /^(\d{2}-\d{2}-\d{2})[_\s-]?/;
  const timeMatch = remaining.match(timeRegex);
  if (timeMatch) {
    detectedTime = timeMatch[1];
    remaining = remaining.slice(timeMatch[0].length);
  }

  // 3. Удалить служебные префиксы: "ДО.", "ПОСЛЕ.", "ДО ", "ПОСЛЕ "
  const prefixRegex = /^(ДО|ПОСЛЕ|до|после)\.\s*/i;
  const prefixMatch = remaining.match(prefixRegex);
  if (prefixMatch) {
    remaining = remaining.slice(prefixMatch[0].length);
  }

  // 4. Убрать лишние разделители в начале строки (-, _, пробел)
  remaining = remaining.replace(/^[-_\s]+/, '');

  // 5. Убрать двойные пробелы
  remaining = remaining.replace(/\s{2,}/g, ' ');

  // 6. Обрезать пробелы по краям
  remaining = remaining.trim();

  return {
    detectedDate,
    detectedTime,
    cleanName: remaining,
  };
}

/**
 * Извлекает расширение из полного имени файла.
 * Возвращает расширение без точки (нижний регистр).
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Извлекает имя файла без расширения
 */
export function getNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return filename;
  }
  return filename.slice(0, lastDot);
}

/**
 * Извлекает имя файла из полного пути (убирает директории)
 */
export function getBaseName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}
